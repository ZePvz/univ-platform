import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadGoogleIdentityScript } from '@/lib/googleIdentity'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/lib/roles'

// Vite only exposes env vars prefixed VITE_ to client code — everything
// else in .env stays server-side. Set in client/.env once you have a
// Client ID from Google Cloud Console.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Renders Google's own "Sign in with Google" button (not a button we style
// ourselves — Google requires using their rendered button, which is also
// what handles the whole popup/credential flow for us). On success it hands
// us a signed ID token, which continueWithGoogle sends to our backend for
// verification.
export function GoogleSignInButton({ onError }) {
  const buttonRef = useRef(null)
  const { continueWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false

    loadGoogleIdentityScript().then(() => {
      if (cancelled || !buttonRef.current) return

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          try {
            const user = await continueWithGoogle(response.credential)
            navigate(ROLE_HOME[user.role], { replace: true })
          } catch (err) {
            onError?.(err.message)
          }
        },
      })
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 336,
      })
      setIsReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [continueWithGoogle, navigate, onError])

  if (!CLIENT_ID) {
    // Lets the rest of the app run before Google Cloud is set up, instead
    // of a broken/missing button.
    return (
      <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
        Google sign-in isn't configured — set VITE_GOOGLE_CLIENT_ID in client/.env
      </p>
    )
  }

  // Reserve the button's height before it renders, so the layout doesn't
  // jump once the script loads.
  return <div ref={buttonRef} className={isReady ? '' : 'h-10'} />
}
