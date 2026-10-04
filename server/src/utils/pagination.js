const DEFAULT_PAGE_SIZE = 25
// Every list in the app uses a small page size (10-25) except the admin's
// virtualized records table (Phase 7), which deliberately fetches thousands
// of rows in one request — the browser cost of a big JSON payload is cheap;
// what's expensive is rendering thousands of DOM nodes, and that's solved
// client-side by virtualization, not by hiding rows behind more pages.
// Every list is still scoped by role, so this cap doesn't let a student or
// teacher pull more than their own data.
const MAX_PAGE_SIZE = 5000

// Turns ?page=2&pageSize=50 into Prisma's skip/take, clamped so a client
// can't ask for page 0 or a 10,000-row page and hurt the database.
export function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE),
  )
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export function paginatedResult(rows, total, { page, pageSize }) {
  return { data: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
}
