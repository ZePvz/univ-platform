import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/ConfirmContext'
import { api } from '@/lib/api'
import { usePaginatedResource } from '@/hooks/usePaginatedResource'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PaginationBar } from '@/components/PaginationBar'
import { CreateSectionDialog } from '@/components/teacher/CreateSectionDialog'
import { JoinCodeCell } from '@/components/teacher/JoinCodeCell'
import { RosterDialog } from '@/components/teacher/RosterDialog'

export function TeacherDashboard() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [stats, setStats] = useState(null)
  const [rosterSectionId, setRosterSectionId] = useState(null)
  const { data: sections, pagination, isLoading, page, setPage, refetch } = usePaginatedResource('/sections', {
    pageSize: 10,
  })

  useEffect(() => {
    api.get('/dashboard/stats').then(setStats)
  }, [])

  function refreshEverything() {
    refetch()
    api.get('/dashboard/stats').then(setStats)
  }

  async function handleToggleActive(sectionId, active) {
    try {
      await api.patch(`/sections/${sectionId}/join-code`, { active })
      toast.success(active ? 'Join code re-enabled' : 'Join code disabled')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleRegenerate(section) {
    const ok = await confirm({
      title: `Generate a new join code for ${section.course.code}?`,
      description: 'The old code stops working immediately.',
    })
    if (!ok) return

    try {
      await api.post(`/sections/${section.id}/join-code/regenerate`, {})
      toast.success('New join code generated')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">Your classes and their rosters.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Card>
          <CardHeader>
            <CardDescription>Sections taught</CardDescription>
            <CardTitle className="text-3xl">{stats?.sections ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total students</CardDescription>
            <CardTitle className="text-3xl">{stats?.students ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My classes</CardTitle>
            <CardDescription>Share the join code with your students.</CardDescription>
          </div>
          <CreateSectionDialog onCreated={refreshEverything} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't created a class yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Join code</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell>
                        <div className="font-medium">{section.course.code}</div>
                        <div className="text-xs text-muted-foreground">{section.course.title}</div>
                      </TableCell>
                      <TableCell>{section.term}</TableCell>
                      <TableCell>
                        <JoinCodeCell code={section.joinCode} />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={section.joinCodeActive}
                          onCheckedChange={(checked) => handleToggleActive(section.id, checked)}
                        />
                      </TableCell>
                      <TableCell>{section._count.enrollments}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setRosterSectionId(section.id)}>
                            Roster
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRegenerate(section)}>
                            New code
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationBar pagination={pagination} page={page} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <RosterDialog
        sectionId={rosterSectionId}
        open={rosterSectionId !== null}
        onOpenChange={(open) => !open && setRosterSectionId(null)}
      />
    </div>
  )
}
