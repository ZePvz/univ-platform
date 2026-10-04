import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db/prisma.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { signToken } from '../utils/jwt.js'
import { verifyGoogleToken } from '../utils/googleAuth.js'
import { requireAuth } from '../middleware/auth.js'
import { config } from '../config.js'

const router = Router()

// Cookie settings shared by login and register, since both start a session.
const cookieOptions = {
  httpOnly: true, // JavaScript in the browser can't read this cookie — mitigates XSS token theft
  secure: config.nodeEnv === 'production', // HTTPS only in production; localhost has no TLS
  sameSite: 'lax', // blocks the cookie from being sent on cross-site POSTs (CSRF), still sent on normal navigation
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, in milliseconds — independent of the JWT's own expiry claim
}

// Slows down credential-guessing bots without affecting normal use.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
})

router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body ?? {}
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ message: 'Email is already registered' })
  }

  const passwordHash = await hashPassword(password)

  // Public registration always creates a STUDENT. Nobody can sign up as
  // TEACHER or ADMIN — only an existing admin can promote a user (Phase 4).
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'STUDENT' },
    select: { id: true, name: true, email: true, role: true },
  })

  const token = signToken(user)
  res.cookie(config.cookieName, token, cookieOptions)
  res.status(201).json({ user })
})

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' })
  }

  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } })

  // Same generic message in every failure case — no such email, wrong
  // password, or a Google-only account with no password at all. Telling
  // these apart would let an attacker enumerate valid emails (and, for the
  // Google case, learn which sign-in method an account uses); the account
  // was never linked between methods (see /google below), so this is
  // simply "these credentials don't log in," full stop.
  if (!user || !user.passwordHash || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  const token = signToken(user)
  res.cookie(config.cookieName, token, cookieOptions)
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

// The frontend's "Sign in with Google" button hands us Google's signed ID
// token, not a password — we verify it, then treat it exactly like a
// successful login: issue our own JWT cookie. Google only proves identity;
// our cookie is still the actual session, same as password login.
router.post('/google', authLimiter, async (req, res) => {
  const { credential } = req.body ?? {}
  if (!credential) {
    return res.status(400).json({ message: 'credential is required' })
  }

  let payload
  try {
    payload = await verifyGoogleToken(credential)
  } catch {
    return res.status(401).json({ message: 'Invalid Google credential' })
  }
  if (!payload.emailVerified) {
    return res.status(401).json({ message: 'Google email is not verified' })
  }

  let user = await prisma.user.findFirst({ where: { googleId: payload.googleId, deletedAt: null } })

  if (!user) {
    // First time we've seen this Google account. If the email is already a
    // password account, we deliberately do NOT link them (Phase 5 decision:
    // Google and password stay separate) — reject with a clear message
    // instead of silently merging into someone else's account.
    const existingByEmail = await prisma.user.findFirst({ where: { email: payload.email, deletedAt: null } })
    if (existingByEmail) {
      return res.status(409).json({
        message: 'This email already has a password account. Please log in with your password instead.',
      })
    }

    // New account. Same rule as password registration: always STUDENT.
    user = await prisma.user.create({
      data: { name: payload.name, email: payload.email, googleId: payload.googleId, role: 'STUDENT' },
    })
  }

  const token = signToken(user)
  res.cookie(config.cookieName, token, cookieOptions)
  res.status(200).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, cookieOptions)
  res.status(204).end()
})

// Lets the frontend ask "who am I?" on page load/refresh, since the JWT
// lives in an httpOnly cookie the browser's JS can't read directly.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
