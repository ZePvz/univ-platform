import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { prisma } from './db/prisma.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.routes.js'
import coursesRoutes from './routes/courses.routes.js'
import sectionsRoutes from './routes/sections.routes.js'
import enrollmentsRoutes from './routes/enrollments.routes.js'
import usersRoutes from './routes/users.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'

// The app is built here and started in index.js, so tests can import
// `app` later without opening a network port.
const app = express()

// Behind Nginx, every request reaches Express from 127.0.0.1; the real
// visitor's address only exists in the X-Forwarded-For header Nginx adds.
// Without this, the rate limiters would treat the entire website as ONE
// visitor and share a single 20-attempts-per-15-minutes budget between everyone.
// A number (not `true`) means "believe only the last N proxies", so a visitor
// can't spoof their own IP by sending a fake X-Forwarded-For header themselves.
app.set('trust proxy', config.trustProxy)

app.use(helmet())
app.use(cors({ origin: config.clientOrigin, credentials: true }))
app.use(express.json())
app.use(cookieParser()) // populates req.cookies, so requireAuth can read the JWT cookie

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Confirms the app can actually reach Postgres (health above only proves Express is up).
app.get('/api/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'database unreachable' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/courses', coursesRoutes)
app.use('/api/sections', sectionsRoutes)
app.use('/api/enrollments', enrollmentsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// Must be registered last, and must take exactly 4 arguments — that's how
// Express tells an error handler apart from regular middleware. Express 5
// auto-forwards any rejected promise from an async route handler here.
app.use(errorHandler)

export default app
