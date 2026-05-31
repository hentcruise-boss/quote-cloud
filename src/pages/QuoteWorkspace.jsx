import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Download, CheckCircle2, History, RefreshCw, Plus, Pencil, Trash2, GitCompare, X } from 'lucide-react'
import QuoteTab from '../features/quote/QuoteTab'
import HistoryTab from '../features/quote/HistoryTab'
import { useAuth } from '../contexts/AuthContext'
import { useSync } from '../contexts/SyncContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'
import { STAGE_MAP } from '../lib/constants'
import { nt, num } from '../lib/format'

export default function QuoteWorkspace() {
  const { id } = useParams() // caseId
  const { profile } = useAuth()
  const { run } = useSync()

  const [tab, setTab] = useState('quote')
  const [caseItem, setCaseItem] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [products, setProducts] = useState([])
  const [scenes, setScenes] = useState([])
  const [versions, setVersions] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [quoteItems, setQuoteItems] = useState([])
  const [history, setHistory] = useState([])
  const [compare, setCompare] = useState(null)
  const [loading, setLoading] = useState(true)

  const quote = versions.find(v => v.id === activeId) || null

  const loadItems = async (qid) => { if (!qid) { setQuoteItems([]); return } const { data } = await api.listQuoteItems(qid); setQuoteItems(data || []) }
  const loadHistory = async () => { const { data } = await api.listHistory(id); setHistory(data || []) }
  const loadVersions = async () => {
    const { data } = await api.getQuotesForCase(id)
    let list = data || []
    if (list.length === 0) {
      const created = await api.createQuote({ case_id: id, name: '版本 1', status: 'draft' })
      list = created.data ? [created.data] : []
    }
    setVersions(list)
    return list
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [caseRes, prod, scn] = await Promise.all([api.getCase(id), api.listProducts(), api.listScenes()])
      setCaseItem(caseRes.data || null); setProducts(prod.data || []); setScenes(scn.data || [])
      if (caseRes.data?.customer_id) {
        const { data: cu } = await api.listCustomers()
        setCustomerName((cu || []).find(c => c.id === caseRes.data.customer_id)?.name || '')
      }
      const list = await loadVersions()
      const first = list[0]?.id || null
      setActiveId(first)
      await Promise.all([loadItems(first), loadHistory()])
      setLoading(false)
    })()
  }, [id])

  useEffect(() => { if (activeId) loadItems(activeId) }, [activeId])

  useEffect(() => {
    if (!activeId) return
    const ch = supabase.channel(`rt-qi-${activeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_items', filter: `quote_id=eq.${activeId}` }, () => loadItems(activeId)).subscribe()
    return () => supabase.removeChannel(ch)
  }, [activeId])

  const totalSales = quoteItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0)
  const totalCost = quoteItems.reduce((s, i) => s + Number(i.cost) * Number(i.qty), 0)
  const totalProfit = totalSales - totalCost

  const handleAddItems = (items) => run(async () => { await api.insertQuoteItems(items.map(i => ({ ...i, quote_id: activeId }))); await loadItems(activeId) })
  const handleUpdateItem = (itemId, field, value) => run(async () => { await api.updateQuoteItem(itemId, { [field]: value }); setQuoteItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i)) })
  const handleRemoveItem = (itemId) => run(async () => { await api.deleteQuoteItem(itemId); setQuoteItems(prev => prev.filter(i => i.id !== itemId)) })

  const newVersion = () => run(async () => {
    const { data } = await api.createQuote({ case_id: id, name: `版本 ${versions.length + 1}`, status: 'draft' })
    await loadVersions(); if (data) setActiveId(data.id)
  })
  const renameVersion = () => {
    const name = prompt('版本名稱:', quote?.name || ''); if (!name) return
    return run(async () => { await api.updateQuote(activeId, { name }); await loadVersions() })
  }
  const deleteVersion = () => {
    if (versions.length <= 1) { alert('至少保留一個版本'); return }
    if (!window.confirm(`刪除「${quote?.name}」及其報價內容？`)) return
    return run(async () => {
      await supabase.from('quotes').delete().eq('id', activeId)
      const list = await loadVersions()
      setActiveId(list.filter(v => v.id !== activeId)[0]?.id || list[0]?.id || null)
    })
  }

  const openCompare = () => run(async () => {
    const rows = await Promise.all(versions.map(async v => {
      const { data } = await api.listQuoteItems(v.id)
      const items = data || []
      const sales = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0)
      const cost = items.reduce((s, i) => s + Number(i.cost) * Number(i.qty), 0)
      return { version: v, count: items.length, sales, cost, profit: sales - cost }
    }))
    setCompare(rows)
  })

  const exportCSV = async (type) => {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    const client = customerName
    const projectName = `${caseItem?.title || ''}（${quote?.name || ''}）`
    let csv = '﻿'
    csv += `客戶,${esc(client)},案件,${esc(projectName)}\n\n`
    if (type === 'client') {
      csv += ['樓層','空間','產品編號','產品名稱','規格/尺寸','材質','單價','數量','小計','備註'].join(',') + '\n'
      quoteItems.filter(i => i.qty > 0).forEach(i => { csv += [esc(i.floor),esc(i.space),esc(i.sku),esc(i.name),esc(i.spec),esc(i.material),i.price,i.qty,i.price*i.qty,esc(i.remark)].join(',') + '\n' })
      csv += `\n,,,,,,,總計 NT$,${totalSales},\n`
    } else {
      csv += ['樓層','空間','產品編號','產品名稱','規格/尺寸','材質','單價','數量','銷售小計','備註','廠商','成本','成本小計','毛利','交期','方數','重量','組裝費','物流費','工時'].join(',') + '\n'
      quoteItems.filter(i => i.qty > 0).forEach(i => { const ss = i.price*i.qty, cs = i.cost*i.qty; csv += [esc(i.floor),esc(i.space),esc(i.sku),esc(i.name),esc(i.spec),esc(i.material),i.price,i.qty,ss,esc(i.remark),esc(i.vendor),i.cost,cs,ss-cs,esc(i.lead_time),esc(i.volume),esc(i.weight),esc(i.assembly_fee),esc(i.logistics_fee),esc(i.labor_hours)].join(',') + '\n' })
      csv += `\n,,,,,,,總計 NT$,${totalSales},,,${totalCost},${totalProfit},,,,,\n`
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); a.download = `${projectName || '報價單'}_${type === 'client' ? '客戶版' : '內部版'}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a)
    await api.addHistory({ id: crypto.randomUUID(), case_id: id, project_id: null, client, project_name: projectName, type, exported_at: new Date().toISOString(), total_sales: totalSales, total_cost: totalCost, items: quoteItems.filter(i => i.qty > 0) })
    await loadHistory()
  }

  const acceptQuote = () => run(async () => {
    await api.updateQuote(activeId, { status: 'accepted' })
    await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'quote_accepted', summary: `報價已接受(${quote?.name})` })
    if (caseItem?.stage === 'presales') {
      await api.updateCase(id, { stage: 'contract' })
      setCaseItem(prev => ({ ...prev, stage: 'contract' }))
      await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'stage_changed', summary: `階段:${STAGE_MAP.presales.label} → ${STAGE_MAP.contract.label}`, meta: { from: 'presales', to: 'contract' } })
    }
    await loadVersions()
  })

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>
  if (!caseItem) return <div className="text-center text-slate-400 py-20">找不到此案件。</div>

  return (
    <div className="space-y-4">
      <Link to={`/cases/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="w-4 h-4"/>返回案件</Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-slate-400">{caseItem.code}</div>
            <h1 className="text-lg font-bold text-slate-800">{caseItem.title}</h1>
            <div className="text-xs text-slate-500 mt-0.5">{customerName || '未指定客戶'}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportCSV('client')} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"><FileSpreadsheet className="w-3.5 h-3.5"/>客戶版</button>
            <button onClick={() => exportCSV('internal')} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"><Download className="w-3.5 h-3.5"/>內部版</button>
            {quote?.status !== 'accepted' && quoteItems.length > 0 &&
              <button onClick={acceptQuote} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5"/>接受此版本 → 簽約</button>}
          </div>
        </div>

        {/* 版本控制列 */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-500">報價版本</span>
          <select value={activeId || ''} onChange={e => setActiveId(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-400">
            {versions.map(v => <option key={v.id} value={v.id}>{v.name}{v.status === 'accepted' ? ' ✓已接受' : ''}</option>)}
          </select>
          <button onClick={newVersion} title="新增版本" className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Plus className="w-4 h-4"/></button>
          <button onClick={renameVersion} title="重新命名" className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil className="w-3.5 h-3.5"/></button>
          {versions.length > 1 && <button onClick={deleteVersion} title="刪除版本" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button>}
          {versions.length > 1 && <button onClick={openCompare} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"><GitCompare className="w-3.5 h-3.5"/>版本比較</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button onClick={() => setTab('quote')} className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab === 'quote' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><FileSpreadsheet className="w-4 h-4"/>報價工具</button>
        <button onClick={() => setTab('history')} className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><History className="w-4 h-4"/>匯出歷史 ({history.length})</button>
      </div>

      {tab === 'quote'
        ? <QuoteTab products={products} scenes={scenes} quoteItems={quoteItems} onAddItems={handleAddItems} onUpdateItem={handleUpdateItem} onRemoveItem={handleRemoveItem} totalSales={totalSales} totalCost={totalCost} totalProfit={totalProfit}/>
        : <HistoryTab history={history} onDelete={async hid => { await api.deleteHistory(hid); await loadHistory() }}/>}

      {/* 版本比較 modal */}
      {compare && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setCompare(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><GitCompare className="w-4 h-4 text-slate-400"/>報價版本比較</h3>
              <button onClick={() => setCompare(null)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-3 py-2 text-left">版本</th><th className="px-3 py-2 text-right">項數</th>
                  <th className="px-3 py-2 text-right">總報價</th><th className="px-3 py-2 text-right">成本</th>
                  <th className="px-3 py-2 text-right">毛利</th><th className="px-3 py-2 text-right">毛利率</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {compare.map(r => (
                    <tr key={r.version.id} className={r.version.id === activeId ? 'bg-indigo-50/40' : ''}>
                      <td className="px-3 py-2 font-semibold text-slate-800">{r.version.name}{r.version.status === 'accepted' && <span className="ml-1 text-emerald-600 text-xs">✓</span>}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.count}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">{num(r.sales)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-500">{num(r.cost)}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600">{num(r.profit)}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.sales > 0 ? ((r.profit / r.sales) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
