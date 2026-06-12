import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Heart, ChevronRight, X } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchProducts, fetchOverrides, fetchFavorites, toggleFavorite } from '../../lib/data'
import { tierUnitPrice, saleActive } from '../../lib/pricing'
import { nt, addTax } from '../../lib/format'
import { LEAD_TIME, leadTimeBadgeClass } from '../../lib/filters'
import { isNew } from '../../lib/marketing'

function ChipRow({ label, value, options, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 flex-shrink-0 text-xs text-stone-400">{label}</span>
      <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5">
        {options.map(o => {
          const active = value === o.key
          return (
            <button key={o.key} onClick={() => onChange(o.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${active ? 'bg-teal-700 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Catalog() {
  const { dealer, tier } = useAuth()
  const [products, setProducts] = useState([])
  const [overrides, setOverrides] = useState({})
  const [favs, setFavs] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [lead, setLead] = useState('all')   // 'all' | 'stock' | 'fast' | 'normal'
  const [scene, setScene] = useState('all') // 'all' | <scene>
  const [cat, setCat] = useState('all')     // 'all' | <category>
  const [withTax, setWithTax] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [p, o, f] = await Promise.all([fetchProducts(), fetchOverrides(dealer?.id), fetchFavorites(dealer?.id)])
      setProducts(p); setOverrides(o); setFavs(f); setLoading(false)
    })()
  }, [dealer?.id])

  // 篩選選項（從實際資料推導，只顯示有內容的）
  const leadOptions = useMemo(() => [
    { key: 'all', label: '全部' },
    ...LEAD_TIME.filter(lt => products.some(p => p.lead_time_type === lt.key))
      .map(lt => ({ key: lt.key, label: lt.label })),
  ], [products])

  const sceneOptions = useMemo(() => [
    { key: 'all', label: '全部' },
    ...Array.from(new Set(products.flatMap(p => p.scenes || []))).sort()
      .map(s => ({ key: s, label: s })),
  ], [products])

  const catOptions = useMemo(() => [
    { key: 'all', label: '全部' },
    ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()
      .map(c => ({ key: c, label: c })),
  ], [products])

  const filtered = useMemo(() => products.filter(p => {
    if (lead !== 'all' && p.lead_time_type !== lead) return false
    if (scene !== 'all' && !(p.scenes || []).includes(scene)) return false
    if (cat !== 'all' && p.category !== cat) return false
    if (!q) return true
    const s = q.toLowerCase()
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.series || '').toLowerCase().includes(s)
  }), [products, lead, scene, cat, q])

  const filterActive = lead !== 'all' || scene !== 'all' || cat !== 'all'
  const clearFilters = () => { setLead('all'); setScene('all'); setCat('all') }

  const onFav = async (sku, on) => {
    setFavs(prev => on ? [...prev, sku] : prev.filter(s => s !== sku))
    await toggleFavorite(dealer?.id, sku, on)
  }

  const priceOf = (p) => {
    const unit = Math.round(tierUnitPrice({ product: p, tier, override: overrides[p.sku] }))
    return withTax ? addTax(unit) : unit
  }
  // 促銷生效且非覆寫價時，顯示劃線原價（牌價 × 等級乘數）
  const originalOf = (p) => {
    if (!saleActive(p) || overrides[p.sku] != null) return null
    const unit = Math.round(Number(p.base_price) * (tier ? Number(tier.price_rate) : 1))
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

      {/* 篩選列 */}
      <div className="space-y-1.5">
        <ChipRow label="交期" value={lead}  options={leadOptions}  onChange={setLead} />
        <ChipRow label="場景" value={scene} options={sceneOptions} onChange={setScene} />
        <ChipRow label="類型" value={cat}   options={catOptions}   onChange={setCat} />
      </div>

      {/* 結果列：顯示筆數 + 清除 */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>{filtered.length} 筆</span>
          {filterActive && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-teal-700">
              <X className="h-3 w-3" />清除篩選
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-stone-400">載入中…</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-stone-400">找不到符合的品項</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map(p => {
            const fav = favs.includes(p.sku)
            const lt = LEAD_TIME.find(x => x.key === p.lead_time_type)
            const onSale = saleActive(p)
            const orig = originalOf(p)
            return (
              <div key={p.sku} className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
                  {lt && (
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${leadTimeBadgeClass(p.lead_time_type)}`}>
                      {lt.label}
                    </span>
                  )}
                  {onSale && <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">促銷</span>}
                  {!onSale && isNew(p) && <span className="rounded-md bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                </div>
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
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className={`font-mono text-sm font-bold ${onSale ? 'text-rose-600' : 'text-teal-700'}`}>{nt(priceOf(p))}</span>
                      {orig != null && <span className="font-mono text-[10px] text-stone-400 line-through">{nt(orig)}</span>}
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
