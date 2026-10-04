import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/lib/roles'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/PublicOnlyRoute'
import { AppShell } from '@/components/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { StudentDashboard } from '@/pages/StudentDashboard'
import { TeacherDashboard } from '@/pages/TeacherDashboard'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { NotFoundPage } from '@/pages/NotFoundPage'

// "/" has no page of its own — it just forwards a logged-in user to their
// role's dashboard. It renders inside <ProtectedRoute/>, so `user` here is
// never null.
function RoleHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={ROLE_HOME[user.role]} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<RoleHomeRedirect />} />

          <Route element={<ProtectedRoute roles={['STUDENT']} />}>
            <Route path="/student" element={<StudentDashboard />} />
          </Route>

          <Route element={<ProtectedRoute roles={['TEACHER']} />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
