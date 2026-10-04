import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

// Waits 300ms after typing stops before calling onSearch, so we don't fire
// an API request on every keystroke. onSearch is kept in a ref rather than
// a useEffect dependency — otherwise a parent that doesn't memoize the
// callback (via useCallback) would reset the debounce timer on every
// render, and the search would never actually fire.
export function SearchInput({ onSearch, placeholder = 'Search…', className = '' }) {
  const [value, setValue] = useState('')
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  useEffect(() => {
    const id = setTimeout(() => onSearchRef.current(value), 300)
    return () => clearTimeout(id)
  }, [value])

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      // A placeholder is not an accessible name — it's not reliably
      // announced by every screen reader, and it disappears the moment
      // there's a value, which is exactly when you'd want to check what
      // field you're in. Every call site already passes a placeholder that
      // describes the field, so reusing it as aria-label costs nothing.
      aria-label={placeholder}
      className={`max-w-xs ${className}`}
    />
  )
}
