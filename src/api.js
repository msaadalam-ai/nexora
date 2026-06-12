const API_URL = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error || `request_failed:${response.status}`)
    error.status = response.status
    error.requestId = body.requestId
    throw error
  }
  return body
}

export const cloudApi = {
  url: API_URL,
  health: () => request('/health/ready'),
  login: (email, password) => request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  session: (token) => request('/api/v1/session', { token }),
  products: (token) => request('/api/v1/catalog/products', { token }),
  orders: (token) => request('/api/v1/orders', { token }),
  createOrder: (token, payload, idempotencyKey) => request('/api/v1/orders', {
    method: 'POST',
    token,
    headers: { 'idempotency-key': idempotencyKey },
    body: JSON.stringify(payload),
  }),
  registerDevice: (token, payload) => request('/api/v1/devices/register', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  }),
  push: (token, events) => request('/api/v1/sync/push', {
    method: 'POST',
    token,
    body: JSON.stringify({ events }),
  }),
  pull: (token, cursor = 0) => request(`/api/v1/sync/pull?cursor=${cursor}`, { token }),
}
