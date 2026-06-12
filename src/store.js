import { useCallback, useEffect, useState } from 'react'
import { initialCustomers, initialOrders, initialProducts } from './data'

const seed = {
  products: initialProducts,
  customers: initialCustomers,
  orders: initialOrders,
  sales: [],
  heldCarts: [],
  notifications: [
    { id: 1, title: 'Low stock alert', detail: '2 items are below their reorder point.', unread: true },
    { id: 2, title: 'Online order received', detail: 'ORD-1086 is ready to process.', unread: true },
    { id: 3, title: 'Settlement complete', detail: '$4,820.40 deposited successfully.', unread: false },
  ],
}

function readStore() {
  try {
    const saved = JSON.parse(localStorage.getItem('nexora-pos-store'))
    return saved ? { ...seed, ...saved } : seed
  } catch {
    return seed
  }
}

export function useStore() {
  const [data, setData] = useState(readStore)
  useEffect(() => localStorage.setItem('nexora-pos-store', JSON.stringify(data)), [data])
  const update = useCallback((recipe) => setData((current) => recipe(current)), [])
  const reset = useCallback(() => setData(seed), [])
  return { data, update, reset }
}

export function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
}
