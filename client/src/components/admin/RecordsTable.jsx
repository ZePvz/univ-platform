import { memo, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAllEnrollments } from '@/hooks/useAllEnrollments'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { SearchInput } from '@/components/SearchInput'

const STATUS_VARIANT = { ACTIVE: 'default', COMPLETED: 'secondary', DROPPED: 'outline' }
const ROW_HEIGHT = 52
const VIEWPORT_HEIGHT = 480

const COLUMNS = 'grid grid-cols-[2fr_1fr_2fr_1fr_0.8fr_0.7fr] items-center gap-3 px-3'

// A row's only prop is its own data, and nothing here ever mutates that
// data in place — so React.memo's default shallow comparison is exactly
// right: this component re-renders only when ITS OWN enrollment object is a
// new reference, never because a sibling row changed or a parent re-rendered
// for an unrelated reason (typing in the search box, toggling the switch).
const Row = memo(function Row({ enrollment, style }) {
  return (
    <div className={`${COLUMNS} border-b text-sm`} style={style}>
      <div className="truncate">
        <div className="truncate font-medium">{enrollment.student.name}</div>
        <div className="truncate text-xs text-muted-foreground">{enrollment.student.email}</div>
      </div>
      <div className="truncate">{enrollment.section.course.code}</div>
      <div className="truncate text-muted-foreground">{enrollment.section.course.title}</div>
      <div className="truncate">{enrollment.section.term}</div>
      <div>
        <Badge variant={STATUS_VARIANT[enrollment.status]}>{enrollment.status}</Badge>
      </div>
      <div>{enrollment.finalGrade ?? '—'}</div>
    </div>
  )
})

function HeaderRow() {
  return (
    <div className={`${COLUMNS} border-b bg-muted/50 py-2 text-xs font-medium text-muted-foreground`}>
      <div>Student</div>
      <div>Course</div>
      <div>Title</div>
      <div>Term</div>
      <div>Status</div>
      <div>Grade</div>
    </div>
  )
}

// Renders every row directly into normal DOM flow — no windowing. Kept
// side-by-side with the virtualized path below specifically so the
// difference is something you can toggle and feel, not just read about.
function NaiveList({ data }) {
  return (
    <div style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto' }}>
      {data.map((enrollment) => (
        <Row key={enrollment.id} enrollment={enrollment} style={{ height: ROW_HEIGHT }} />
      ))}
    </div>
  )
}

// Renders only the rows currently scrolled into view (plus a small overscan
// buffer), no matter how many thousands of rows are in `data`. The DOM node
// count for the list body stays roughly constant — around viewport-height /
// row-height — instead of growing with the dataset.
function VirtualizedList({ data }) {
  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  return (
    <div ref={parentRef} style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <Row
            key={data[virtualRow.index].id}
            enrollment={data[virtualRow.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function RecordsTable() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('enrolledAt')
  const [sortDir, setSortDir] = useState('desc')
  const [isVirtualized, setIsVirtualized] = useState(true)
  const [renderMs, setRenderMs] = useState(null)
  const toggleStartedAt = useRef(null)

  const { data, total, isLoading, error } = useAllEnrollments({ search, sortBy, sortDir })

  // A rough, illustrative timer — not a rigorous benchmark — measuring from
  // the moment you flip the switch to the moment the browser has committed
  // the new DOM (useLayoutEffect fires synchronously after DOM mutations,
  // before the browser paints).
  useLayoutEffect(() => {
    if (toggleStartedAt.current !== null) {
      setRenderMs(performance.now() - toggleStartedAt.current)
      toggleStartedAt.current = null
    }
  }, [isVirtualized, data])

  function handleToggle(checked) {
    toggleStartedAt.current = performance.now()
    setIsVirtualized(checked)
  }

  const renderedRowCount = isVirtualized ? Math.min(data.length, Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 20) : data.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <SearchInput onSearch={setSearch} placeholder="Search by student, email or course code…" />
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Sort by</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enrolledAt">Enrolled date</SelectItem>
              <SelectItem value="finalGrade">Grade</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Direction</Label>
          <Select value={sortDir} onValueChange={setSortDir}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="virtualize-toggle" className="text-sm">
            Virtualized
          </Label>
          <Switch id="virtualize-toggle" checked={isVirtualized} onCheckedChange={handleToggle} />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>{total} matching records</span>
        <span>{renderedRowCount} row components mounted right now</span>
        {renderMs !== null && <span>~{renderMs.toFixed(1)}ms to commit after last toggle</span>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <HeaderRow />
          {isVirtualized ? <VirtualizedList data={data} /> : <NaiveList data={data} />}
        </div>
      )}
    </div>
  )
}
