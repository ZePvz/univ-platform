import crypto from 'node:crypto'

// No 0/O or 1/I/L — characters that are easy to misread when a teacher
// reads a code aloud or writes it on a whiteboard.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const LENGTH = 8

export function generateJoinCode() {
  let code = ''
  for (const byte of crypto.randomBytes(LENGTH)) {
    code += ALPHABET[byte % ALPHABET.length]
  }
  return code
}
