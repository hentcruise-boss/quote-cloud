import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchProducts, fetchOverrides, fetchFavorites, toggleFavorite } from '../../lib/data'
import { tierUnitPrice } from '../../lib/pricing'
import { nt } from '../../lib/format'

export default function Favorites() {
  const { dealer, tier } = useAuth()
  const [products, setProducts] = useState([])
  const [overrides, setOverrides] = useState({})
  const [favs, setFavs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [p, o, f] = await Promise.all([fetchProducts(), fetchOverrides(dealer?.id), fetchFavorites(dealer?.id)])
      setProducts(p); setOverrides(o); setFavs(f); setLoading(false)
    })()
  }, [dealer?.id])

  const list = products.filter(p => favs.includes(p.sku))
  const remove = async (sku) => { setFavs(prev => prev.filter(s => s !== sku)); await toggleFavorite(dealer?.id, sku, false) }
  const priceOf = (p) => nt(Math.round(tierUnitPrice({ product: p, tier, override: overrides[p.sku] })))

  if (loading) return <div className="py-20 text-center text-sm text-stone-400">載入中…</div>

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-800">常用清單</h1>
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="text-sm text-stone-400">還沒有收藏品項</p>
          <Link to="/catalog" className="mt-3 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">去選品</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(p => (
            <div key={p.sku} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3">
              <Link to={`/product/${p.sku}`} className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
              </Link>
              <Link to={`/product/${p.sku}`} className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-stone-800">{p.name}</div>
                <div className="text-xs text-stone-400">{p.series || p.category}</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-teal-700">{priceOf(p)}</div>
              </Link>
              <button onClick={() => remove(p.sku)} className="rounded-full border border-stone-200 p-2">
                <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
              </button>
              <Link to={`/product/${p.sku}`} className="rounded-full p-1 text-stone-300"><ChevronRight className="h-4 w-4" /></Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
