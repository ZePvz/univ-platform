// Generates a large, realistic-looking dataset purely so Phase 7 has
// something worth optimizing — there's no point building a virtualized
// table and measuring it against 12 rows. Safe to re-run: everything it
// creates is namespaced (emails end in @demo.univ-platform.test, course
// codes start with DEMO-) and it deletes its own previous output first.
//
// Run with: npm run db:seed:demo --prefix server
import crypto from 'node:crypto'
import { faker } from '@faker-js/faker'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/utils/password.js'
import { generateJoinCode } from '../src/utils/joinCode.js'

const DEMO_EMAIL_DOMAIN = '@demo.univ-platform.test'
const DEMO_COURSE_PREFIX = 'DEMO-'
const DEMO_PASSWORD = 'demo12345' // shared by every fake account — see note below

const TEACHER_COUNT = 15
const STUDENT_COUNT = 650
const TERMS = ['2023-FALL', '2024-SPRING', '2024-FALL', '2025-SPRING', '2025-FALL']
const SUBJECTS = ['CS', 'MATH', 'ENG', 'HIST', 'BIO', 'CHEM', 'PHYS', 'ECON', 'PSY', 'ART', 'MUS', 'PHIL', 'POLI', 'SOC', 'STAT']

function chunk(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size))
  return chunks
}

async function createManyInBatches(model, rows, batchSize = 1000) {
  for (const batch of chunk(rows, batchSize)) {
    await model.createMany({ data: batch })
  }
}

async function wipeExistingDemoData() {
  console.log('Removing any previous demo data…')
  await prisma.enrollment.deleteMany({ where: { section: { course: { code: { startsWith: DEMO_COURSE_PREFIX } } } } })
  await prisma.section.deleteMany({ where: { course: { code: { startsWith: DEMO_COURSE_PREFIX } } } })
  await prisma.course.deleteMany({ where: { code: { startsWith: DEMO_COURSE_PREFIX } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } })
}

async function main() {
  await wipeExistingDemoData()

  // One hash reused by every fake account. Real users each get their own
  // bcrypt hash (see auth.routes.js) — this shortcut only exists because
  // hashing thousands of demo passwords individually would turn a seed
  // script into a minutes-long wait for no real benefit.
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  console.log(`Creating ${TEACHER_COUNT} teachers and ${STUDENT_COUNT} students…`)
  const teachers = Array.from({ length: TEACHER_COUNT }, (_, i) => ({
    id: crypto.randomUUID(),
    name: faker.person.fullName(),
    email: `teacher${i + 1}${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    role: 'TEACHER',
  }))
  const students = Array.from({ length: STUDENT_COUNT }, (_, i) => ({
    id: crypto.randomUUID(),
    name: faker.person.fullName(),
    email: `student${i + 1}${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    role: 'STUDENT',
  }))
  await createManyInBatches(prisma.user, [...teachers, ...students])

  console.log(`Creating ${SUBJECTS.length * 3} courses…`)
  const courses = []
  for (const subject of SUBJECTS) {
    for (let level = 1; level <= 3; level++) {
      courses.push({
        id: crypto.randomUUID(),
        code: `${DEMO_COURSE_PREFIX}${subject}${level}01`,
        title: `${subject} ${faker.company.buzzNoun()} ${faker.company.buzzAdjective()}`.slice(0, 60),
        description: faker.lorem.sentence(),
        credits: faker.number.int({ min: 1, max: 4 }),
      })
    }
  }
  await createManyInBatches(prisma.course, courses)

  console.log('Creating sections (course + term + teacher combinations)…')
  const usedCombos = new Set()
  const sections = []
  for (const course of courses) {
    const termsForThisCourse = faker.helpers.arrayElements(TERMS, faker.number.int({ min: 2, max: 4 }))
    for (const term of termsForThisCourse) {
      const teacher = faker.helpers.arrayElement(teachers)
      const comboKey = `${course.id}|${term}|${teacher.id}`
      if (usedCombos.has(comboKey)) continue
      usedCombos.add(comboKey)
      sections.push({
        id: crypto.randomUUID(),
        courseId: course.id,
        teacherId: teacher.id,
        term,
        joinCode: generateJoinCode(),
        joinCodeActive: true,
      })
    }
  }
  await createManyInBatches(prisma.section, sections)

  console.log('Enrolling students (this is the big one — thousands of rows)…')
  const enrollments = []
  for (const student of students) {
    const sectionCount = faker.number.int({ min: 6, max: 9 })
    const chosenSections = faker.helpers.arrayElements(sections, sectionCount)

    for (const section of chosenSections) {
      const roll = Math.random()
      // Weighted so most enrollments are visible (ACTIVE/COMPLETED) —
      // dropped rows are soft-deleted, same as the real drop endpoint, so
      // too many of them would undercut the "3,500+ visible rows" goal.
      const status = roll < 0.6 ? 'ACTIVE' : roll < 0.9 ? 'COMPLETED' : 'DROPPED'
      const isGraded = status === 'COMPLETED' || (status === 'ACTIVE' && Math.random() < 0.25)
      const finalGrade = isGraded ? faker.number.float({ min: 45, max: 100, fractionDigits: 1 }) : null
      const enrolledAt = faker.date.past({ years: 2 })

      enrollments.push({
        id: crypto.randomUUID(),
        studentId: student.id,
        sectionId: section.id,
        status,
        finalGrade,
        gradedById: isGraded ? section.teacherId : null,
        gradedAt: isGraded ? faker.date.between({ from: enrolledAt, to: new Date() }) : null,
        enrolledAt,
        deletedAt: status === 'DROPPED' ? faker.date.between({ from: enrolledAt, to: new Date() }) : null,
      })
    }
  }
  await createManyInBatches(prisma.enrollment, enrollments, 500)

  const visibleCount = enrollments.filter((e) => e.deletedAt === null).length
  console.log('\nDone.')
  console.log(`  Teachers:    ${teachers.length}`)
  console.log(`  Students:    ${students.length}`)
  console.log(`  Courses:     ${courses.length}`)
  console.log(`  Sections:    ${sections.length}`)
  console.log(`  Enrollments: ${enrollments.length} total, ${visibleCount} visible (not dropped)`)
  console.log(`\nEvery demo account's password is: ${DEMO_PASSWORD}`)
  console.log(`Example logins: teacher1${DEMO_EMAIL_DOMAIN}, student1${DEMO_EMAIL_DOMAIN}`)
}

main()
  .catch((err) => {
    console.error('Demo seed failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
