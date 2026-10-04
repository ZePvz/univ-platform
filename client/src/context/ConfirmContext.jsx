import { createContext, useCallback, useContext, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const ConfirmContext = createContext(null)

// One shared confirm dialog for the whole app, instead of `window.confirm`.
// Two real problems with window.confirm, found while testing Phase 6:
// it's the browser's own ugly, unstyled dialog, and — the one that
// actually matters — it can't be driven by browser automation/tests, since
// it blocks the JS thread outside the DOM entirely. This can.
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { title, description, destructive, resolve }
  // Whichever element had focus when confirm() was called — almost always
  // the "Delete" button the user just clicked. Radix's AlertDialogTrigger
  // would normally remember this and restore focus to it automatically,
  // but we open this dialog imperatively (confirm() is a plain function
  // call returning a Promise, not a <Trigger>), so Radix has nothing to
  // return focus to on its own. Found this exact gap live: closing the
  // dialog with Escape left focus on <body> instead of back on the button
  // — a keyboard user would have to re-tab from the top of the page.
  const triggerRef = useRef(null)

  const confirm = useCallback(({ title, description, destructive = true }) => {
    triggerRef.current = document.activeElement
    return new Promise((resolve) => {
      setState({ title, description, destructive, resolve })
    })
  }, [])

  function handleOpenChange(open) {
    if (!open && state) {
      state.resolve(false)
      setState(null)
    }
  }

  function handleConfirm() {
    // A Promise only ever settles once, so it's harmless that clicking
    // AlertDialogAction also makes Radix call onOpenChange(false) right
    // after this — the resolve(false) that triggers is simply ignored.
    state.resolve(true)
    setState(null)
  }

  // Radix's own FocusScope runs a focus-restoration effect when the dialog
  // unmounts, and — without a <Trigger> for it to have recorded — that
  // effect wins the race against a plain `.focus()` call made from our own
  // handlers above, landing focus on <body> instead. onCloseAutoFocus is
  // Radix's documented escape hatch for exactly this: it fires at the
  // right point in Radix's own close lifecycle, and preventDefault() stops
  // Radix's default behavior so ours is the one that sticks. Found this by
  // testing Escape with real keyboard input, not by reading the docs first.
  function handleCloseAutoFocus(event) {
    event.preventDefault()
    triggerRef.current?.focus?.()
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state !== null} onOpenChange={handleOpenChange}>
        <AlertDialogContent onCloseAutoFocus={handleCloseAutoFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>{state?.title}</AlertDialogTitle>
            {state?.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Radix's own Cancel/Action, not plain buttons — focus-trap
                and Escape-to-cancel come free; focus-RETURN we have to do
                ourselves, above, precisely because this dialog has no
                <AlertDialogTrigger>. */}
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant={state?.destructive ? 'destructive' : 'default'} onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}
