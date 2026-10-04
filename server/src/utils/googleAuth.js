import { OAuth2Client } from 'google-auth-library'
import { config } from '../config.js'

const client = new OAuth2Client(config.googleClientId)

// Verifies the ID token the browser got from Google's "Sign in with Google"
// button. This checks the cryptographic signature against Google's public
// keys, and that the token's `aud` claim matches our own client ID — i.e.
// it proves both "Google really issued this" and "it was issued for us",
// not, say, a different app's login button.
export async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientId })
  const payload = ticket.getPayload()
  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name,
  }
}
