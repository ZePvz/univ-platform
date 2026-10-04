import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/ConfirmContext'
import { api } from '@/lib/api'
import { usePaginatedResource } from '@/hooks/usePaginatedResource'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PaginationBar } from '@/components/PaginationBar'
import { SearchInput } from '@/components/SearchInput'

const ROLE_LABEL = { STUDENT: 'Student', TEACHER: 'Teacher', ADMIN: 'Admin' }

export function UsersTable() {
  const { user: me } = useAuth()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const { data: users, pagination, isLoading, page, setPage, refetch } = usePaginatedResource('/users', {
    pageSize: 10,
    params: { search },
  })

  async function handleRoleChange(user, role) {
    try {
      await api.patch(`/users/${user.id}/role`, { role })
      toast.success(`${user.name} is now ${ROLE_LABEL[role]}`)
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete(user) {
    const ok = await confirm({ title: `Delete ${user.name}?`, description: user.email })
    if (!ok) return

    try {
      await api.delete(`/users/${user.id}`)
      toast.success(`Deleted ${user.name}`)
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchInput onSearch={setSearch} placeholder="Search by name or email…" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === me.id
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name} {isSelf && <Badge variant="secondary" className="ml-1">You</Badge>}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isSelf}
                        onValueChange={(role) => handleRoleChange(u, role)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" disabled={isSelf} onClick={() => handleDelete(u)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <PaginationBar pagination={pagination} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
