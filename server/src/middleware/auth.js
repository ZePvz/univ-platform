import { verifyToken } from '../utils/jwt.js'
import { prisma } from '../db/prisma.js'
import { config } from '../config.js'

// Confirms the request carries a valid session and attaches the current
// user to req.user. Every route that needs a logged-in user starts with
// this middleware.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[config.cookieName]
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' })
  }

  let payload
  try {
    payload = verifyToken(token)
  } catch {
    // Covers both "tampered/invalid signature" and "expired" — we don't
    // need to tell the client which, just that the session is no good.
    return res.status(401).json({ message: 'Invalid or expired session' })
  }

  // The JWT is stateless: even after a user is promoted, demoted or
  // soft-deleted, their old token keeps verifying until it expires. Looking
  // the user up on every request closes that gap, at the cost of one query
  // per request. deletedAt: null means a soft-deleted account can't be used
  // to authenticate even with a still-valid token.
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' })
  }

  req.user = user
  next()
}
