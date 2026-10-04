// Creates (or updates) the one admin account that bootstraps the system.
// Public registration can never produce an ADMIN — this script is the only
// way the first one gets created. Run with: npm run db:seed --prefix server
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/utils/password.js'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME || 'Admin'

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before seeding.')
  process.exit(1)
}
if (password.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.')
  process.exit(1)
}

const passwordHash = await hashPassword(password)

// upsert: create it the first time, and on every later run just make sure
// the role is ADMIN and the account isn't soft-deleted — safe to re-run.
const admin = await prisma.user.upsert({
  where: { email },
  update: { role: 'ADMIN', passwordHash, deletedAt: null },
  create: { name, email, passwordHash, role: 'ADMIN' },
})

console.log(`Admin ready: ${admin.email} (${admin.id})`)
await prisma.$disconnect()
