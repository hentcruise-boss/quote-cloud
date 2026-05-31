import { useEffect, useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import ScenesTab from '../features/quote/ScenesTab'
import { useSync } from '../contexts/SyncContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'

export default function ScenesPage() {
  const { run } = useSync()
  const [scenes, setScenes] = useState([])
  const [products, setProducts] = useState([])

  const loadScenes = async () => { const { data } = await api.listScenes(); if (data) setScenes(data) }
  const loadProducts = async () => { const { data } = await api.listProducts(); if (data) setProducts(data) }

  useEffect(() => {
    loadScenes(); loadProducts()
    const ch = supabase.channel('rt-scenes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scenes' }, loadScenes).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const onAdd = (s) => run(async () => { await api.addScene(s); await loadScenes() })
  const onUpdate = (s) => run(async () => { await api.upsertScene(s); await loadScenes() })
  const onDelete = async (id) => {
    if (!window.confirm('確定刪除？')) return
    await run(async () => { await api.deleteScene(id); await loadScenes() })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-indigo-500"/>場景模板</h1>
      <ScenesTab scenes={scenes} products={products} onUpdate={onUpdate} onAdd={onAdd} onDelete={onDelete}/>
    </div>
  )
}
