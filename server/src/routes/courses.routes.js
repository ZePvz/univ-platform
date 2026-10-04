import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { parsePagination, paginatedResult } from '../utils/pagination.js'

const router = Router()

// Every route below requires a logged-in user — nobody sees the catalogue
// as an anonymous visitor. Individual routes add requireRole on top.
router.use(requireAuth)

// Anyone logged in can browse the catalogue — a teacher needs it to pick a
// course when creating a section, a student needs it to see what exists.
router.get('/', async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

  const where = search
    ? {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {}

  const [courses, total] = await Promise.all([
    prisma.course.findMany({ where, skip, take, orderBy: { code: 'asc' } }),
    prisma.course.count({ where }),
  ])

  res.json(paginatedResult(courses, total, { page, pageSize }))
})

router.get('/:id', async (req, res) => {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: req.params.id } })
  res.json({ course })
})

// Only admins edit the catalogue directly. Teachers add to it indirectly,
// by creating a section with a new course code (see sections.routes.js).
router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const { title, description, credits } = req.body ?? {}
  const data = {}
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (credits !== undefined) {
    if (!Number.isInteger(credits) || credits <= 0) {
      return res.status(400).json({ message: 'credits must be a positive integer' })
    }
    data.credits = credits
  }

  const course = await prisma.course.update({ where: { id: req.params.id }, data })
  res.json({ course })
})

// Blocked automatically: Section.courseId has onDelete: Restrict, so Postgres
// refuses this and the error handler turns it into a clean 409, not a 500.
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

export default router
