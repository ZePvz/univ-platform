import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

// Unlike usePaginatedResource, this fetches the WHOLE matching result set in
// one request (server/src/utils/pagination.js allows up to 5000 rows) —
// Phase 7's records table virtualizes rendering client-side rather than
// paging through the data, so there's no "page" here, just search/sort.
export function useAllEnrollments({ search, sortBy, sortDir }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsLoading(true)
    setError('')
    const query = new URLSearchParams({ page: '1', pageSize: '5000', sortBy, sortDir })
    if (search) query.set('search', search)

    let cancelled = false
    api
      .get(`/enrollments?${query}`)
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setTotal(res.pagination.total)
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false))

    return () => {
      cancelled = true
    }
  }, [search, sortBy, sortDir])

  return { data, total, isLoading, error }
}
