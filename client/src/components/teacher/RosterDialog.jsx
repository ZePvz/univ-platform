import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const STATUS_VARIANT = { ACTIVE: 'default', COMPLETED: 'secondary', DROPPED: 'outline' }

function GradeCell({ enrollment, onSaved }) {
  const [value, setValue] = useState(enrollment.finalGrade ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const isDirty = value !== '' && String(value) !== String(enrollment.finalGrade ?? '')

  async function handleSave() {
    setIsSaving(true)
    try {
      await api.patch(`/enrollments/${enrollment.id}/grade`, { finalGrade: Number(value) })
      toast.success(`Saved ${enrollment.student.name}'s grade`)
      onSaved()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-20"
          // Sighted users get "which row is this" from the table layout;
          // a screen reader landing on this input in isolation needs the
          // same context spelled out.
          aria-label={`Grade for ${enrollment.student.name}`}
        />
        <Button size="sm" variant="outline" disabled={!isDirty || isSaving} onClick={handleSave}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

// A section's roster and per-student grading, opened from the teacher's
// section list. Fetched fresh every time it opens rather than reusing
// data the parent list already has, since the parent's row doesn't carry
// individual students — only a count.
export function RosterDialog({ sectionId, open, onOpenChange }) {
  const [enrollments, setEnrollments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  function load() {
    if (!sectionId) return
    setIsLoading(true)
    api
      .get(`/sections/${sectionId}/enrollments`)
      .then((res) => setEnrollments(res.enrollments))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sectionId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Roster</DialogTitle>
          <DialogDescription>Enter a grade (0–100) and save it for each student.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students have joined yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <div className="font-medium">{enrollment.student.name}</div>
                    <div className="text-xs text-muted-foreground">{enrollment.student.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[enrollment.status]}>{enrollment.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <GradeCell enrollment={enrollment} onSaved={load} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
