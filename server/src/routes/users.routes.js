import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { parsePagination, paginatedResult } from '../utils/pagination.js'

const router = Router()
// Every route in this file is admin-only — user management never reaches a
// student or teacher.
router.use(requireAuth, requireRole('ADMIN'))

const ROLES = new Set(['STUDENT', 'TEACHER', 'ADMIN'])
const SAFE_SELECT = { id: true, name: true, email: true, role: true, createdAt: true }

router.get('/', async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const role = ROLES.has(req.query.role) ? req.query.role : undefined

  const where = {
    deletedAt: null,
    ...(role ? { role } : {}),
    ...(search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: SAFE_SELECT }),
    prisma.user.count({ where }),
  ])
  res.json(paginatedResult(users, total, { page, pageSize }))
})

router.get('/:id', async (req, res) => {
  const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null }, select: SAFE_SELECT })
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ user })
})

// Promotion is the only way a TEACHER or ADMIN account is ever created —
// registration (auth.routes.js) always issues STUDENT.
router.patch('/:id/role', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: 'You cannot change your own role' })
  }

  const { role } = req.body ?? {}
  if (!ROLES.has(role)) {
    return res.status(400).json({ message: 'role must be STUDENT, TEACHER or ADMIN' })
  }

  const target = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } })
  if (!target) return res.status(404).json({ message: 'User not found' })

  // A teacher who still owns sections can't be demoted out from under
  // them — every section would be left pointing at a non-teacher.
  if (target.role === 'TEACHER' && role !== 'TEACHER') {
    const sectionCount = await prisma.section.count({ where: { teacherId: target.id } })
    if (sectionCount > 0) {
      return res.status(409).json({ message: "Reassign or delete this teacher's sections before changing their role" })
    }
  }

  const user = await prisma.user.update({ where: { id: target.id }, data: { role }, select: SAFE_SELECT })
  res.json({ user })
})

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' })
  }
  await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } })
  res.status(204).end()
})

export default router
