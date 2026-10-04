import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/ConfirmContext'
import { api } from '@/lib/api'
import { usePaginatedResource } from '@/hooks/usePaginatedResource'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PaginationBar } from '@/components/PaginationBar'

const STATUS_VARIANT = { ACTIVE: 'default', COMPLETED: 'secondary', DROPPED: 'outline' }

function JoinClassCard({ onJoined }) {
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // A toast, not an inline Alert: joining is a one-shot action with no form
  // left on screen to keep correcting — the outcome is either "it worked,
  // look below" or "try a different code," neither of which needs to stay
  // pinned to the page the way a login error does.
  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { enrollment } = await api.post('/sections/join', { code: code.trim() })
      toast.success('Joined the class')
      setCode('')
      onJoined(enrollment)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a class</CardTitle>
        <CardDescription>Enter the code your teacher shared with you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="joinCode">Join code</Label>
            <Input
              id="joinCode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CDKKS4NQ"
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting || !code.trim()}>
            {isSubmitting ? 'Joining…' : 'Join'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function StudentDashboard() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [stats, setStats] = useState(null)
  const { data: enrollments, pagination, isLoading, page, setPage, refetch } = usePaginatedResource(
    '/enrollments',
    { pageSize: 10 },
  )

  useEffect(() => {
    api.get('/dashboard/stats').then(setStats)
  }, [])

  function refreshEverything() {
    refetch()
    api.get('/dashboard/stats').then(setStats)
  }

  async function handleDrop(enrollment) {
    const ok = await confirm({
      title: `Drop ${enrollment.section.course.code}?`,
      description: 'You can rejoin later with the same code.',
    })
    if (!ok) return

    try {
      await api.delete(`/enrollments/${enrollment.id}`)
      toast.success(`Dropped ${enrollment.section.course.code}`)
      refreshEverything()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">Here's what you're enrolled in.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Card>
          <CardHeader>
            <CardDescription>Active classes</CardDescription>
            <CardTitle className="text-3xl">{stats?.activeClasses ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{stats?.completedClasses ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <JoinClassCard onJoined={refreshEverything} />

      <Card>
        <CardHeader>
          <CardTitle>My classes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't joined any classes yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="font-medium">{enrollment.section.course.code}</div>
                        <div className="text-xs text-muted-foreground">{enrollment.section.course.title}</div>
                      </TableCell>
                      <TableCell>{enrollment.section.teacher?.name ?? '—'}</TableCell>
                      <TableCell>{enrollment.section.term}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[enrollment.status]}>{enrollment.status}</Badge>
                      </TableCell>
                      <TableCell>{enrollment.finalGrade ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {enrollment.status === 'ACTIVE' && (
                          <Button variant="outline" size="sm" onClick={() => handleDrop(enrollment)}>
                            Drop
                          </Button>
                        )}
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
    </div>
  )
}
