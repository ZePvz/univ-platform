import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ROLE_LABEL = { STUDENT: 'Student', TEACHER: 'Teacher', ADMIN: 'Admin' }

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// The shared frame every logged-in page renders inside: a slim top bar plus
// whatever the current route (<Outlet/>) draws below it. Kept deliberately
// plain — one accent color, no shadows, no gradients.
export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-sm font-medium">UNIV-Platform</span>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 text-sm outline-none hover:bg-muted">
              <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
              <span>{user.name}</span>
              <Avatar className="size-7">
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* key={pathname} is the standard React trick for resetting a
            boundary: changing an element's key makes React discard and
            remount it, which clears the class component's error state.
            Without this, crashing once on /admin and then clicking to
            /student would still show the old fallback — a real boundary
            bug if you don't know this trick. The nav bar above is OUTSIDE
            the boundary, so Logout always keeps working even if whatever
            page you're on crashes. */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
