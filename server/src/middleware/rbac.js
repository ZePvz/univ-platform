// Restricts a route to specific roles. Always place requireAuth before this
// — requireRole only reads req.user, it doesn't verify anyone's identity.
// Usage: router.post('/sections', requireAuth, requireRole('TEACHER'), handler)
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that' })
    }
    next()
  }
}
