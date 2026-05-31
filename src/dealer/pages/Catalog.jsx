import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Heart, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchProducts, fetchOverrides, fetchFavorites, toggleFavorite } from '../../lib/data'
import { tierUnitPrice } from '../../lib/pricing'
import { nt, addTax } from '../../lib/format'

export default function Catalog() {
  const { dealer, tier } = useAuth()
  const [products, setProducts] = useState([])
  const [overrides, setOverrides] = useState({})
  const [favs, setFavs] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('全部')
  const [withTax, setWithTax] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [p, o, f] = await Promise.all([fetchProducts(), fetchOverrides(dealer?.id), fetchFavorites(dealer?.id)])
      setProducts(p); setOverrides(o); setFavs(f); setLoading(false)
    })()
  }, [dealer?.id])

  const categories = useMemo(() => ['全部', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products])

  const filtered = products.filter(p => {
    if (cat !== '全部' && p.category !== cat) return false
    if (!q) return true
    const s = q.toLowerCase()
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.series || '').toLowerCase().includes(s)
  })

  const onFav = async (sku, on) => {
    setFavs(prev => on ? [...prev, sku] : prev.filter(s => s !== sku))
    await toggleFavorite(dealer?.id, sku, on)
  }

  const priceOf = (p) => {
    const unit = Math.round(tierUnitPrice({ product: p, tier, override: overrides[p.sku] }))
    return withTax ? addTax(unit) : unit
  }
  const hasFrom = (p) => (p.qty_tiers?.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-800">選品目錄</h1>
        <button onClick={() => setWithTax(v => !v)}
          className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500">
          {withTax ? '含稅' : '未稅'}顯示 · 點擊切換
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋品名 / 系列 / 編號…"
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${cat === c ? 'bg-teal-700 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-stone-400">載入中…</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-stone-400">找不到符合的品項</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map(p => {
            const fav = favs.includes(p.sku)
            return (
              <div key={p.sku} className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <button onClick={() => onFav(p.sku, !fav)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-white/85 p-1.5 backdrop-blur">
                  <Heart className={`h-4 w-4 ${fav ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
                </button>
                <Link to={`/product/${p.sku}`} className="block">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                      : <div className="flex h-full items-center justify-center text-xs text-stone-300">無圖片</div>}
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] text-stone-400">{p.series || p.category}</div>
                    <div className="mt-0.5 line-clamp-1 text-sm font-semibold text-stone-800">{p.name}</div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="font-mono text-sm font-bold text-teal-700">{nt(priceOf(p))}</span>
                      {hasFrom(p) && <span className="text-[10px] text-stone-400">起</span>}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      <Link to="/orders" className="flex items-center justify-between rounded-xl bg-white border border-stone-200 px-4 py-3 text-sm text-stone-500">
        查看我的訂單進度 <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
