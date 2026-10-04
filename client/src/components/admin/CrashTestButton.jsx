import { useState } from 'react'
import { Button } from '@/components/ui/button'

// Deliberately throws during render when clicked, so the nearest
// ErrorBoundary catches something real instead of us taking it on faith.
// `import.meta.env.DEV` is Vite's build-time flag for "this is a dev
// server, not a production build" — `npm run build` strips this whole
// component out of the bundle entirely, so it can't ship to real users.
function BrokenWidget() {
  throw new Error('Intentional test crash — this is what a real bug looks like to the boundary.')
}

export function CrashTestButton() {
  const [shouldCrash, setShouldCrash] = useState(false)

  if (!import.meta.env.DEV) return null

  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      <span>Dev only: proves the error boundary around this tab actually works.</span>
      <Button size="sm" variant="outline" onClick={() => setShouldCrash(true)}>
        Trigger a crash
      </Button>
      {shouldCrash && <BrokenWidget />}
    </div>
  )
}
