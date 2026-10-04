import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/lib/roles'

// The inverse of ProtectedRoute: keeps a logged-in user off /login and
// /register by bouncing them straight to their dashboard.
export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
  }
  if (user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }
  return <Outlet />
}
