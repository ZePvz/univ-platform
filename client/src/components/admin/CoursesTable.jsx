import { useState } from 'react'
import { toast } from 'sonner'
import { useConfirm } from '@/context/ConfirmContext'
import { api } from '@/lib/api'
import { usePaginatedResource } from '@/hooks/usePaginatedResource'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PaginationBar } from '@/components/PaginationBar'
import { SearchInput } from '@/components/SearchInput'

export function CoursesTable() {
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const { data: courses, pagination, isLoading, page, setPage, refetch } = usePaginatedResource('/courses', {
    pageSize: 10,
    params: { search },
  })

  async function handleDelete(course) {
    const ok = await confirm({
      title: `Delete ${course.code}?`,
      description: 'Only possible if no class has ever been created for it.',
    })
    if (!ok) return

    try {
      await api.delete(`/courses/${course.id}`)
      toast.success(`Deleted ${course.code}`)
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchInput onSearch={setSearch} placeholder="Search by code or title…" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses found.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.code}</TableCell>
                  <TableCell>{course.title}</TableCell>
                  <TableCell>{course.credits}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleDelete(course)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar pagination={pagination} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
