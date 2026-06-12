import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const webUrl = 'http://127.0.0.1:5199'
const apiUrl = 'http://127.0.0.1:8799'
const verifyDatabase = `data/verify-${process.pid}.db`
await rm(verifyDatabase, { force: true })

const services = [
  spawn(process.execPath, ['server/index.js'], {
    stdio: 'ignore',
    env: { ...process.env, PORT: '8799', DATABASE_PATH: verifyDatabase, TOKEN_SECRET: 'verification-secret-with-enough-entropy', ALLOWED_ORIGIN: webUrl },
  }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5199'], {
    stdio: 'ignore',
    env: { ...process.env, VITE_API_URL: apiUrl },
  }),
]

async function waitFor(url) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Service did not become ready: ${url}`)
}

await Promise.all([waitFor(`${apiUrl}/health/ready`), waitFor(webUrl)])
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(error.message))

const checks = []
const check = async (name, action) => {
  await action()
  checks.push(name)
}

try {
  await page.goto(webUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard')

  await check('Dashboard date controls and CSV export', async () => {
    await page.getByRole('button', { name: /Last 7 days/ }).first().click()
    await page.getByRole('button', { name: /Last 30 days/ }).first().waitFor()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export summary' }).click()
    const download = await downloadPromise
    if (download.suggestedFilename() !== 'dashboard-summary.csv') throw new Error('Dashboard export filename was incorrect')
  })

  await check('Notification controls', async () => {
    await page.getByRole('button', { name: 'Notifications' }).click()
    await page.getByRole('button', { name: 'Mark all as read' }).click()
    await page.getByText('All notifications marked as read.').waitFor()
  })

  await check('POS category filtering', async () => {
    await page.goto(`${webUrl}/pos`)
    await page.getByRole('button', { name: 'Services', exact: true }).click()
    await page.getByRole('button', { name: /Personal Training/ }).waitFor()
    if (await page.getByRole('button', { name: /Everyday Runner/ }).count()) throw new Error('Retail product remained in Services filter')
  })

  await check('Hold and restore sale', async () => {
    await page.getByRole('button', { name: /Personal Training/ }).click()
    await page.getByRole('button', { name: /Hold sale/ }).click()
    await page.getByText('Sale held successfully.').waitFor()
    await page.getByRole('button', { name: /Held sales \(1\)/ }).click()
    await page.locator('.held-list > button').click()
    await page.getByText('1 items').waitFor()
  })

  await check('Cloud checkout persists order and inventory', async () => {
    await page.getByRole('button', { name: 'All items', exact: true }).click()
    const initialStock = await page.evaluate(async () => {
      const token = sessionStorage.getItem('nexora-token')
      const response = await fetch('http://127.0.0.1:8799/api/v1/catalog/products', {
        headers: { authorization: `Bearer ${token}` },
      })
      const body = await response.json()
      return body.items.find((item) => item.id === 'prd_runner').stock
    })
    await page.getByRole('button', { name: /Everyday Runner/ }).click()
    await page.getByRole('button', { name: /Charge/ }).click()
    await page.getByRole('button', { name: 'Confirm Card payment' }).click()
    await page.getByRole('heading', { name: 'Payment successful' }).waitFor()
    const cloudState = await page.evaluate(async () => {
      const token = sessionStorage.getItem('nexora-token')
      const headers = { authorization: `Bearer ${token}` }
      const [productsResponse, ordersResponse] = await Promise.all([
        fetch('http://127.0.0.1:8799/api/v1/catalog/products', { headers }),
        fetch('http://127.0.0.1:8799/api/v1/orders', { headers }),
      ])
      const products = await productsResponse.json()
      const orders = await ordersResponse.json()
      return {
        stock: products.items.find((item) => item.id === 'prd_runner').stock,
        orderCount: orders.items.length,
      }
    })
    if (cloudState.stock !== initialStock - 1) throw new Error('Cloud stock was not decremented exactly once')
    if (cloudState.orderCount !== 1) throw new Error('Cloud order was not persisted exactly once')
    await page.getByRole('button', { name: 'New sale' }).click()
  })

  await check('Offline checkout queues and reconciles after reconnect', async () => {
    const initialCloudState = await page.evaluate(async () => {
      const token = sessionStorage.getItem('nexora-token')
      const headers = { authorization: `Bearer ${token}` }
      const [productsResponse, ordersResponse] = await Promise.all([
        fetch('http://127.0.0.1:8799/api/v1/catalog/products', { headers }),
        fetch('http://127.0.0.1:8799/api/v1/orders', { headers }),
      ])
      const products = await productsResponse.json()
      const orders = await ordersResponse.json()
      return {
        stock: products.items.find((item) => item.id === 'prd_tee').stock,
        orderCount: orders.items.length,
      }
    })
    await page.context().setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await page.getByText('Offline mode').waitFor()
    await page.getByRole('button', { name: /Classic Cotton Tee/ }).click()
    await page.getByRole('button', { name: /Charge/ }).click()
    await page.getByRole('button', { name: 'Confirm Card payment' }).click()
    await page.getByText('Sale saved offline and will synchronize automatically.').waitFor()
    const queued = await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('nexora-offline', 2)
      request.onsuccess = () => {
        const db = request.result
        const count = db.transaction('outbox', 'readonly').objectStore('outbox').count()
        count.onsuccess = () => resolve(count.result)
        count.onerror = () => reject(count.error)
      }
      request.onerror = () => reject(request.error)
    }))
    if (queued !== 1) throw new Error(`Expected one offline event, found ${queued}`)
    await page.getByRole('button', { name: 'New sale' }).click()
    await page.context().setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await page.getByText('Cloud online').waitFor()
    await page.waitForFunction(() => new Promise((resolve) => {
      const request = indexedDB.open('nexora-offline', 2)
      request.onsuccess = () => {
        const count = request.result.transaction('outbox', 'readonly').objectStore('outbox').count()
        count.onsuccess = () => resolve(count.result === 0)
      }
    }))
    const reconciled = await page.evaluate(async () => {
      const token = sessionStorage.getItem('nexora-token')
      const headers = { authorization: `Bearer ${token}` }
      const [productsResponse, ordersResponse] = await Promise.all([
        fetch('http://127.0.0.1:8799/api/v1/catalog/products', { headers }),
        fetch('http://127.0.0.1:8799/api/v1/orders', { headers }),
      ])
      const products = await productsResponse.json()
      const orders = await ordersResponse.json()
      return {
        stock: products.items.find((item) => item.id === 'prd_tee').stock,
        orderCount: orders.items.length,
      }
    })
    if (reconciled.stock !== initialCloudState.stock - 1) throw new Error('Offline stock movement was not reconciled')
    if (reconciled.orderCount !== initialCloudState.orderCount + 1) throw new Error('Offline order was not reconciled exactly once')
  })

  await check('Manual order creation', async () => {
    await page.goto(`${webUrl}/orders`)
    await page.getByRole('button', { name: 'Create order' }).click()
    const form = page.locator('.modal form')
    await form.getByLabel('Order total').fill('75')
    await form.getByRole('button', { name: 'Create order', exact: true }).click()
    await page.getByText(/ORD-\d+/).first().waitFor()
    await page.getByText(/created\./).waitFor()
  })

  await check('Filtered record editing targets correct row', async () => {
    await page.goto(`${webUrl}/products`)
    await page.getByPlaceholder('Search products & services...').fill('Hydration Bottle')
    await page.getByRole('button', { name: 'Needs attention' }).click()
    await page.getByRole('button', { name: 'Edit record' }).click()
    await page.getByLabel('Name').fill('Hydration Bottle Verified')
    await page.getByRole('button', { name: 'Save record' }).click()
    await page.getByText('Hydration Bottle Verified', { exact: true }).waitFor()
  })

  await check('Table column controls', async () => {
    await page.getByPlaceholder('Search products & services...').fill('')
    await page.getByRole('button', { name: 'Needs attention' }).click()
    const fullHeaderCount = await page.locator('thead th').count()
    await page.getByRole('button', { name: 'Compact columns' }).click()
    const compactHeaderCount = await page.locator('thead th').count()
    if (compactHeaderCount >= fullHeaderCount) throw new Error('Compact columns did not reduce the table')
  })

  await check('Report scheduling', async () => {
    await page.goto(`${webUrl}/reports`)
    await page.getByRole('button', { name: 'Schedules' }).click()
    await page.getByLabel('Report name').fill('Branch closing report')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByText('Branch closing report scheduled.').waitFor()
  })

  await check('Settings navigation and manual sync', async () => {
    await page.goto(`${webUrl}/settings`)
    await page.getByRole('button', { name: 'Offline & sync' }).click()
    await page.getByRole('heading', { name: 'Offline & sync' }).waitFor()
    await page.getByRole('button', { name: 'Sync now' }).click()
    await page.getByText(/Synchronization completed\. \d+ queued records uploaded\./).waitFor()
  })

  await check('Conflict inbox resolution', async () => {
    await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('nexora-offline', 2)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('conflicts', 'readwrite')
        transaction.objectStore('conflicts').put({
          eventId: 'verify-conflict',
          entityType: 'product',
          entityId: 'prd_runner',
          serverVersion: 2,
          clientVersion: 1,
          detectedAt: new Date().toISOString(),
        })
        transaction.oncomplete = resolve
        transaction.onerror = () => reject(transaction.error)
      }
      request.onerror = () => reject(request.error)
    }))
    await page.goto(`${webUrl}/dashboard`)
    await page.goto(`${webUrl}/settings`)
    await page.getByRole('button', { name: 'Offline & sync' }).click()
    await page.getByText('Conflict inbox').waitFor()
    await page.getByRole('button', { name: 'Accept cloud' }).click()
    await page.getByText('Cloud version accepted and conflict closed.').waitFor()
  })

  if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`)
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2))
} finally {
  await browser.close()
  await Promise.all(services.map((service) => new Promise((resolve) => {
    service.once('exit', resolve)
    service.kill()
    setTimeout(resolve, 2000)
  })))
  await rm(verifyDatabase, { force: true })
}
