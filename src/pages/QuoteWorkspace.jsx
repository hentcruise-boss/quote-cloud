import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Download, CheckCircle2, History, RefreshCw } from 'lucide-react'
import QuoteTab from '../features/quote/QuoteTab'
import HistoryTab from '../features/quote/HistoryTab'
import { useAuth } from '../contexts/AuthContext'
import { useSync } from '../contexts/SyncContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'
import { STAGE_MAP } from '../lib/constants'

export default function QuoteWorkspace() {
  const { id } = useParams() // caseId
  const { profile } = useAuth()
  const { run } = useSync()

  const [tab, setTab] = useState('quote')
  const [caseItem, setCaseItem] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [products, setProducts] = useState([])
  const [scenes, setScenes] = useState([])
  const [quote, setQuote] = useState(null)
  const [quoteItems, setQuoteItems] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const loadItems = async (quoteId) => { if (!quoteId) return; const { data } = await api.listQuoteItems(quoteId); setQuoteItems(data || []) }
  const loadHistory = async () => { const { data } = await api.listHistory(id); setHistory(data || []) }

  const ensureQuote = async () => {
    const { data } = await api.getQuotesForCase(id)
    let q = data?.[0]
    if (!q) { const created = await api.createQuote({ case_id: id, name: '報價', status: 'draft' }); q = created.data }
    setQuote(q)
    return q
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [caseRes, prod, scn] = await Promise.all([api.getCase(id), api.listProducts(), api.listScenes()])
      setCaseItem(caseRes.data || null)
      setProducts(prod.data || [])
      setScenes(scn.data || [])
      if (caseRes.data?.customer_id) {
        const { data: cu } = await api.listCustomers()
        setCustomerName((cu || []).find(c => c.id === caseRes.data.customer_id)?.name || '')
      }
      const q = await ensureQuote()
      await Promise.all([loadItems(q?.id), loadHistory()])
      setLoading(false)
    })()
  }, [id])

  // 即時同步此報價的品項
  useEffect(() => {
    if (!quote?.id) return
    const ch = supabase.channel(`rt-qi-${quote.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_items', filter: `quote_id=eq.${quote.id}` }, () => loadItems(quote.id))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [quote?.id])

  const totalSales = quoteItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0)
  const totalCost = quoteItems.reduce((s, i) => s + Number(i.cost) * Number(i.qty), 0)
  const totalProfit = totalSales - totalCost

  const handleAddItems = (items) => run(async () => {
    const withQ = items.map(i => ({ ...i, quote_id: quote.id }))
    await api.insertQuoteItems(withQ)
    await loadItems(quote.id)
  })
  const handleUpdateItem = (itemId, field, value) => run(async () => {
    await api.updateQuoteItem(itemId, { [field]: value })
    setQuoteItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i))
  })
  const handleRemoveItem = (itemId) => run(async () => {
    await api.deleteQuoteItem(itemId)
    setQuoteItems(prev => prev.filter(i => i.id !== itemId))
  })

  const exportCSV = async (type) => {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    const client = customerName
    const projectName = caseItem?.title || ''
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
    await api.updateQuote(quote.id, { status: 'accepted' })
    setQuote(prev => ({ ...prev, status: 'accepted' }))
    await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'quote_accepted', summary: '報價已接受' })
    if (caseItem?.stage === 'presales') {
      await api.updateCase(id, { stage: 'contract' })
      setCaseItem(prev => ({ ...prev, stage: 'contract' }))
      await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'stage_changed', summary: `階段:${STAGE_MAP.presales.label} → ${STAGE_MAP.contract.label}`, meta: { from: 'presales', to: 'contract' } })
    }
  })

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>
  if (!caseItem) return <div className="text-center text-slate-400 py-20">找不到此案件。</div>

  return (
    <div className="space-y-4">
      <Link to={`/cases/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="w-4 h-4"/>返回案件</Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400">{caseItem.code}</div>
          <h1 className="text-lg font-bold text-slate-800">{caseItem.title}</h1>
          <div className="text-xs text-slate-500 mt-0.5">{customerName || '未指定客戶'} · 報價狀態:{quote?.status || 'draft'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportCSV('client')} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"><FileSpreadsheet className="w-3.5 h-3.5"/>客戶版</button>
          <button onClick={() => exportCSV('internal')} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"><Download className="w-3.5 h-3.5"/>內部版</button>
          {quote?.status !== 'accepted' && quoteItems.length > 0 &&
            <button onClick={acceptQuote} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5"/>接受報價 → 簽約</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button onClick={() => setTab('quote')} className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab === 'quote' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><FileSpreadsheet className="w-4 h-4"/>報價工具</button>
        <button onClick={() => setTab('history')} className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><History className="w-4 h-4"/>匯出歷史 ({history.length})</button>
      </div>

      {tab === 'quote'
        ? <QuoteTab products={products} scenes={scenes} quoteItems={quoteItems} onAddItems={handleAddItems} onUpdateItem={handleUpdateItem} onRemoveItem={handleRemoveItem} totalSales={totalSales} totalCost={totalCost} totalProfit={totalProfit}/>
        : <HistoryTab history={history} onDelete={async hid => { await api.deleteHistory(hid); await loadHistory() }}/>}
    </div>
  )
}
