import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Heart, ChevronRight, TrendingUp, TrendingDown, Banknote, Boxes, Package, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchProducts, fetchOverrides, fetchFavorites, fetchOrders, fetchDealerDashboard } from '../../lib/data'
import { fetchAnnouncements } from '../../lib/marketing'
import { tierUnitPrice } from '../../lib/pricing'
import { nt, fmtDate } from '../../lib/format'
import { statusLabel } from '../../lib/status'
import { ORDER_MODES, orderModeLabel } from '../../lib/filters'
import ContainerCountdown from '../ContainerCountdown'

const ANN_STYLE = {
  promo: 'border-amber-300 bg-amber-50 text-amber-900',
  alert: 'border-rose-300 bg-rose-50 text-rose-900',
  info:  'border-teal-300 bg-teal-50 text-teal-900',
}

function Announcements({ list }) {
  if (!list.length) return null
  return (
    <div className="space-y-2">
      {list.slice(0, 3).map(a => {
        const inner = (
          <div className={`rounded-2xl border p-4 ${ANN_STYLE[a.kind] || ANN_STYLE.info}`}>
            <div className="flex items-center gap-2">
              {a.kind === 'promo' && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">促銷</span>}
              <div className="text-sm font-bold">{a.title}</div>
            </div>
            {a.body && <div className="mt-1 text-xs leading-relaxed opacity-80">{a.body}</div>}
          </div>
        )
        return a.link
          ? <Link key={a.id} to={a.link} className="block transition active:scale-[0.99]">{inner}</Link>
          : <div key={a.id}>{inner}</div>
      })}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, href, tone = 'default' }) {
  const toneCls = {
    default: 'border-stone-200 bg-white',
    amber:   'border-amber-300 bg-amber-50',
    teal:    'border-teal-300 bg-teal-50',
    rose:    'border-rose-300 bg-rose-50',
  }[tone]
  const iconCls = {
    default: 'text-stone-400',
    amber:   'text-amber-600',
    teal:    'text-teal-600',
    rose:    'text-rose-500',
  }[tone]
  const inner = (
    <div className={`rounded-2xl border p-4 ${toneCls}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-500">{label}</span>
        <Icon className={`h-4 w-4 ${iconCls}`} />
      </div>
      <div className="mt-1.5 font-mono text-xl font-extrabold leading-tight text-stone-800">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-stone-400">{sub}</div>}
    </div>
  )
  return href ? <Link to={href} className="block transition active:scale-[0.98]">{inner}</Link> : inner
}

function Delta({ now, prev }) {
  if (!prev || prev === 0) return null
  const pct = Math.round(((now - prev) / prev) * 100)
  if (pct === 0) return <span className="text-stone-400">持平</span>
  const up = pct > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      <Icon className="h-3 w-3" />{up ? '+' : ''}{pct}%
    </span>
  )
}

function ModeBreakdown({ data }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0)
  if (total === 0) return (
    <div className="py-6 text-center text-xs text-stone-400">本月尚無訂單</div>
  )
  return (
    <div className="space-y-2">
      {ORDER_MODES.map(m => {
        const n = data[m.key] || 0
        const pct = total > 0 ? Math.round((n / total) * 100) : 0
        return (
          <div key={m.key}>
            <div className="mb-0.5 flex items-center justify-between text-xs">
              <span className="text-stone-600">{m.label}</span>
              <span className="font-mono text-stone-500">{n} 筆 · {pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Home() {
  const { dealer, tier } = useAuth()
  const [products, setProducts] = useState([])
  const [overrides, setOverrides] = useState({})
  const [favs, setFavs] = useState([])
  const [orders, setOrders] = useState([])
  const [dash, setDash] = useState(null)
  const [anns, setAnns] = useState([])

  useEffect(() => {
    (async () => {
      const [p, o, f, ord, d, a] = await Promise.all([
        fetchProducts(), fetchOverrides(dealer?.id), fetchFavorites(dealer?.id), fetchOrders(dealer?.id), fetchDealerDashboard(dealer?.id), fetchAnnouncements(),
      ])
      setProducts(p); setOverrides(o); setFavs(f); setOrders(ord); setDash(d); setAnns(a)
    })()
  }, [dealer?.id])

  const favProducts = products.filter(p => favs.includes(p.sku)).slice(0, 6)
  const recent = orders.slice(0, 2)
  const priceOf = (p) => nt(Math.round(tierUnitPrice({ product: p, tier, override: overrides[p.sku] })))

  const monthLabel = `${new Date().getMonth() + 1} 月`

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

      {/* 本週櫃截單倒數（每周一櫃） */}
      <ContainerCountdown linkToCatalog />

      {/* 公告 / 行銷 Banner */}
      <Announcements list={anns} />

      {/* 待收款警示 */}
      {dash?.awaitingPayment.count > 0 && (
        <Link to="/orders" className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
            <div>
              <div className="text-sm font-bold text-amber-900">您有 {dash.awaitingPayment.count} 筆訂單待付款</div>
              <div className="text-xs text-amber-800">應付總額 {nt(dash.awaitingPayment.total)}　請儘速完成匯款</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-700" />
        </Link>
      )}

      {/* KPI cards */}
      {dash && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard
            icon={Package} label={`${monthLabel}下單`} tone="teal"
            value={nt(dash.thisMonth.total)} sub={`${dash.thisMonth.count} 筆`} href="/orders"
          />
          <StatCard
            icon={Banknote} label="待收款" tone={dash.awaitingPayment.count > 0 ? 'amber' : 'default'}
            value={nt(dash.awaitingPayment.total)} sub={`${dash.awaitingPayment.count} 筆`} href="/orders"
          />
          <StatCard
            icon={Banknote} label="未結對帳" tone={dash.outstanding > 0 ? 'rose' : 'default'}
            value={nt(dash.outstanding)} sub="月結帳款" href="/billing"
          />
          <StatCard
            icon={Boxes} label="代管庫存"
            value={dash.inventory.totalQty + ' 件'} sub={`${dash.inventory.skuCount} 個品項`} href="/inventory"
          />
        </div>
      )}

      {/* 本月 vs 上月 + 下單方式分佈 */}
      {dash && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">與上月比較</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-stone-500">金額</span>
                <span><span className="font-mono font-bold text-stone-800">{nt(dash.thisMonth.total)}</span>　<Delta now={dash.thisMonth.total} prev={dash.lastMonth.total} /></span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-stone-500">筆數</span>
                <span><span className="font-mono font-bold text-stone-800">{dash.thisMonth.count}</span>　<Delta now={dash.thisMonth.count} prev={dash.lastMonth.count} /></span>
              </div>
              <div className="border-t border-stone-100 pt-2 text-[10px] text-stone-400">
                上月：{nt(dash.lastMonth.total)} · {dash.lastMonth.count} 筆
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">{monthLabel}下單方式</div>
            <ModeBreakdown data={dash.modeBreakdown} />
          </div>
        </div>
      )}

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
                  <div className="text-xs text-stone-400">{fmtDate(o.created_at)} · {orderModeLabel(o.order_mode || 'cash')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.status === 'awaiting_payment' ? 'bg-amber-50 text-amber-700' : o.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-teal-700'}`}>{statusLabel(o.status)}</span>
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
    </div>
  )
}
