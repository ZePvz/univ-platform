import { useState } from 'react'
import { toast } from 'sonner'
import { useConfirm } from '@/context/ConfirmContext'
import { api } from '@/lib/api'
import { usePaginatedResource } from '@/hooks/usePaginatedResource'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PaginationBar } from '@/components/PaginationBar'
import { SearchInput } from '@/components/SearchInput'

export function SectionsTable() {
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const { data: sections, pagination, isLoading, page, setPage, refetch } = usePaginatedResource('/sections', {
    pageSize: 10,
    params: { search },
  })

  async function handleDelete(section) {
    const ok = await confirm({
      title: `Delete ${section.course.code} (${section.term})?`,
      description: 'Only possible if no student has ever enrolled in it.',
    })
    if (!ok) return

    try {
      await api.delete(`/sections/${section.id}`)
      toast.success(`Deleted ${section.course.code} — ${section.term}`)
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchInput onSearch={setSearch} placeholder="Search by course code or title…" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes found.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Term</TableHead>
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
                  <TableCell>{section.teacher.name}</TableCell>
                  <TableCell>{section.term}</TableCell>
                  <TableCell>{section._count.enrollments}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleDelete(section)}>
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
