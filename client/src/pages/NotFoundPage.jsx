import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-medium">Page not found</h1>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </div>
  )
}
