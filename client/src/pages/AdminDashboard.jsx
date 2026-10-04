import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UsersTable } from '@/components/admin/UsersTable'
import { CoursesTable } from '@/components/admin/CoursesTable'
import { SectionsTable } from '@/components/admin/SectionsTable'
import { RecordsTable } from '@/components/admin/RecordsTable'
import { CrashTestButton } from '@/components/admin/CrashTestButton'

export function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/dashboard/stats').then(setStats)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">Manage users, the course catalogue, and every class.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:max-w-2xl">
        <Card>
          <CardHeader>
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl">{stats?.users ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Courses</CardDescription>
            <CardTitle className="text-3xl">{stats?.courses ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sections</CardDescription>
            <CardTitle className="text-3xl">{stats?.sections ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Enrollments</CardDescription>
            <CardTitle className="text-3xl">{stats?.enrollments ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="pt-4">
              <UsersTable />
            </TabsContent>
            <TabsContent value="courses" className="pt-4">
              <CoursesTable />
            </TabsContent>
            <TabsContent value="sections" className="pt-4">
              <SectionsTable />
            </TabsContent>
            <TabsContent value="records" className="flex flex-col gap-3 pt-4">
              {/* Nested boundary: CrashTestButton and RecordsTable are both
                  INSIDE it, so if either throws, only this tab's content is
                  replaced by the fallback. Users/Courses/Sections and the
                  stats cards above are siblings of this boundary, not
                  descendants of it — they keep working untouched. Getting
                  this containment right means putting the boundary around
                  the region that should fail together, not just near the
                  component you suspect is risky. */}
              <ErrorBoundary>
                <CrashTestButton />
                <RecordsTable />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
