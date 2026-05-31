import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import ProductsTab from '../features/quote/ProductsTab'
import { useSync } from '../contexts/SyncContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'

export default function ProductsPage() {
  const { run } = useSync()
  const [products, setProducts] = useState([])

  const load = async () => { const { data } = await api.listProducts(); if (data) setProducts(data) }

  useEffect(() => {
    load()
    const ch = supabase.channel('rt-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const onSave = (p) => run(async () => { await api.upsertProduct(p); await load() })
  const onDelete = async (sku) => {
    if (!window.confirm(`確定刪除 ${sku}？`)) return
    await run(async () => { await api.deleteProduct(sku); await load() })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-500"/>產品資料庫</h1>
      <ProductsTab products={products} onSave={onSave} onDelete={onDelete}/>
    </div>
  )
}
