import { Button } from '@/components/ui/button'

export function PaginationBar({ pagination, page, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-3">
      <p className="text-xs text-muted-foreground">{pagination.total} total</p>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} of {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pagination.totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
