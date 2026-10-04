// One place all backend calls go through. `credentials: 'include'` is what
// makes the browser attach the httpOnly JWT cookie on every request — the
// same-origin dev proxy (vite.config.js) means we never need to think about
// CORS or a base URL here, just relative paths.
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  // 204 No Content has no body to parse (logout, delete, drop).
  const data = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    // Every error response from the backend is { message: string } —
    // see errorHandler.js — so this is the one place that shape gets
    // turned into a thrown JS Error the UI can catch.
    throw new Error(data?.message || `Request failed with status ${res.status}`)
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
