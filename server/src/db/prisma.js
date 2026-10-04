import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'
import { config } from '../config.js'

// One shared client for the whole app. Prisma 7 talks to Postgres through a
// driver adapter, which also manages the connection pool for us.
const adapter = new PrismaPg({ connectionString: config.databaseUrl })

export const prisma = new PrismaClient({ adapter })
