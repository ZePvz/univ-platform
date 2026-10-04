import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

// Fetches a paginated list endpoint — any GET /api/... that returns
// { data, pagination } (see server/src/utils/pagination.js) — and manages
// the page/loading/error state around it. Every list in this phase
// (a student's classes, a teacher's sections, an admin's users/courses/
// sections) is built on this one hook instead of five copies of the same
// fetch-on-page-change effect.
export function usePaginatedResource(path, { pageSize = 10, params = {} } = {}) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  // Filters (search text, a role dropdown, ...) are passed as a plain
  // object; stringifying it gives a stable dependency so the effect only
  // re-runs when a filter's actual value changes, not on every render.
  const paramsKey = JSON.stringify(params)

  // Changing a filter invalidates whatever page you were on — page 5 of a
  // search that now has 2 results would just render empty.
  useEffect(() => {
    setPage(1)
  }, [paramsKey])

  useEffect(() => {
    setIsLoading(true)
    setError('')

    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') query.set(key, value)
    }

    let cancelled = false
    api
      .get(`${path}?${query}`)
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setPagination(res.pagination)
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, page, pageSize, paramsKey, reloadToken])

  // Call after any mutation (create/delete/update a row) to re-fetch the
  // current page without resetting to page 1 the way a filter change does.
  const refetch = () => setReloadToken((t) => t + 1)

  return { data, pagination, isLoading, error, page, setPage, refetch }
}
