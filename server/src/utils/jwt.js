import jwt from 'jsonwebtoken'
import { config } from '../config.js'

// The payload is kept minimal on purpose: just enough to identify the user
// and their role. Name/email can change, so we don't bake them into the
// token — requireAuth re-fetches the current user from the database anyway.
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })
}

// Throws if the signature doesn't match or the token has expired.
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret)
}
