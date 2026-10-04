import bcrypt from 'bcryptjs'

// Cost factor for bcrypt's hashing loop. Higher = slower to brute-force but
// slower to compute; 10 is a reasonable default for a login endpoint.
const SALT_ROUNDS = 10

// Hashes include their own random salt, so two users with the same password
// get different hashes, and we never store or compare plain text.
export const hashPassword = (plainText) => bcrypt.hash(plainText, SALT_ROUNDS)

export const comparePassword = (plainText, hash) => bcrypt.compare(plainText, hash)
