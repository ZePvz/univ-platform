import { Prisma } from '../generated/prisma/client.ts'

// Express 5 auto-forwards a rejected promise from any route/middleware to
// this handler (Express 4 needed a manual try/catch + next(err) in every
// route). It must take exactly 4 arguments — that's how Express recognizes
// an error handler, regardless of argument names.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // https://www.prisma.io/docs/orm/reference/error-reference
    switch (err.code) {
      case 'P2002': // unique constraint (e.g. email, course code, join code)
        return res.status(409).json({ message: `${err.meta?.target ?? 'Value'} already in use` })
      case 'P2025': // record the query expected to find doesn't exist
        return res.status(404).json({ message: 'Not found' })
      case 'P2003': // foreign key violation — usually our onDelete: Restrict guards
        return res.status(409).json({ message: 'This action is blocked by related records' })
      default:
        break
    }
  }

  // Postgres CHECK constraint violation (e.g. credits > 0, grade out of range)
  // slips through as a raw error with a Postgres SQLSTATE code.
  if (err.code === '23514') {
    return res.status(400).json({ message: 'That value violates a database constraint' })
  }

  console.error(err)
  res.status(500).json({ message: 'Something went wrong' })
}
