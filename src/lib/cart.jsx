import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth'

const CartCtx = createContext(null)
const keyFor = (dealerId) => `mm_cart_${dealerId || 'anon'}`

// 每一筆購物車項目：
// { key, sku, name, spec, image_url, options:[{id,group_name,label,price_delta}], unitPrice, qty }
export function CartProvider({ children }) {
  const { dealer } = useAuth()
  const dealerId = dealer?.id
  const [items, setItems] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(dealerId))
      setItems(raw ? JSON.parse(raw) : [])
    } catch { setItems([]) }
  }, [dealerId])

  useEffect(() => {
    if (dealerId) {
      try { localStorage.setItem(keyFor(dealerId), JSON.stringify(items)) } catch { /* ignore */ }
    }
  }, [items, dealerId])

  const addItem = (line) => setItems(prev => {
    // 同 SKU 同選配 → 累加數量
    const sig = line.sku + '|' + line.options.map(o => o.id).sort().join(',')
    const idx = prev.findIndex(p => p.key === sig)
    if (idx >= 0) {
      const next = [...prev]
      next[idx] = { ...next[idx], qty: next[idx].qty + line.qty }
      return next
    }
    return [...prev, { ...line, key: sig }]
  })

  const updateQty = (key, qty) => setItems(prev =>
    prev.map(p => p.key === key ? { ...p, qty: Math.max(1, Number(qty) || 1) } : p))

  const removeItem = (key) => setItems(prev => prev.filter(p => p.key !== key))
  const clear = () => setItems([])

  const count = useMemo(() => items.reduce((s, i) => s + Number(i.qty), 0), [items])

  return (
    <CartCtx.Provider value={{ items, addItem, updateQty, removeItem, clear, count }}>
      {children}
    </CartCtx.Provider>
  )
}

export const useCart = () => useContext(CartCtx)
