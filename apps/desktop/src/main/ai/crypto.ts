import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET = 'novelforge-desktop-key-material-v1'

function getKey(): Buffer {
  return crypto.scryptSync(SECRET, 'novelforge-salt', 32)
}

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: tag.toString('hex'),
  })
}

export function decryptApiKey(encrypted: string): string {
  const { iv, data, tag } = JSON.parse(encrypted)
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()])
  return decrypted.toString('utf-8')
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '...' + key.slice(-4)
}
