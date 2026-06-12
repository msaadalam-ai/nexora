import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, expectedHex] = stored.split(':')
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function signToken(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const body = encode({ ...payload, iat: now, exp: now + ttlSeconds })
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

export function verifyToken(token, secret) {
  const [header, body, signature] = String(token || '').split('.')
  if (!header || !body || !signature) throw new Error('invalid_token')
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('invalid_token')
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('expired_token')
  return payload
}

export function verifyWebhook(rawBody, signature, secret) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return Boolean(signature) && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
