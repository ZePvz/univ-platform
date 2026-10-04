import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Prisma 7 keeps the connection URL for the CLI (migrate, etc.) here,
// not in schema.prisma.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Runs automatically after `prisma migrate reset`; also runnable directly
    // via `npm run db:seed`.
    seed: 'node prisma/seed.js',
  },
  datasource: { url: env('DATABASE_URL') },
})
