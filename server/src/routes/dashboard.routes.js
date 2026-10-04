import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// One endpoint, three different shapes of response — the shape is decided
// by req.user.role, not by a query param, so nobody can request another
// role's numbers.
router.get('/stats', async (req, res) => {
  if (req.user.role === 'STUDENT') {
    const [activeClasses, completedClasses] = await Promise.all([
      prisma.enrollment.count({ where: { studentId: req.user.id, deletedAt: null, status: 'ACTIVE' } }),
      prisma.enrollment.count({ where: { studentId: req.user.id, deletedAt: null, status: 'COMPLETED' } }),
    ])
    return res.json({ role: 'STUDENT', activeClasses, completedClasses })
  }

  if (req.user.role === 'TEACHER') {
    const [sections, students] = await Promise.all([
      prisma.section.count({ where: { teacherId: req.user.id } }),
      prisma.enrollment.count({ where: { section: { teacherId: req.user.id }, deletedAt: null } }),
    ])
    return res.json({ role: 'TEACHER', sections, students })
  }

  const [users, courses, sections, enrollments] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.course.count(),
    prisma.section.count(),
    prisma.enrollment.count({ where: { deletedAt: null } }),
  ])
  res.json({ role: 'ADMIN', users, courses, sections, enrollments })
})

export default router
