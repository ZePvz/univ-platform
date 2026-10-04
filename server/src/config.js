import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'

// Single place that reads process.env, so the rest of the app imports
// validated values instead of touching env vars directly.
export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://univ:univ_dev_password@localhost:5432/univ_platform',

  // In production Express sits behind Nginx on the same machine, so it only
  // needs to answer to localhost. Binding to 127.0.0.1 means the port is not
  // reachable from the internet even if the firewall is misconfigured.
  // undefined = Node's default (all interfaces), which is what dev has always used.
  host: process.env.HOST || (isProduction ? '127.0.0.1' : undefined),

  // How many reverse proxies (Nginx) sit between the internet and Express.
  // Express uses this to decide how far to believe the X-Forwarded-For header
  // when working out a visitor's real IP address. 0 = no proxy, trust nothing.
  trustProxy: Number(process.env.TRUST_PROXY ?? (isProduction ? 1 : 0)),

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Name of the httpOnly cookie that carries the JWT.
  cookieName: 'univ_token',

  // Same value the frontend uses (VITE_GOOGLE_CLIENT_ID) — the backend needs
  // it too, to check that a Google ID token was actually issued for *our*
  // app and not some other site's login button.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
}

// A weak default secret is fine for local dev but must never reach production.
if (isProduction && config.jwtSecret === 'dev-only-insecure-secret-change-me') {
  throw new Error('JWT_SECRET must be set to a strong value in production.')
}

// The dev database URL above carries a throwaway password. If DATABASE_URL is
// ever missing in production, failing loudly beats quietly trying the dev
// credentials against a real database.
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in production.')
}
