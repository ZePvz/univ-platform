import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const EMPTY_FORM = { courseCode: '', courseTitle: '', courseCredits: '', term: '' }

// courseTitle/courseCredits are only actually required by the server when
// courseCode doesn't already exist in the catalogue (see sections.routes.js
// findOrCreateCourse) — we send them every time regardless and let the
// server decide whether it needed them, rather than the frontend guessing
// in advance whether the code is new.
export function CreateSectionDialog({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const { section } = await api.post('/sections', {
        courseCode: form.courseCode.trim().toUpperCase(),
        courseTitle: form.courseTitle.trim() || undefined,
        courseCredits: form.courseCredits ? Number(form.courseCredits) : undefined,
        term: form.term.trim(),
      })
      setForm(EMPTY_FORM)
      setOpen(false)
      toast.success(`Created ${section.course.code} — ${section.term}`)
      onCreated()
    } catch (err) {
      // Stays inline, not a toast: this is a validation error tied
      // directly to the form still open in front of the user — e.g. "this
      // is a new course code, title and credits are required" — they need
      // to fix a field, not just be told something failed elsewhere.
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create a class</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a class</DialogTitle>
            <DialogDescription>
              Using an existing course code reuses its title and credits — you only need to fill those in for a
              brand new one.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="courseCode">Course code</Label>
              <Input id="courseCode" required value={form.courseCode} onChange={update('courseCode')} placeholder="CS101" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="courseTitle">Course title (new courses only)</Label>
              <Input id="courseTitle" value={form.courseTitle} onChange={update('courseTitle')} placeholder="Intro to Programming" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="courseCredits">Credits (new courses only)</Label>
              <Input id="courseCredits" type="number" min="1" value={form.courseCredits} onChange={update('courseCredits')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="term">Term</Label>
              <Input id="term" required value={form.term} onChange={update('term')} placeholder="2025-FALL" />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
