import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Component } from 'lucide-react'
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-500"/>產品資料庫</h1>
        <Link to="/bom" className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"><Component className="w-4 h-4"/>BOM 物料表</Link>
      </div>
      <ProductsTab products={products} onSave={onSave} onDelete={onDelete}/>
    </div>
  )
}
