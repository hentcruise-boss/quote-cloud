import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Edit2, X, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Settings, Wand2, ClipboardList, FolderInput, CheckCircle2, Circle } from 'lucide-react'
import { supabase } from './supabase'

// ── 日期工具（全部用本地時間分量，避免 toISOString 造成時區偏移）──
const pad2 = n => String(n).padStart(2,'0')
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
const parseYmd = s => { const [y,m,dd]=String(s).split('-').map(Number); return new Date(y,m-1,dd) }
const addDays = (d,n) => new Date(d.getFullYear(), d.getMonth(), d.getDate()+n)
const todayYmd = () => ymd(new Date())
const buildMonthGrid = (y,m) => { // 週一開頭，固定 42 格
  const first=new Date(y,m,1), offset=(first.getDay()+6)%7, start=addDays(first,-offset), t=todayYmd()
  return Array.from({length:42},(_,i)=>{ const d=addDays(start,i); const k=ymd(d)
    return { ymd:k, day:d.getDate(), inMonth:d.getMonth()===m, isToday:k===t, isWeekend:d.getDay()===0||d.getDay()===6 } })
}
const round2 = n => Math.round(Number(n||0)*100)/100
const fmtNTD = n => 'NT$ '+Number(n||0).toLocaleString()
const fmtWan = n => `${round2(Number(n||0)/10000).toLocaleString()}萬`

const EVENT_TYPES = {
  assembly:  { label:'組裝', chip:'bg-emerald-100 text-emerald-800 border-emerald-200', dot:'bg-emerald-500' },
  logistics: { label:'物流', chip:'bg-sky-100 text-sky-800 border-sky-200',             dot:'bg-sky-500' },
  container: { label:'貨櫃', chip:'bg-violet-100 text-violet-800 border-violet-200',    dot:'bg-violet-500' },
}
const ORDER_STATUS = ['待排期','排期中','已完成']
const DOC_FIELDS = [['doc_confirmation','確認書'],['doc_layout','定位圖'],['doc_quotation','報價單'],['doc_contract','合同']]
const DEFAULT_SETTINGS = { daily_output_per_worker:100000, volume_per_vehicle:10 }
const EMPTY_ORDER = { project_id:null, client:'', name:'', amount:0, volume:0, doc_confirmation:false, doc_layout:false, doc_quotation:false, doc_contract:false, install_date:null, status:'待排期', remark:'' }

function Field({ label, value, onChange, type='text', disabled=false, mono=false, placeholder='' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
      <input type={type} value={value??''} onChange={e=>onChange(e.target.value)} disabled={disabled} placeholder={placeholder}
        className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 bg-white ${mono?'font-mono':''}`}/>
    </div>
  )
}

function Modal({ title, onClose, children, footer, maxW='max-w-xl' }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[92vh] flex flex-col`}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">{children}</div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  )
}

function ProgressBar({ label, planned, needed, unit }) {
  const has=needed>0, pct=has?Math.min(100,planned/needed*100):0, done=has&&planned>=needed
  return (
    <div>
      <div className="flex justify-between items-baseline text-[10px] mb-0.5">
        <span className="text-slate-400">{label}</span>
        {has?<span className={`font-mono font-bold ${done?'text-emerald-600':'text-amber-600'}`}>{round2(planned)} / {round2(needed)} {unit}</span>:<span className="text-slate-300">—</span>}
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${done?'bg-emerald-500':'bg-amber-400'}`} style={{width:pct+'%'}}/></div>
    </div>
  )
}

function DocChecklist({ order, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1">
      {DOC_FIELDS.map(([k,label])=>(
        <button key={k} type="button" onClick={e=>{e.stopPropagation();onToggle(k)}}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${order[k]?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}>
          {order[k]?<CheckCircle2 className="w-3 h-3"/>:<Circle className="w-3 h-3"/>}{label}
        </button>
      ))}
    </div>
  )
}

function Legend() {
  return <div className="flex items-center gap-3 text-[11px] text-slate-500">{Object.entries(EVENT_TYPES).map(([k,t])=><span key={k} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${t.dot}`}/>{t.label}</span>)}</div>
}

