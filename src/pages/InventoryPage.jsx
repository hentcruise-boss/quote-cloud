import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, RefreshCw, X, Settings, Plus, ArrowLeftRight, ShoppingCart } from 'lucide-react'
import { useSync } from '../contexts/SyncContext'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'

function AdjustModal({ product, warehouseName, onClose, onApply }) {
  const [sign, setSign] = useState(1)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [batch, setBatch] = useState('')
  const apply = () => { const d = (Number(qty) || 0) * sign; if (!d) return; onApply(d, reason, batch) }
  const btn = (s, label, cls) => (
    <button onClick={() => setSign(s)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${sign === s ? cls : 'border-slate-200 text-slate-500'}`}>{label}</button>
  )
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">庫存調整 — {product.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-slate-400">倉庫:<span className="font-semibold text-slate-600">{warehouseName}</span></p>
          <div className="flex gap-2">
            {btn(1, '入庫 (+)', 'border-emerald-500 bg-emerald-50 text-emerald-700')}
            {btn(-1, '出庫 (−)', 'border-rose-500 bg-rose-50 text-rose-700')}
          </div>
          <label className="block text-xs text-slate-400">數量<input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"/></label>
          <label className="block text-xs text-slate-400">原因 / 備註<input value={reason} onChange={e => setReason(e.target.value)} placeholder="進貨 / 出貨 / 盤點 / 調撥…" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"/></label>
          <label className="block text-xs text-slate-400">批號 / 序號(可選)<input value={batch} onChange={e => setBatch(e.target.value)} placeholder="例:LOT-2026-001 / SN…" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"/></label>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
          <button onClick={apply} disabled={!qty} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">確認調整</button>
        </div>
      </div>
    </div>
  )
}

function ManageModal({ warehouses, companies, onClose, onAdd, onToggle, onSetCompany }) {
  const [name, setName] = useState('')
  const [companyId, setCompanyId] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">倉庫管理</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-2 max-h-72 overflow-y-auto">
          {warehouses.map(w => (
            <div key={w.id} className="flex items-center justify-between gap-2 text-sm border-b border-slate-50 pb-2">
              <span className="text-slate-700 flex-shrink-0">{w.name}{w.is_default && <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">預設</span>}</span>
              <div className="flex items-center gap-2">
                <select value={w.company_id || ''} onChange={e => onSetCompany(w, e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">未指定公司</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => onToggle(w)} className={`text-xs ${w.active ? 'text-emerald-600' : 'text-slate-400'}`}>{w.active ? '啟用中' : '已停用'}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="新倉庫名稱" className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"/>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none">
            <option value="">未指定公司</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => { if (name.trim()) { onAdd(name.trim(), companyId || null); setName('') } }} className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"><Plus className="w-4 h-4"/>新增倉</button>
        </div>
      </div>
    </div>
  )
}

function MovementsModal({ product, warehouseName, moves, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">異動明細 — {product.name} <span className="text-xs font-normal text-slate-400">({warehouseName})</span></h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
          {moves.length === 0 && <div className="py-8 text-center text-slate-300 text-sm">無異動紀錄</div>}
          {moves.map(m => (
            <div key={m.id} className="px-6 py-2.5 flex items-center justify-between text-sm">
              <div className="min-w-0">
                <span className="text-slate-600">{m.reason || '異動'}</span>
                {m.batch_no && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">批號 {m.batch_no}</span>}
                <div className="text-[11px] text-slate-400">{new Date(m.created_at).toLocaleString('zh-TW')}</div>
              </div>
              <span className={`font-mono font-bold ${m.delta < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{m.delta > 0 ? '+' : ''}{m.delta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const { run } = useSync()
  const { profile, role } = useAuth()
  const [companies, setCompanies] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [currentWh, setCurrentWh] = useState('')
  const [products, setProducts] = useState([])
  const [inv, setInv] = useState([])
  const [search, setSearch] = useState('')
  const [adjust, setAdjust] = useState(null)
  const [manage, setManage] = useState(false)
  const [detail, setDetail] = useState(null)
  const [moves, setMoves] = useState([])
  const [loading, setLoading] = useState(true)

  const loadWarehouses = async () => { const { data } = await api.listWarehouses(); setWarehouses(data || []); return data || [] }
  const loadInv = async (wh) => { if (!wh) return; const { data } = await api.listInventory(wh); setInv(data || []) }

  useEffect(() => {
    (async () => {
      const [whs] = await Promise.all([
        loadWarehouses(),
        api.listCompanies().then(r => setCompanies(r.data || [])),
        api.listProducts().then(r => setProducts(r.data || [])),
      ])
      const def = whs.find(w => w.is_default) || whs[0]
      if (def) { setCurrentWh(def.id); await loadInv(def.id) }
      setLoading(false)
    })()
    const ch = supabase.channel('rt-inventory').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => setCurrentWh(w => { loadInv(w); return w })).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  useEffect(() => { if (currentWh) loadInv(currentWh) }, [currentWh])

  const companyName = Object.fromEntries(companies.map(c => [c.id, c.name]))
  const whLabel = (w) => (w.company_id ? `${companyName[w.company_id]} · ` : '') + w.name
  const currentWhName = whLabel(warehouses.find(w => w.id === currentWh) || { name: '' })
  const invMap = Object.fromEntries(inv.map(i => [i.sku, i]))
  const rows = products
    .map(p => ({ sku: p.sku, name: p.name, on_hand: invMap[p.sku]?.on_hand ?? 0, reorder_point: invMap[p.sku]?.reorder_point ?? 0 }))
    .filter(p => !search || p.sku.toLowerCase().includes(search.toLowerCase()) || p.name.includes(search))

  const applyAdjust = (delta, reason, batch) => run(async () => {
    const { error } = await api.addStockMovement({ sku: adjust.sku, delta, reason: reason || null, batch_no: batch || null, warehouse_id: currentWh, created_by: profile?.id })
    if (error) { alert(error.message || '異動失敗(可能庫存不足)'); return }
    setAdjust(null); await loadInv(currentWh)
  })
  const openDetail = async (p) => { const { data } = await api.listStockMovements(p.sku, currentWh); setMoves(data || []); setDetail(p) }
  const setReorder = (sku, val) => run(async () => { await api.upsertReorderPoint(sku, currentWh, Number(val) || 0); await loadInv(currentWh) })
  const addWarehouse = (name, company_id) => run(async () => { await api.createWarehouse({ name, company_id }); await loadWarehouses() })
  const toggleWarehouse = (w) => run(async () => { await api.updateWarehouse(w.id, { active: !w.active }); await loadWarehouses() })
  const setWhCompany = (w, cid) => run(async () => { await api.updateWarehouse(w.id, { company_id: cid || null }); await loadWarehouses() })

  const statusOf = (p) => {
    if (p.on_hand <= 0) return { label: '缺貨', cls: 'bg-rose-50 text-rose-700' }
    if (p.reorder_point > 0 && p.on_hand <= p.reorder_point) return { label: '低於安全量', cls: 'bg-amber-50 text-amber-700' }
    return { label: '正常', cls: 'bg-emerald-50 text-emerald-700' }
  }

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-4">
      {adjust && <AdjustModal product={adjust} warehouseName={currentWhName} onClose={() => setAdjust(null)} onApply={applyAdjust}/>}
      {manage && <ManageModal warehouses={warehouses} companies={companies} onClose={() => setManage(false)} onAdd={addWarehouse} onToggle={toggleWarehouse} onSetCompany={setWhCompany}/>}
      {detail && <MovementsModal product={detail} warehouseName={currentWhName} moves={moves} onClose={() => setDetail(null)}/>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Boxes className="w-5 h-5 text-indigo-500"/>庫存管理</h1>
        <div className="flex items-center gap-2">
          <select value={currentWh} onChange={e => setCurrentWh(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400">
            {warehouses.filter(w => w.active || w.id === currentWh).map(w => <option key={w.id} value={w.id}>{whLabel(w)}</option>)}
          </select>
          <Link to="/transfers" className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeftRight className="w-4 h-4"/>倉間調撥</Link>
          <Link to="/purchases" className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"><ShoppingCart className="w-4 h-4"/>採購單</Link>
          {role === 'admin' && <button onClick={() => setManage(true)} title="倉庫管理" className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Settings className="w-4 h-4"/></button>}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋 SKU / 名稱…" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"/>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 text-left font-semibold w-24">SKU</th>
            <th className="px-4 py-3 text-left font-semibold">產品名稱</th>
            <th className="px-4 py-3 text-right font-semibold w-20">在庫</th>
            <th className="px-4 py-3 text-right font-semibold w-28">安全庫存</th>
            <th className="px-4 py-3 text-center font-semibold w-28">狀態</th>
            <th className="px-4 py-3 w-20"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(p => {
              const st = statusOf(p)
              return (
                <tr key={p.sku} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{p.on_hand}</td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" min="0" defaultValue={p.reorder_point} key={`${currentWh}-${p.sku}-${p.reorder_point}`} onBlur={e => Number(e.target.value) !== p.reorder_point && setReorder(p.sku, e.target.value)}
                      className="w-16 text-right border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400"/>
                  </td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openDetail(p)} className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-indigo-600">明細</button>
                    <button onClick={() => setAdjust(p)} className="ml-1 px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">調整</button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan="6" className="py-12 text-center text-slate-400 text-sm">找不到產品</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">在庫量依所選倉庫顯示;出入庫調整、出貨扣庫存都記在 stock_movements,可追溯。</p>
    </div>
  )
}
