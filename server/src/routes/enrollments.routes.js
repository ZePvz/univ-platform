import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { parsePagination, paginatedResult } from '../utils/pagination.js'

const router = Router()
router.use(requireAuth)

// Allowlist, not the raw query string — never pass user input straight into
// Prisma's orderBy key.
const SORTABLE_FIELDS = new Set(['enrolledAt', 'finalGrade', 'status'])

// This is the endpoint behind Phase 7's big data table. It's scoped by role
// (a student only ever sees their own rows) and supports the paging,
// sorting and search a 3,500+ row table needs.
router.get('/', async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const sortBy = SORTABLE_FIELDS.has(req.query.sortBy) ? req.query.sortBy : 'enrolledAt'
  const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc'
  // Postgres puts NULLs last in ASC order but FIRST in DESC by default —
  // sorting grade descending would otherwise surface every ungraded row
  // before any actual grade, which is the opposite of what "sort by
  // highest grade" means to a user.
  const orderBy = sortBy === 'finalGrade' ? { finalGrade: { sort: sortDir, nulls: 'last' } } : { [sortBy]: sortDir }

  const where = { deletedAt: null }
  if (req.user.role === 'STUDENT') {
    where.studentId = req.user.id
  } else if (req.user.role === 'TEACHER') {
    where.section = { teacherId: req.user.id }
  } // ADMIN sees everything

  if (search) {
    where.OR = [
      { student: { name: { contains: search, mode: 'insensitive' } } },
      { student: { email: { contains: search, mode: 'insensitive' } } },
      { section: { course: { code: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        student: { select: { id: true, name: true, email: true } },
        section: { include: { course: true, teacher: { select: { id: true, name: true } } } },
      },
    }),
    prisma.enrollment.count({ where }),
  ])

  res.json(paginatedResult(enrollments, total, { page, pageSize }))
})

// allowStudent lets a student load (and later drop) only their own row —
// they can never grade or touch anyone else's.
async function loadEnrollmentOrRespond(req, res, { allowStudent = false } = {}) {
  // A dropped enrollment is soft-deleted: as far as this API is concerned it
  // no longer exists, so it can't be graded or "dropped" a second time (which
  // would also overwrite its original deletedAt). findFirst, not findUnique,
  // because findUnique only accepts unique columns and deletedAt isn't one.
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { section: true },
  })
  if (!enrollment) {
    res.status(404).json({ message: 'Enrollment not found' })
    return null
  }

  if (req.user.role === 'ADMIN') return enrollment
  if (req.user.role === 'TEACHER' && enrollment.section.teacherId === req.user.id) return enrollment
  if (allowStudent && req.user.role === 'STUDENT' && enrollment.studentId === req.user.id) return enrollment

  res.status(403).json({ message: 'You do not have access to this enrollment' })
  return null
}

router.patch('/:id/grade', async (req, res) => {
  const enrollment = await loadEnrollmentOrRespond(req, res) // owner teacher or admin only
  if (!enrollment) return

  const grade = Number(req.body?.finalGrade)
  if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
    return res.status(400).json({ message: 'finalGrade must be a number between 0 and 100' })
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { finalGrade: grade, gradedById: req.user.id, gradedAt: new Date() },
  })
  res.json({ enrollment: updated })
})

// Soft delete: a student calling this drops their own class; a teacher or
// admin calling it removes a student from the roster. Either way the row
// (and its grade history) stays in the database, just marked dropped.
router.delete('/:id', async (req, res) => {
  const enrollment = await loadEnrollmentOrRespond(req, res, { allowStudent: true })
  if (!enrollment) return

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: 'DROPPED', deletedAt: new Date() },
  })
  res.status(204).end()
})

export default router
