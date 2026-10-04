import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/lib/roles'

// Gate for every private route. `roles` is optional: omit it to require
// "logged in, any role"; pass e.g. roles={['ADMIN']} to also require a role.
//
// This is a UX convenience only, not the actual security boundary — a
// student could edit this file out of the bundle and the route would
// render. The real enforcement is requireAuth/requireRole on the server;
// every API call still gets checked there regardless of what the UI shows.
export function ProtectedRoute({ roles }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (!user) {
    // Remember where they were headed, so login can send them back after.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }

  return <Outlet />
}
