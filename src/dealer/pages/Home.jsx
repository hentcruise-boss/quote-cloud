import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Heart, ClipboardList, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchProducts, fetchOverrides, fetchFavorites, fetchOrders } from '../../lib/data'
import { tierUnitPrice } from '../../lib/pricing'
import { nt, fmtDate } from '../../lib/format'
import { statusLabel } from '../../lib/status'

export default function Home() {
  const { dealer, tier } = useAuth()
  const [products, setProducts] = useState([])
  const [overrides, setOverrides] = useState({})
  const [favs, setFavs] = useState([])
  const [orders, setOrders] = useState([])

  useEffect(() => {
    (async () => {
      const [p, o, f, ord] = await Promise.all([
        fetchProducts(), fetchOverrides(dealer?.id), fetchFavorites(dealer?.id), fetchOrders(dealer?.id),
      ])
      setProducts(p); setOverrides(o); setFavs(f); setOrders(ord)
    })()
  }, [dealer?.id])

  const favProducts = products.filter(p => favs.includes(p.sku)).slice(0, 6)
  const recent = orders.slice(0, 2)
  const priceOf = (p) => nt(Math.round(tierUnitPrice({ product: p, tier, override: overrides[p.sku] })))

  return (
    <div className="space-y-5">
      {/* 招呼 */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-700 to-teal-600 p-5 text-white">
        <div className="text-xs text-teal-100">{tier ? `${tier.name}` : '經銷專屬'}</div>
        <div className="mt-1 text-xl font-bold">{dealer?.company || '經銷夥伴'}，您好</div>
        <p className="mt-1 text-sm text-teal-50/90">不必屯貨、不必養倉，選品下單一次搞定。</p>
        <Link to="/catalog" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-teal-800">
          <LayoutGrid className="h-4 w-4" />開始選品
        </Link>
      </div>

      {/* 近期訂單 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-700">近期訂單</h2>
          <Link to="/orders" className="flex items-center text-xs text-stone-400">全部 <ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-400">
            還沒有訂單，<Link to="/catalog" className="text-teal-700">立即下第一單</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(o => (
              <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4">
                <div>
                  <div className="font-mono text-sm font-bold text-stone-800">{o.order_no}</div>
                  <div className="text-xs text-stone-400">{fmtDate(o.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{statusLabel(o.status)}</span>
                  <ChevronRight className="h-4 w-4 text-stone-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 常用清單 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-stone-700"><Heart className="h-4 w-4 text-rose-400" />常用清單</h2>
          <Link to="/favorites" className="flex items-center text-xs text-stone-400">管理 <ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>
        {favProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-400">
            收藏常買品項，回購更快
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {favProducts.map(p => (
              <Link key={p.sku} to={`/product/${p.sku}`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="aspect-[4/3] bg-stone-100">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="p-2.5">
                  <div className="line-clamp-1 text-xs font-semibold text-stone-700">{p.name}</div>
                  <div className="mt-0.5 font-mono text-xs font-bold text-teal-700">{priceOf(p)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        價格當場看得到、進度自己查 —— 平常自助，有事找專員。
      </div>
    </div>
  )
}
