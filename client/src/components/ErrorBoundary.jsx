import { Component } from 'react'
import { Button } from '@/components/ui/button'

// Error boundaries catch errors thrown while RENDERING a component tree —
// they are still, in 2026, the one place React requires a class component,
// because the two lifecycle methods below have no hook equivalent.
//
// What this does NOT catch (a common interview question, and worth knowing
// precisely rather than vaguely):
//   - Errors in event handlers (a button's onClick throwing) — use a plain
//     try/catch there, same as api.js already does for every request.
//   - Errors in async code (a rejected Promise in useEffect) — same, needs
//     its own try/catch or .catch().
//   - Errors thrown by the boundary's own render method.
//   - Errors during server-side rendering (not applicable here).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  // Runs during rendering, right after a descendant throws. Must be a
  // static method returning the next state — no side effects allowed here.
  static getDerivedStateFromError(error) {
    return { error }
  }

  // Runs after an error has been caught, WITH side effects allowed. This is
  // where a real app would report to something like Sentry; here it just
  // logs, since we don't have an error-reporting service wired up.
  componentDidCatch(error, info) {
    console.error('Caught by ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error)
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Something went wrong.</p>
          <p className="text-xs text-muted-foreground">{this.state.error.message}</p>
          <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
