import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Minus, Plus, Check, ShoppingCart } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useCart } from '../../lib/cart'
import { fetchProduct, fetchOptions, fetchOverrides, fetchFavorites, toggleFavorite } from '../../lib/data'
import { tierUnitPrice, optionsDelta, qtyRate, unitPriceWithOptions, finalUnitPrice } from '../../lib/pricing'
import { nt, addTax } from '../../lib/format'

export default function ProductDetail() {
  const { sku } = useParams()
  const navigate = useNavigate()
  const { dealer, tier } = useAuth()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [options, setOptions] = useState([])
  const [override, setOverride] = useState(null)
  const [fav, setFav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState({})       // { group_name: option_id }
  const [qty, setQty] = useState(1)
  const [withTax, setWithTax] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [p, o, ov, f] = await Promise.all([
        fetchProduct(sku), fetchOptions(sku), fetchOverrides(dealer?.id), fetchFavorites(dealer?.id),
      ])
      setProduct(p); setOptions(o); setOverride(ov[sku] ?? null); setFav(f.includes(sku))
      // 預設選配：每組取 is_default，否則第一個
      const groups = {}
      o.forEach(opt => { if (!(opt.group_name in groups) || opt.is_default) groups[opt.group_name] = opt.id })
      setSel(groups)
      setLoading(false)
    })()
  }, [sku, dealer?.id])

  const grouped = useMemo(() => {
    const m = {}
    options.forEach(o => { (m[o.group_name] ||= []).push(o) })
    return m
  }, [options])

  const selectedOptions = useMemo(
    () => Object.values(sel).map(id => options.find(o => o.id === id)).filter(Boolean),
    [sel, options])

  if (loading) return <div className="py-20 text-center text-sm text-stone-400">載入中…</div>
  if (!product) return (
    <div className="py-20 text-center text-sm text-stone-400">
      找不到此商品。<Link to="/catalog" className="text-teal-700">回選品</Link>
    </div>
  )

  const baseUnit = Math.round(tierUnitPrice({ product, tier, override }))
  const optAdd = optionsDelta(selectedOptions)
  const rate = qtyRate(product, qty)
  const unit = finalUnitPrice({ product, tier, override, options: selectedOptions, qty })
  const lineTotal = unit * qty
  const show = (n) => nt(withTax ? addTax(n) : n)

  const onAdd = () => {
    addItem({
      sku: product.sku, name: product.name, spec: product.spec, image_url: product.image_url,
      options: selectedOptions.map(o => ({ id: o.id, group_name: o.group_name, label: o.label, price_delta: o.price_delta })),
      unitPrice: unitPriceWithOptions({ product, tier, override, options: selectedOptions }),
      qty_tiers: product.qty_tiers || [],
      qty: Number(qty),
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  const onFav = async () => { const v = !fav; setFav(v); await toggleFavorite(dealer?.id, sku, v) }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-stone-500">
        <ArrowLeft className="h-4 w-4" />返回
      </button>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="aspect-[4/3] w-full bg-stone-100">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-sm text-stone-300">無圖片</div>}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-stone-400">{product.series || product.category} · {product.sku}</div>
              <h1 className="mt-0.5 text-xl font-bold text-stone-800">{product.name}</h1>
            </div>
            <button onClick={onFav} className="rounded-full border border-stone-200 p-2">
              <Heart className={`h-5 w-5 ${fav ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
            </button>
          </div>
          {product.description && <p className="mt-3 text-sm leading-relaxed text-stone-500">{product.description}</p>}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {product.spec && <><dt className="text-stone-400">規格</dt><dd className="text-stone-700">{product.spec}</dd></>}
            {product.material && <><dt className="text-stone-400">材質</dt><dd className="text-stone-700">{product.material}</dd></>}
          </dl>
        </div>
      </div>

      {/* 選配 */}
      {Object.keys(grouped).length > 0 && (
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          {Object.entries(grouped).map(([group, opts]) => (
            <div key={group}>
              <div className="mb-2 text-sm font-semibold text-stone-700">{group}</div>
              <div className="flex flex-wrap gap-2">
                {opts.map(o => {
                  const active = sel[group] === o.id
                  return (
                    <button key={o.id} onClick={() => setSel(s => ({ ...s, [group]: o.id }))}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${active ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-stone-200 text-stone-600'}`}>
                      {o.label}
                      {Number(o.price_delta) !== 0 && (
                        <span className="ml-1 text-xs text-stone-400">{Number(o.price_delta) > 0 ? '+' : ''}{nt(o.price_delta)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 數量階梯 */}
      {product.qty_tiers?.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-2 text-sm font-semibold text-stone-700">數量優惠</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {product.qty_tiers.map((t, i) => (
              <span key={i} className={`rounded-lg px-2.5 py-1 ${qty >= t.min_qty ? 'bg-teal-700 text-white' : 'bg-stone-100 text-stone-500'}`}>
                滿 {t.min_qty} 件 · {Math.round((1 - t.rate) * 100)}% off
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 價格與加入 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">您的專屬價</span>
          <button onClick={() => setWithTax(v => !v)} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500">
            {withTax ? '含稅' : '未稅'} · 切換
          </button>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-extrabold text-teal-700">{show(unit)}</span>
          <span className="text-xs text-stone-400">/ 件{rate < 1 && '（已含數量優惠）'}</span>
        </div>
        <div className="mt-1 text-xs text-stone-400">
          基礎 {nt(baseUnit)}{optAdd !== 0 && ` ＋選配 ${nt(optAdd)}`}（未稅）
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-stone-500">數量</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="rounded-full border border-stone-200 p-1.5"><Minus className="h-4 w-4" /></button>
            <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 rounded-lg border border-stone-200 py-1.5 text-center text-sm" />
            <button onClick={() => setQty(q => q + 1)} className="rounded-full border border-stone-200 p-1.5"><Plus className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
          <span className="text-sm text-stone-500">小計</span>
          <span className="font-mono text-lg font-bold text-stone-800">{show(lineTotal)}</span>
        </div>

        <button onClick={onAdd}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition ${added ? 'bg-emerald-600' : 'bg-teal-700 hover:bg-teal-800'}`}>
          {added ? <><Check className="h-5 w-5" />已加入訂單</> : <><ShoppingCart className="h-5 w-5" />加入訂單</>}
        </button>
      </div>
    </div>
  )
}