function OrderModal({ mode, order, projects, settings, computeFromProject, onSave, onClose }) {
  const isEdit = mode==='edit'
  const [form, setForm] = useState(isEdit?{...order}:{...EMPTY_ORDER})
  const [saving, setSaving] = useState(false)
  const [calcing, setCalcing] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const output=Number(settings.daily_output_per_worker)||0, perVeh=Number(settings.volume_per_vehicle)||0
  const needWD=output>0?Math.ceil((Number(form.amount)||0)/output):0
  const needVeh=perVeh>0?Math.ceil((Number(form.volume)||0)/perVeh):0
  const pickProject = async pid => {
    if(!pid){set('project_id',null);return}
    setCalcing(true)
    const p=projects.find(x=>x.id===pid)
    const {amount,volume}=await computeFromProject(pid)
    setForm(f=>({...f,project_id:pid,client:p?.client||'',name:p?.name||'',amount,volume}))
    setCalcing(false)
  }
  const handleSave = async () => {
    if(!form.name&&!form.client){alert('請至少填寫客戶或訂單名稱');return}
    setSaving(true)
    const o={...form,amount:Number(form.amount)||0,volume:Number(form.volume)||0,install_date:form.install_date||null}
    if(!isEdit){o.id=crypto.randomUUID();o.created_at=new Date().toISOString()}
    await onSave(o); setSaving(false)
  }
  return (
    <Modal title={isEdit?`編輯訂單 — ${order.name||order.client||''}`:mode==='from-project'?'從報價專案帶入訂單':'新增成交訂單'} onClose={onClose} maxW="max-w-2xl"
      footer={<>
        <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
        <button onClick={handleSave} disabled={saving||calcing} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{saving?'儲存中…':isEdit?'儲存修改':'建立訂單'}</button>
      </>}>
      {mode==='from-project'&&(
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wide">選擇報價專案（自動帶入客戶／名稱／金額／方數）</label>
          <select value={form.project_id||''} onChange={e=>pickProject(e.target.value)} className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">— 選擇專案 —</option>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name||'未命名'}（{p.client||'未填客戶'}）</option>)}
          </select>
          {calcing&&<p className="text-xs text-indigo-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/>計算金額與方數中…</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="客戶" value={form.client} onChange={v=>set('client',v)}/>
        <Field label="訂單名稱" value={form.name} onChange={v=>set('name',v)}/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Field label="金額 NT$" type="number" value={form.amount} onChange={v=>set('amount',v)} mono/>
          <p className="text-[11px] text-slate-400 mt-1">＝{fmtWan(form.amount)}｜約需 <b className="text-slate-600">{needWD}</b> 人天（每人日產值 {fmtNTD(output)}）</p>
        </div>
        <div>
          <Field label="方數 m³" type="number" value={form.volume} onChange={v=>set('volume',v)} mono/>
          <p className="text-[11px] text-slate-400 mt-1">約需 <b className="text-slate-600">{needVeh}</b> 車（每車 {perVeh} 方）</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="預計交裝日" type="date" value={form.install_date||''} onChange={v=>set('install_date',v)}/>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">狀態</label>
          <select value={form.status} onChange={e=>set('status',e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400">
            {ORDER_STATUS.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">原始資料確認（勾齊代表資料齊全、可排期）</label>
        <div className="grid grid-cols-4 gap-2">
          {DOC_FIELDS.map(([k,label])=>(
            <label key={k} className={`flex items-center justify-center gap-1.5 border rounded-lg px-2 py-2 text-xs font-medium cursor-pointer transition ${form[k]?'border-emerald-300 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              <input type="checkbox" className="accent-emerald-600" checked={!!form[k]} onChange={e=>set(k,e.target.checked)}/>{label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">備註</label>
        <textarea value={form.remark??''} onChange={e=>set('remark',e.target.value)} placeholder="備註／雲端資料連結…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-indigo-400"/>
      </div>
    </Modal>
  )
}

function AutoPlanModal({ order, settings, existingCount, onConfirm, onClose }) {
  const amount=Number(order.amount)||0, volume=Number(order.volume)||0
  const output=Number(settings.daily_output_per_worker)||0, perVeh=Number(settings.volume_per_vehicle)||0
  const neededWD=output>0?Math.ceil(amount/output):0
  const neededVeh=perVeh>0?Math.ceil(volume/perVeh):0
  const [withAsm,setWithAsm]=useState(neededWD>0)
  const [asmStart,setAsmStart]=useState(todayYmd())
  const [perDay,setPerDay]=useState(4)
  const [skip,setSkip]=useState('none')
  const [withLog,setWithLog]=useState(neededVeh>0)
  const [logMode,setLogMode]=useState('single')
  const [logDate,setLogDate]=useState(todayYmd())
  const [logPerDay,setLogPerDay]=useState(1)
  const [saving,setSaving]=useState(false)

  const skipHit=d=>{const w=d.getDay();return (skip==='sun'&&w===0)||(skip==='weekend'&&(w===0||w===6))}
  const asmEvents=useMemo(()=>{
    if(!withAsm||neededWD<=0||!asmStart)return[]
    const per=Math.max(1,Math.floor(Number(perDay)||0)); const evs=[]; let rem=neededWD,d=parseYmd(asmStart),g=0
    while(rem>0&&g<730){g++; if(skipHit(d)){d=addDays(d,1);continue} const w=Math.min(per,rem); evs.push({date:ymd(d),workers:w}); rem-=w; d=addDays(d,1)}
    return evs
  },[withAsm,neededWD,asmStart,perDay,skip])
  const logEvents=useMemo(()=>{
    if(!withLog||neededVeh<=0||!logDate)return[]
    if(logMode==='single')return[{date:logDate,vehicles:neededVeh,volume:round2(volume)}]
    const per=Math.max(1,Math.floor(Number(logPerDay)||0)); const evs=[]; let remV=neededVeh,remVol=volume,d=parseYmd(logDate),g=0
    while(remV>0&&g<730){g++; if(skipHit(d)){d=addDays(d,1);continue} const v=Math.min(per,remV); const vol=round2(Math.min(remVol,v*perVeh)); evs.push({date:ymd(d),vehicles:v,volume:vol}); remV-=v; remVol=round2(remVol-vol); d=addDays(d,1)}
    return evs
  },[withLog,neededVeh,logMode,logDate,logPerDay,volume,perVeh,skip])
  const total=asmEvents.length+logEvents.length
  const lastAsm=asmEvents[asmEvents.length-1]

  const handleConfirm=async()=>{
    const now=new Date().toISOString()
    const list=[
      ...asmEvents.map(e=>({id:crypto.randomUUID(),order_id:order.id,type:'assembly',date:e.date,workers:e.workers,vehicles:null,volume:null,note:'',created_at:now})),
      ...logEvents.map(e=>({id:crypto.randomUUID(),order_id:order.id,type:'logistics',date:e.date,workers:null,vehicles:e.vehicles,volume:e.volume,note:'',created_at:now})),
    ]
    setSaving(true); await onConfirm(list); setSaving(false)
  }
  return (
    <Modal title={`自動排期 — ${order.client?order.client+' ':''}${order.name||''}`} onClose={onClose} maxW="max-w-2xl"
      footer={<>
        <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
        <button onClick={handleConfirm} disabled={total===0||saving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">{saving?'排期中…':`確認排期（共 ${total} 筆）`}</button>
      </>}>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-sm">
        <span className="font-mono font-bold text-slate-700">{fmtNTD(amount)}<span className="text-slate-400 font-normal">（{fmtWan(amount)}）</span></span>
        <span className="font-mono text-slate-600">{round2(volume)} 方</span>
        <label className="flex items-center gap-2 text-xs text-slate-500">跳過
          <select value={skip} onChange={e=>setSkip(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white outline-none">
            <option value="none">不跳過</option><option value="sun">週日</option><option value="weekend">週六日</option>
          </select>
        </label>
      </div>
      {existingCount>0&&<div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0"/>此訂單已有 {existingCount} 筆排程，本次將另外新增（不覆蓋）。</div>}

      <div className={`border-l-4 rounded-xl border border-slate-200 p-4 space-y-3 ${withAsm?'border-l-emerald-500':'border-l-slate-200 opacity-70'}`}>
        <label className="flex items-center gap-2 font-semibold text-sm text-slate-800 cursor-pointer">
          <input type="checkbox" className="accent-emerald-600" checked={withAsm} disabled={neededWD<=0} onChange={e=>setWithAsm(e.target.checked)}/>組裝人力
        </label>
        {neededWD<=0?(
          <p className="text-xs text-slate-400">{amount<=0?'訂單金額為 0，無法換算人天，請先填金額。':'每人日產值設定無效，請先到「設定」修正。'}</p>
        ):(<>
          <div className="grid grid-cols-2 gap-4">
            <Field label="開始日" type="date" value={asmStart} onChange={setAsmStart}/>
            <Field label="每天人數" type="number" value={perDay} onChange={setPerDay} mono/>
          </div>
          {withAsm&&asmEvents.length>0&&(
            <p className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg px-3 py-2 leading-relaxed">
              需求 {fmtWan(amount)} ÷ {fmtWan(output)}/人天 ＝ <b>{neededWD} 人天</b> → 每天 {Math.max(1,Math.floor(Number(perDay)||0))} 人，共 <b>{asmEvents.length} 天</b>（{asmEvents[0].date} ～ {lastAsm.date}{lastAsm.workers!==asmEvents[0].workers?`，末日 ${lastAsm.workers} 人`:''}）
            </p>
          )}
        </>)}
      </div>

      <div className={`border-l-4 rounded-xl border border-slate-200 p-4 space-y-3 ${withLog?'border-l-sky-500':'border-l-slate-200 opacity-70'}`}>
        <label className="flex items-center gap-2 font-semibold text-sm text-slate-800 cursor-pointer">
          <input type="checkbox" className="accent-sky-600" checked={withLog} disabled={neededVeh<=0} onChange={e=>setWithLog(e.target.checked)}/>物流車輛
        </label>
        {neededVeh<=0?(
          <p className="text-xs text-slate-400">{volume<=0?'訂單方數為 0，無法換算車次，請先填方數。':'每車方數設定無效，請先到「設定」修正。'}</p>
        ):(<>
          <div className="flex gap-2">
            {[['single','集中一天'],['daily','每天固定車數']].map(([v,l])=>(
              <button key={v} type="button" onClick={()=>setLogMode(v)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${logMode===v?'bg-sky-600 text-white border-sky-600':'bg-white text-slate-500 border-slate-200 hover:border-sky-300'}`}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={logMode==='single'?'日期':'開始日'} type="date" value={logDate} onChange={setLogDate}/>
            {logMode==='daily'&&<Field label="每天車數" type="number" value={logPerDay} onChange={setLogPerDay} mono/>}
          </div>
          {withLog&&logEvents.length>0&&(
            <p className="text-xs bg-sky-50 text-sky-800 border border-sky-100 rounded-lg px-3 py-2 leading-relaxed">
              {round2(volume)} 方 ÷ 每車 {perVeh} 方 ＝ <b>{neededVeh} 車</b>{logMode==='daily'?<> → 共 <b>{logEvents.length} 天</b>（{logEvents[0].date} ～ {logEvents[logEvents.length-1].date}）</>:<>，安排於 {logDate}</>}
            </p>
          )}
        </>)}
      </div>
      <p className="text-[11px] text-slate-400">貨櫃到櫃時間請直接在日曆上點日期新增「貨櫃」事件（可填櫃號與方數）。</p>
    </Modal>
  )
}

function EventModal({ initial, orders, onSave, onDelete, onClose }) {
  const isEdit=!!initial.id
  const [form,setForm]=useState(isEdit?{...initial}:{order_id:orders[0]?.id||'',type:'assembly',date:initial.date||todayYmd(),workers:1,vehicles:1,volume:'',note:''})
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const handleSave=async()=>{
    if(!form.order_id){alert('請選擇訂單');return}
    if(!form.date){alert('請選擇日期');return}
    setSaving(true)
    const ev={ id:isEdit?form.id:crypto.randomUUID(), order_id:form.order_id, type:form.type, date:form.date,
      workers:form.type==='assembly'?Math.max(0,Math.floor(Number(form.workers)||0)):null,
      vehicles:form.type==='logistics'?Math.max(0,Math.floor(Number(form.vehicles)||0)):null,
      volume:(form.type==='logistics'||form.type==='container')?(Number(form.volume)||null):null,
      note:form.note||'', created_at:isEdit?form.created_at:new Date().toISOString() }
    await onSave(ev); setSaving(false)
  }
  return (
    <Modal title={isEdit?'編輯排程':'新增排程'} onClose={onClose}
      footer={<>
        {isEdit&&<button onClick={()=>onDelete(form.id)} className="mr-auto px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5"/>刪除</button>}
        <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{saving?'儲存中…':'儲存'}</button>
      </>}>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">訂單</label>
        <select value={form.order_id} onChange={e=>set('order_id',e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400">
          {!form.order_id&&<option value="">— 選擇訂單 —</option>}
          {orders.map(o=><option key={o.id} value={o.id}>{o.client?o.client+' — ':''}{o.name||'未命名訂單'}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">類型</label>
        <div className="flex gap-2">
          {Object.entries(EVENT_TYPES).map(([k,t])=>(
            <button key={k} type="button" onClick={()=>set('type',k)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${form.type===k?t.chip:'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="日期" type="date" value={form.date} onChange={v=>set('date',v)}/>
        {form.type==='assembly'&&<Field label="人數" type="number" value={form.workers} onChange={v=>set('workers',v)} mono/>}
        {form.type==='logistics'&&<Field label="車次" type="number" value={form.vehicles} onChange={v=>set('vehicles',v)} mono/>}
        {form.type==='container'&&<Field label="方數 m³" type="number" value={form.volume} onChange={v=>set('volume',v)} mono/>}
      </div>
      {form.type==='logistics'&&<div className="grid grid-cols-2 gap-4"><Field label="方數 m³" type="number" value={form.volume} onChange={v=>set('volume',v)} mono/></div>}
      <Field label={form.type==='container'?'櫃號／說明':'備註'} value={form.note} onChange={v=>set('note',v)} placeholder={form.type==='container'?'例：OOLU1234567 / 40HQ':''}/>
    </Modal>
  )
}

function SettingsModal({ settings, onSave, onClose }) {
  const [output,setOutput]=useState(settings.daily_output_per_worker)
  const [perVeh,setPerVeh]=useState(settings.volume_per_vehicle)
  const [saving,setSaving]=useState(false)
  const handleSave=async()=>{
    const o=Number(output),v=Number(perVeh)
    if(!(o>0)||!(v>0)){alert('兩項參數都必須大於 0');return}
    setSaving(true); await onSave({daily_output_per_worker:o,volume_per_vehicle:v}); setSaving(false)
  }
  return (
    <Modal title="排期參數設定" onClose={onClose} maxW="max-w-md"
      footer={<>
        <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{saving?'儲存中…':'儲存'}</button>
      </>}>
      <div>
        <Field label="每人日產值 NT$" type="number" value={output} onChange={setOutput} mono/>
        <p className="text-[11px] text-slate-400 mt-1">金額 ÷ 產值 ＝ 需求人天。例：產值 100,000，金額 2,000,000 → 20 人天（每天 4 人可排 5 天）。</p>
      </div>
      <div>
        <Field label="每車方數 m³" type="number" value={perVeh} onChange={setPerVeh} mono/>
        <p className="text-[11px] text-slate-400 mt-1">方數 ÷ 每車方數 ＝ 需求車次。例：每車 10 方，訂單 50 方 → 5 車。</p>
      </div>
    </Modal>
  )
}

function OrderCard({ order, progress, selected, onSelect, onEdit, onDelete, onAutoPlan, onToggleDoc }) {
  const statusCls=order.status==='已完成'?'bg-emerald-50 text-emerald-700':order.status==='排期中'?'bg-sky-50 text-sky-700':'bg-slate-100 text-slate-500'
  return (
    <div onClick={()=>onSelect(order.id)} className={`bg-white rounded-xl border shadow-sm p-4 space-y-3 cursor-pointer transition ${selected?'border-indigo-400 ring-2 ring-indigo-100':'border-slate-200 hover:border-indigo-200'}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div className="font-bold text-slate-800 text-sm truncate">{order.name||'未命名訂單'}</div>
          <div className="text-xs text-slate-400 truncate">{order.client||'未填客戶'}{order.install_date?` · 交裝 ${order.install_date}`:''}</div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusCls}`}>{order.status}</span>
      </div>
      <div className="flex items-baseline justify-between text-xs gap-2">
        <span className="font-mono font-bold text-slate-700 truncate">{fmtNTD(order.amount)}<span className="text-slate-400 font-normal">（{fmtWan(order.amount)}）</span></span>
        <span className="font-mono text-slate-500 shrink-0">{round2(order.volume)} 方{progress.neededVeh>0?<span className="text-slate-400">（約{progress.neededVeh}車）</span>:null}</span>
      </div>
      <DocChecklist order={order} onToggle={k=>onToggleDoc(order,k)}/>
      <div className="space-y-2">
        <ProgressBar label="組裝人天" planned={progress.plannedWD||0} needed={progress.neededWD||0} unit="人天"/>
        <ProgressBar label="物流方數" planned={progress.plannedVol||0} needed={progress.neededVol||0} unit="方"/>
      </div>
      {order.remark&&<div className="text-[11px] text-slate-400 truncate">{order.remark}</div>}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button onClick={e=>{e.stopPropagation();onAutoPlan(order)}} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"><Wand2 className="w-3.5 h-3.5"/>自動排期</button>
        <button onClick={e=>{e.stopPropagation();onEdit(order)}} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5"/></button>
        <button onClick={e=>{e.stopPropagation();onDelete(order.id)}} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
    </div>
  )
}

function OrdersPanel({ orders, progressMap, settings, selectedOrderId, onSelect, onNew, onNewFromProject, onEdit, onDelete, onAutoPlan, onToggleDoc, onOpenSettings }) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-indigo-500"/>成交訂單<span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">{orders.length}</span></h3>
          <button onClick={onOpenSettings} title="排期參數設定" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"><Settings className="w-4 h-4"/></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onNewFromProject} className="flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"><FolderInput className="w-3.5 h-3.5"/>從專案帶入</button>
          <button onClick={onNew} className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"><Plus className="w-3.5 h-3.5"/>手動新增</button>
        </div>
        <p className="text-[11px] text-slate-400">每人日產值 <b className="font-mono text-slate-500">{fmtNTD(settings.daily_output_per_worker)}</b>｜每車 <b className="font-mono text-slate-500">{round2(settings.volume_per_vehicle)}</b> 方</p>
      </div>
      {orders.length===0&&(
        <div className="bg-white rounded-xl border border-slate-200 py-14 text-center text-slate-300">
          <ClipboardList className="w-9 h-9 mx-auto mb-2 opacity-40"/>
          <p className="text-sm">尚無成交訂單</p><p className="text-xs mt-1">成交後「從專案帶入」或「手動新增」</p>
        </div>
      )}
      {orders.map(o=>(
        <OrderCard key={o.id} order={o} progress={progressMap[o.id]||{}} selected={selectedOrderId===o.id}
          onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} onAutoPlan={onAutoPlan} onToggleDoc={onToggleDoc}/>
      ))}
    </div>
  )
}

function EventChip({ ev, order, dim, onClick }) {
  const t=EVENT_TYPES[ev.type]||EVENT_TYPES.assembly
  const line1=ev.type==='assembly'?`${t.label} ${Number(ev.workers||0)}人`
    :ev.type==='logistics'?`${t.label} ${Number(ev.vehicles||0)}車${Number(ev.volume||0)>0?`·${round2(ev.volume)}方`:''}`
    :`${t.label}${Number(ev.volume||0)>0?` ${round2(ev.volume)}方`:''}`
  const oName=order?`${order.client?order.client+' ':''}${order.name||''}`.trim()||'未命名訂單':'(訂單已刪)'
  const line2=ev.type==='container'&&ev.note?`${ev.note}｜${oName}`:oName
  return (
    <div draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',ev.id);e.dataTransfer.effectAllowed='move'}}
      onClick={e=>{e.stopPropagation();onClick(ev)}}
      className={`px-1.5 py-1 rounded-md border text-[10px] leading-tight cursor-grab active:cursor-grabbing select-none transition ${t.chip} ${dim?'opacity-30':''}`}>
      <div className="font-bold truncate">{line1}</div>
      <div className="truncate opacity-70">{line2}</div>
    </div>
  )
}

function DayCell({ cell, events, ordersById, selectedOrderId, isDragOver, setDragOverYmd, onDayClick, onEventClick, onEventDrop }) {
  const workers=events.reduce((s,e)=>e.type==='assembly'?s+Number(e.workers||0):s,0)
  const vehicles=events.reduce((s,e)=>e.type==='logistics'?s+Number(e.vehicles||0):s,0)
  const bg=isDragOver?'bg-indigo-50 ring-2 ring-inset ring-indigo-300':!cell.inMonth?'bg-slate-50':cell.isWeekend?'bg-slate-50/70':'bg-white'
  return (
    <div onClick={()=>onDayClick(cell.ymd)}
      onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDragOverYmd(cell.ymd)}}
      onDragLeave={()=>setDragOverYmd(prev=>prev===cell.ymd?null:prev)}
      onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');setDragOverYmd(null);if(id)onEventDrop(id,cell.ymd)}}
      className={`min-h-[110px] p-1.5 flex flex-col cursor-pointer transition-colors ${bg}`}>
      <div className="mb-1">
        <span className={`text-[11px] font-semibold w-5 h-5 inline-flex items-center justify-center rounded-full ${cell.isToday?'bg-indigo-600 text-white':cell.inMonth?'text-slate-500':'text-slate-300'}`}>{cell.day}</span>
      </div>
      <div className="space-y-1 flex-1">
        {events.map(ev=><EventChip key={ev.id} ev={ev} order={ordersById[ev.order_id]} dim={!!selectedOrderId&&ev.order_id!==selectedOrderId} onClick={onEventClick}/>)}
      </div>
      {(workers>0||vehicles>0)&&<div className="pt-1 text-[10px] font-mono font-bold text-slate-400">Σ {workers>0?`${workers}人`:''}{workers>0&&vehicles>0?' · ':''}{vehicles>0?`${vehicles}車`:''}</div>}
    </div>
  )
}

function CalendarGrid({ y, m, eventsByDate, ordersById, selectedOrderId, dragOverYmd, setDragOverYmd, onPrev, onNext, onToday, onDayClick, onEventClick, onEventDrop }) {
  const cells=useMemo(()=>buildMonthGrid(y,m),[y,m])
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="p-1.5 hover:bg-white rounded-lg text-slate-500 border border-transparent hover:border-slate-200"><ChevronLeft className="w-4 h-4"/></button>
          <span className="font-bold text-slate-800 text-sm w-24 text-center">{y}年{m+1}月</span>
          <button onClick={onNext} className="p-1.5 hover:bg-white rounded-lg text-slate-500 border border-transparent hover:border-slate-200"><ChevronRight className="w-4 h-4"/></button>
          <button onClick={onToday} className="ml-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-500 hover:bg-white">今天</button>
        </div>
        <div className="flex items-center gap-4">
          <Legend/>
          <span className="text-[11px] text-slate-300 hidden xl:inline">點日期新增｜拖曳調整日期</span>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
        {['一','二','三','四','五','六','日'].map((w,i)=><div key={w} className={`py-1.5 text-center text-[11px] font-semibold ${i>=5?'text-slate-300':'text-slate-400'}`}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-100">
        {cells.map(c=>(
          <DayCell key={c.ymd} cell={c} events={eventsByDate[c.ymd]||[]} ordersById={ordersById} selectedOrderId={selectedOrderId}
            isDragOver={dragOverYmd===c.ymd} setDragOverYmd={setDragOverYmd} onDayClick={onDayClick} onEventClick={onEventClick} onEventDrop={onEventDrop}/>
        ))}
      </div>
    </div>
  )
}

export default function SchedulerTab({ projects, withSync }) {
  const [orders,setOrders]=useState([])
  const [events,setEvents]=useState([])
  const [settings,setSettings]=useState(DEFAULT_SETTINGS)
  const [cursor,setCursor]=useState(()=>{const n=new Date();return{y:n.getFullYear(),m:n.getMonth()}})
  const [loading,setLoading]=useState(true)
  const [tablesMissing,setTablesMissing]=useState(false)
  const [orderModal,setOrderModal]=useState(null)      // null | {mode:'new'|'from-project'} | {mode:'edit',order}
  const [autoPlanOrder,setAutoPlanOrder]=useState(null)
  const [eventModal,setEventModal]=useState(null)      // null | {date} | event
  const [settingsOpen,setSettingsOpen]=useState(false)
  const [dragOverYmd,setDragOverYmd]=useState(null)
  const [selectedOrderId,setSelectedOrderId]=useState(null)

  const loadOrders=async()=>{ const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false}); if(error){setTablesMissing(true);return false}; setTablesMissing(false); setOrders(data||[]); return true }
  const loadEvents=async()=>{ const {data}=await supabase.from('schedule_events').select('*').order('date'); if(data)setEvents(data) }
  const loadSettings=async()=>{ const {data}=await supabase.from('app_settings').select('*').eq('id','default').maybeSingle(); if(data)setSettings({daily_output_per_worker:Number(data.daily_output_per_worker)||0,volume_per_vehicle:Number(data.volume_per_vehicle)||0}) }
  const loadAll=async()=>{ setLoading(true); const ok=await loadOrders(); if(ok)await Promise.all([loadEvents(),loadSettings()]); setLoading(false) }

  useEffect(()=>{
    loadAll()
    const subs=[
      supabase.channel('sch-o').on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>loadOrders()).subscribe(),
      supabase.channel('sch-e').on('postgres_changes',{event:'*',schema:'public',table:'schedule_events'},()=>loadEvents()).subscribe(),
      supabase.channel('sch-s').on('postgres_changes',{event:'*',schema:'public',table:'app_settings'},()=>loadSettings()).subscribe(),
    ]
    return ()=>subs.forEach(s=>supabase.removeChannel(s))
  },[])

  const saveOrder=async(o)=>await withSync(async()=>{ const {error}=await supabase.from('orders').upsert(o,{onConflict:'id'}); if(error)throw error; await loadOrders() })
  const toggleDoc=async(order,key)=>{ const val=!order[key]; setOrders(prev=>prev.map(o=>o.id===order.id?{...o,[key]:val}:o)); await withSync(async()=>{ const {error}=await supabase.from('orders').update({[key]:val}).eq('id',order.id); if(error)throw error }) }
  const deleteOrder=async(id)=>{
    if(!window.confirm('確定刪除此訂單及其所有排程？'))return
    setOrders(prev=>prev.filter(o=>o.id!==id)); setEvents(prev=>prev.filter(e=>e.order_id!==id)); if(selectedOrderId===id)setSelectedOrderId(null)
    await withSync(async()=>{ let r=await supabase.from('schedule_events').delete().eq('order_id',id); if(r.error)throw r.error; r=await supabase.from('orders').delete().eq('id',id); if(r.error)throw r.error })
  }
  const saveEvent=async(ev)=>await withSync(async()=>{ const {error}=await supabase.from('schedule_events').upsert(ev,{onConflict:'id'}); if(error)throw error; await loadEvents() })
  const deleteEvent=async(id)=>{ setEvents(prev=>prev.filter(e=>e.id!==id)); await withSync(async()=>{ const {error}=await supabase.from('schedule_events').delete().eq('id',id); if(error)throw error }) }
  const moveEvent=async(id,newYmd)=>{ const ev=events.find(e=>e.id===id); if(!ev||ev.date===newYmd)return; setEvents(prev=>prev.map(e=>e.id===id?{...e,date:newYmd}:e)); await withSync(async()=>{ const {error}=await supabase.from('schedule_events').update({date:newYmd}).eq('id',id); if(error)throw error }) }
  const insertEvents=async(order,list)=>{ if(!list.length)return; await withSync(async()=>{ const {error}=await supabase.from('schedule_events').insert(list); if(error)throw error; if(order.status==='待排期')await supabase.from('orders').update({status:'排期中'}).eq('id',order.id); await Promise.all([loadEvents(),loadOrders()]) }) }
  const saveSettings=async(patch)=>{ const next={...settings,...patch}; setSettings(next); await withSync(async()=>{ const {error}=await supabase.from('app_settings').upsert({id:'default',...next,updated_at:new Date().toISOString()},{onConflict:'id'}); if(error)throw error }) }
  const computeFromProject=async(pid)=>{
    const {data}=await supabase.from('quote_items').select('price,qty,volume').eq('project_id',pid)
    const rows=data||[]
    return { amount:rows.reduce((s,r)=>s+Number(r.price||0)*Number(r.qty||0),0), volume:round2(rows.reduce((s,r)=>s+(parseFloat(r.volume)||0)*Number(r.qty||0),0)) }
  }

  const ordersById=useMemo(()=>Object.fromEntries(orders.map(o=>[o.id,o])),[orders])
  const eventsByDate=useMemo(()=>{const m={};events.forEach(e=>{(m[e.date]=m[e.date]||[]).push(e)});return m},[events])
  const progressMap=useMemo(()=>{
    const output=Number(settings.daily_output_per_worker), perVeh=Number(settings.volume_per_vehicle), map={}
    orders.forEach(o=>{ const amount=Number(o.amount)||0, vol=Number(o.volume)||0
      map[o.id]={ neededWD:output>0?Math.ceil(amount/output):0, plannedWD:0, neededVol:vol, plannedVol:0, neededVeh:perVeh>0?Math.ceil(vol/perVeh):0 } })
    events.forEach(e=>{ const p=map[e.order_id]; if(!p)return
      if(e.type==='assembly')p.plannedWD+=Number(e.workers||0)
      if(e.type==='logistics')p.plannedVol+=Number(e.volume||0) })
    Object.values(map).forEach(p=>{p.plannedVol=round2(p.plannedVol)})
    return map
  },[orders,events,settings])

  const onDayClick=ymdStr=>{ if(!orders.length){alert('請先新增成交訂單（左側「從專案帶入」或「手動新增」）');return}; setEventModal({date:ymdStr}) }

  if(loading) return <div className="py-24 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500"/><p className="text-sm">載入排程資料…</p></div>

  if(tablesMissing) return (
    <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-3 mt-8">
      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto"/>
      <h3 className="font-bold text-slate-800">排程資料表尚未建立</h3>
      <p className="text-sm text-slate-600 leading-relaxed">請在 Supabase Dashboard → <b>SQL Editor</b> 執行專案根目錄的 <code className="bg-white border border-amber-200 rounded px-1.5 py-0.5 font-mono text-xs">scheduler.sql</code>（建立 orders、schedule_events、app_settings 三張資料表），完成後按「重試」。</p>
      <button onClick={loadAll} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 inline-flex items-center gap-2"><RefreshCw className="w-4 h-4"/>重試</button>
    </div>
  )

  return (
    <div>
      {orderModal&&<OrderModal mode={orderModal.mode} order={orderModal.order} projects={projects} settings={settings} computeFromProject={computeFromProject}
        onSave={async o=>{await saveOrder(o);setOrderModal(null)}} onClose={()=>setOrderModal(null)}/>}
      {autoPlanOrder&&<AutoPlanModal order={autoPlanOrder} settings={settings} existingCount={events.filter(e=>e.order_id===autoPlanOrder.id).length}
        onConfirm={async list=>{await insertEvents(autoPlanOrder,list);setAutoPlanOrder(null)}} onClose={()=>setAutoPlanOrder(null)}/>}
      {eventModal&&<EventModal initial={eventModal} orders={orders}
        onSave={async ev=>{await saveEvent(ev);setEventModal(null)}}
        onDelete={async id=>{if(!window.confirm('確定刪除此排程？'))return;await deleteEvent(id);setEventModal(null)}}
        onClose={()=>setEventModal(null)}/>}
      {settingsOpen&&<SettingsModal settings={settings} onSave={async p=>{await saveSettings(p);setSettingsOpen(false)}} onClose={()=>setSettingsOpen(false)}/>}

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-4">
          <OrdersPanel orders={orders} progressMap={progressMap} settings={settings} selectedOrderId={selectedOrderId}
            onSelect={id=>setSelectedOrderId(prev=>prev===id?null:id)}
            onNew={()=>setOrderModal({mode:'new'})} onNewFromProject={()=>setOrderModal({mode:'from-project'})}
            onEdit={o=>setOrderModal({mode:'edit',order:o})} onDelete={deleteOrder} onAutoPlan={setAutoPlanOrder}
            onToggleDoc={toggleDoc} onOpenSettings={()=>setSettingsOpen(true)}/>
        </div>
        <div className="col-span-8">
          <CalendarGrid y={cursor.y} m={cursor.m} eventsByDate={eventsByDate} ordersById={ordersById} selectedOrderId={selectedOrderId}
            dragOverYmd={dragOverYmd} setDragOverYmd={setDragOverYmd}
            onPrev={()=>setCursor(c=>c.m===0?{y:c.y-1,m:11}:{y:c.y,m:c.m-1})}
            onNext={()=>setCursor(c=>c.m===11?{y:c.y+1,m:0}:{y:c.y,m:c.m+1})}
            onToday={()=>{const n=new Date();setCursor({y:n.getFullYear(),m:n.getMonth()})}}
            onDayClick={onDayClick} onEventClick={ev=>setEventModal(ev)} onEventDrop={moveEvent}/>
        </div>
      </div>
    </div>
  )
}
