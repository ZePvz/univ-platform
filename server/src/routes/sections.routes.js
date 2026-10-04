import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db/prisma.js'
import { Prisma } from '../generated/prisma/client.ts'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { parsePagination, paginatedResult } from '../utils/pagination.js'
import { generateJoinCode } from '../utils/joinCode.js'

const router = Router()
router.use(requireAuth)

const MAX_JOIN_CODE_ATTEMPTS = 5

// A join code is effectively a password for a class — this was flagged
// back when we designed the join-code system, but never actually wired up
// until this security pass caught the gap. Generous enough that a student
// mistyping a code a few times never notices, tight enough to make
// brute-forcing 8-character codes (already a ~32^8 keyspace) impractical
// even before accounting for that.
const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
})

// A join code collision is astronomically unlikely (32^8 possibilities) but
// the unique constraint is what actually guarantees no two sections ever
// share one — this loop just retries the rare clash instead of failing.
function isJoinCodeClash(err) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    err.meta?.target?.includes('join_code')
  )
}

// Teachers can start a class before the course exists in the catalogue
// (Phase 3 decision) — the first section for a code creates it.
async function findOrCreateCourse({ code, title, credits }) {
  const existing = await prisma.course.findUnique({ where: { code } })
  if (existing) return existing
  if (!title || !Number.isInteger(credits) || credits <= 0) {
    const err = new Error('This course code is new — courseTitle and a positive integer courseCredits are required')
    err.status = 400
    throw err
  }
  return prisma.course.create({ data: { code, title, credits } })
}

// Loads a section and checks the caller may act on it as its owner.
// allowStudent additionally lets an enrolled student read (never write) it.
async function loadSectionOrRespond(req, res, { allowStudent = false } = {}) {
  const section = await prisma.section.findUnique({
    where: { id: req.params.id },
    include: { course: true, teacher: { select: { id: true, name: true, email: true } } },
  })
  if (!section) {
    res.status(404).json({ message: 'Section not found' })
    return null
  }

  if (req.user.role === 'ADMIN') return section
  if (req.user.role === 'TEACHER' && section.teacherId === req.user.id) return section
  if (allowStudent && req.user.role === 'STUDENT') {
    const enrolled = await prisma.enrollment.findFirst({
      where: { sectionId: section.id, studentId: req.user.id, deletedAt: null },
    })
    if (enrolled) return section
  }

  res.status(403).json({ message: 'You do not have access to this section' })
  return null
}

// Create a class. Finds or creates the course, then the section with a
// freshly generated join code.
router.post('/', requireRole('TEACHER'), async (req, res) => {
  const { courseCode, courseTitle, courseCredits, term } = req.body ?? {}
  if (!courseCode || !term) {
    return res.status(400).json({ message: 'courseCode and term are required' })
  }

  let course
  try {
    course = await findOrCreateCourse({ code: courseCode, title: courseTitle, credits: courseCredits })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    throw err
  }

  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
    try {
      const section = await prisma.section.create({
        data: { courseId: course.id, teacherId: req.user.id, term, joinCode: generateJoinCode() },
        include: { course: true },
      })
      return res.status(201).json({ section })
    } catch (err) {
      if (!isJoinCodeClash(err)) throw err // e.g. duplicate course+term+teacher -> 409 via error handler
    }
  }
  res.status(500).json({ message: 'Could not generate a unique join code, please try again' })
})

// Join a class with its code. Restores a previously dropped enrollment
// instead of erroring, since the unique constraint is on (student, section).
router.post('/join', joinLimiter, requireRole('STUDENT'), async (req, res) => {
  const { code } = req.body ?? {}
  if (!code) return res.status(400).json({ message: 'code is required' })

  const section = await prisma.section.findUnique({ where: { joinCode: code.trim().toUpperCase() } })
  if (!section || !section.joinCodeActive) {
    return res.status(404).json({ message: 'Invalid or inactive join code' })
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_sectionId: { studentId: req.user.id, sectionId: section.id } },
  })
  if (existing && existing.deletedAt === null) {
    return res.status(409).json({ message: 'You are already in this class' })
  }

  const enrollment = existing
    ? await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', deletedAt: null, finalGrade: null, gradedById: null, gradedAt: null, enrolledAt: new Date() },
      })
    : await prisma.enrollment.create({ data: { studentId: req.user.id, sectionId: section.id } })

  res.status(201).json({ enrollment })
})

// Scoped list: a student's own classes, a teacher's own classes, or (admin)
// every class with search.
router.get('/', async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

  let where
  if (req.user.role === 'STUDENT') {
    where = { enrollments: { some: { studentId: req.user.id, deletedAt: null } } }
  } else if (req.user.role === 'TEACHER') {
    where = { teacherId: req.user.id }
  } else {
    where = search
      ? { course: { OR: [{ code: { contains: search, mode: 'insensitive' } }, { title: { contains: search, mode: 'insensitive' } }] } }
      : {}
  }

  const [sections, total] = await Promise.all([
    prisma.section.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        course: true,
        teacher: { select: { id: true, name: true } },
        // A bare `enrollments: true` counts every row, including soft-deleted
        // (dropped) ones — Postgres doesn't know deleted_at means "gone".
        // Filtering here keeps this number equal to the roster's length,
        // and the response shape unchanged so no frontend edit is needed.
        _count: { select: { enrollments: { where: { deletedAt: null } } } },
      },
    }),
    prisma.section.count({ where }),
  ])

  res.json(paginatedResult(sections, total, { page, pageSize }))
})

router.get('/:id', async (req, res) => {
  const section = await loadSectionOrRespond(req, res, { allowStudent: true })
  if (!section) return
  res.json({ section })
})

// Class roster: owner teacher or admin only — a student never sees classmates.
router.get('/:id/enrollments', async (req, res) => {
  const section = await loadSectionOrRespond(req, res)
  if (!section) return

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId: section.id, deletedAt: null },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { student: { name: 'asc' } },
  })
  res.json({ enrollments })
})

router.patch('/:id', async (req, res) => {
  const section = await loadSectionOrRespond(req, res)
  if (!section) return

  const { term } = req.body ?? {}
  if (!term) return res.status(400).json({ message: 'term is required' })

  const updated = await prisma.section.update({ where: { id: section.id }, data: { term } })
  res.json({ section: updated })
})

router.patch('/:id/join-code', async (req, res) => {
  const section = await loadSectionOrRespond(req, res)
  if (!section) return

  const { active } = req.body ?? {}
  if (typeof active !== 'boolean') return res.status(400).json({ message: 'active must be a boolean' })

  const updated = await prisma.section.update({ where: { id: section.id }, data: { joinCodeActive: active } })
  res.json({ section: updated })
})

router.post('/:id/join-code/regenerate', async (req, res) => {
  const section = await loadSectionOrRespond(req, res)
  if (!section) return

  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
    try {
      const updated = await prisma.section.update({
        where: { id: section.id },
        data: { joinCode: generateJoinCode(), joinCodeActive: true },
      })
      return res.json({ section: updated })
    } catch (err) {
      if (!isJoinCodeClash(err)) throw err
    }
  }
  res.status(500).json({ message: 'Could not generate a unique join code, please try again' })
})

// Blocked automatically if it has enrollments: Enrollment.sectionId has
// onDelete: Restrict, so the error handler turns that into a 409.
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.section.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

export default router
