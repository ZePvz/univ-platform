import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function JoinCodeCell({ code }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{code}</code>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
