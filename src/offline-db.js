const DATABASE = 'nexora-offline'
const VERSION = 2

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'eventId' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('conflicts')) db.createObjectStore('conflicts', { keyPath: 'eventId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transactStore(name, mode, operation) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(name, mode)
    const result = operation(transaction.objectStore(name))
    transaction.oncomplete = () => {
      db.close()
      resolve(result?.result)
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function queueEvent(event) {
  await transactStore('outbox', 'readwrite', (store) => store.put({ ...event, queuedAt: new Date().toISOString(), attempts: 0 }))
}

export async function pendingEvents() {
  return transactStore('outbox', 'readonly', (store) => store.getAll())
}

export async function removeEvents(eventIds) {
  await transactStore('outbox', 'readwrite', (store) => {
    for (const eventId of eventIds) store.delete(eventId)
  })
}

export async function setMeta(key, value) {
  await transactStore('meta', 'readwrite', (store) => store.put({ key, value }))
}

export async function getMeta(key, fallback = null) {
  const result = await transactStore('meta', 'readonly', (store) => store.get(key))
  return result?.value ?? fallback
}

export async function cacheData(key, value) {
  await transactStore('cache', 'readwrite', (store) => store.put({ key, value, cachedAt: new Date().toISOString() }))
}

export async function getCachedData(key) {
  return transactStore('cache', 'readonly', (store) => store.get(key))
}

export async function getConflicts() {
  return transactStore('conflicts', 'readonly', (store) => store.getAll())
}

export async function removeConflict(eventId) {
  await transactStore('conflicts', 'readwrite', (store) => store.delete(eventId))
}

export async function syncOutbox(token, api) {
  const events = await pendingEvents()
  if (!events.length) return { accepted: 0, conflicts: [], rejected: [] }
  const result = await api.push(token, events)
  const completed = [...result.accepted, ...result.duplicates].map((item) => item.eventId)
  await removeEvents(completed)
  if (result.conflicts.length) {
    await transactStore('conflicts', 'readwrite', (store) => {
      for (const conflict of result.conflicts) store.put({ ...conflict, detectedAt: new Date().toISOString() })
    })
  }
  await setMeta('lastSyncAt', new Date().toISOString())
  return { accepted: completed.length, conflicts: result.conflicts, rejected: result.rejected }
}
