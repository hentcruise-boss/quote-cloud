import React, { useEffect, useState } from 'react'
import { Megaphone, Plus, X, Trash2, Ship, Save } from 'lucide-react'
import { supabase } from '../../supabase'
import { fetchAppSettings, saveAppSettings, WEEKDAY_LABELS, nextCutoff, etaFromCutoff, weekdayLabel } from '../../lib/marketing'
import { fmtDate, fmtDateTime } from '../../lib/format'

const KIND_LABEL = { info: '一般', promo: '促銷', alert: '重要' }
const EMPTY = { title: '', body: '', link: '', kind: 'promo', starts_at: '', ends_at: '', is_active: true, sort_order: 0 }

function AnnModal({ row, onClose, onSaved }) {
  const [f, setF] = useState(row
    ? { ...row, starts_at: row.starts_at ? row.starts_at.slice(0, 10) : '', ends_at: row.ends_at ? row.ends_at.slice(0, 10) : '' }
    : { ...EMPTY })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  const save = async () => {
    if (!f.title) { alert('請填標題'); return }
    setBusy(true)
    const payload = {
      title: f.title, body: f.body || null, link: f.link || null, kind: f.kind,
      starts_at: f.starts_at ? f.starts_at + 'T00:00:00+08:00' : null,
      ends_at: f.ends_at ? f.ends_at + 'T23:59:59+08:00' : null,
      is_active: f.is_active, sort_order: Number(f.sort_order) || 0,
    }
    if (row) await supabase.from('announcements').update(payload).eq('id', row.id)
    else await supabase.from('announcements').insert(payload)
    setBusy(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold">{row ? '編輯公告' : '新增公告'}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3 p-5">
          <L label="標題 *"><input value={f.title} onChange={e => set('title', e.target.value)} className="inp" /></L>
          <L label="內文"><textarea value={f.body || ''} onChange={e => set('body', e.target.value)} rows={3} className="inp" /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="連結（站內路徑或網址）"><input value={f.link || ''} onChange={e => set('link', e.target.value)} className="inp" placeholder="/product/MM-CHR-01" /></L>
            <L label="類型">
              <select value={f.kind} onChange={e => set('kind', e.target.value)} className="inp">
                {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </L>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <L label="開始日（可空）"><input type="date" value={f.starts_at} onChange={e => set('starts_at', e.target.value)} className="inp" /></L>
            <L label="結束日（可空）"><input type="date" value={f.ends_at} onChange={e => set('ends_at', e.target.value)} className="inp" /></L>
            <L label="排序"><input type="number" value={f.sort_order} onChange={e => set('sort_order', e.target.value)} className="inp font-mono" /></L>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />啟用（經銷商首頁顯示，最多前 3 則）</label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">取消</button>
          <button onClick={save} disabled={busy} className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? '儲存中…' : '儲存'}</button>
        </div>
      </div>
    </div>
  )
}
const L = ({ label, children }) => (
  <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>{children}</div>
)

export default function AdminMarketing() {
  const [list, setList] = useState([])
  const [modal, setModal] = useState(null)
  const [settings, setSettings] = useState(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [{ data }, s] = await Promise.all([
      supabase.from('announcements').select('*').order('sort_order').order('created_at', { ascending: false }),
      fetchAppSettings(),
    ])
    setList(data || []); setSettings(s)
  }
  useEffect(() => { load() }, [])

  const del = async (id) => { if (!confirm('刪除此公告？')) return; await supabase.from('announcements').delete().eq('id', id); load() }
  const toggle = async (a) => { await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id); load() }

  const setS = (k, v) => setSettings(s => ({ ...s, [k]: v }))
  const saveSettings = async () => {
    try {
      await saveAppSettings({
        container_cutoff_weekday: settings.container_cutoff_weekday ?? '4',
        container_cutoff_hour: settings.container_cutoff_hour ?? '17',
        container_lead_days: settings.container_lead_days ?? '28',
      })
      setMsg('已儲存'); setTimeout(() => setMsg(''), 1500)
    } catch (e) { setMsg('儲存失敗：' + e.message) }
  }

  const preview = settings ? nextCutoff(settings) : null

  return (
    <div className="space-y-6">
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:14px;outline:none}.inp:focus{border-color:#94a3b8}`}</style>
      {modal && <AnnModal row={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}

      <h1 className="flex items-center gap-2 text-lg font-bold"><Megaphone className="h-5 w-5 text-teal-700" />行銷中心</h1>

      {/* 併櫃截單設定 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-700"><Ship className="h-4 w-4" />本週櫃截單設定（每周一櫃）</h2>
        <p className="mb-3 text-xs text-slate-500">經銷商首頁與購物車會顯示「截單倒數」，催單併櫃。</p>
        {settings && (
          <div className="flex flex-wrap items-end gap-3">
            <div><label className="mb-1 block text-xs text-slate-500">截單星期</label>
              <select value={settings.container_cutoff_weekday ?? '4'} onChange={e => setS('container_cutoff_weekday', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {WEEKDAY_LABELS.map((l, i) => <option key={i} value={String(i + 1)}>{l}</option>)}
              </select></div>
            <div><label className="mb-1 block text-xs text-slate-500">截單時間（整點）</label>
              <input type="number" min="0" max="23" value={settings.container_cutoff_hour ?? '17'} onChange={e => setS('container_cutoff_hour', e.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono" /></div>
            <div><label className="mb-1 block text-xs text-slate-500">截單後約幾天到台</label>
              <input type="number" min="1" value={settings.container_lead_days ?? '28'} onChange={e => setS('container_lead_days', e.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono" /></div>
            <button onClick={saveSettings} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"><Save className="h-4 w-4" />儲存</button>
            {msg && <span className="text-xs text-emerald-600">{msg}</span>}
          </div>
        )}
        {preview && (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            預覽：下一個截單時間 <b>{fmtDate(preview)}（{weekdayLabel(preview)}）{String(preview.getHours()).padStart(2, '0')}:00</b>，
            預計 <b>{fmtDate(etaFromCutoff(preview, settings))}</b> 到台
          </div>
        )}
      </section>

      {/* 公告管理 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">公告 / 行銷 Banner（{list.length}）</h2>
          <button onClick={() => setModal('add')} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />新增公告</button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-2.5 font-semibold">標題</th><th className="px-4 py-2.5 font-semibold">類型</th>
              <th className="px-4 py-2.5 font-semibold">檔期</th><th className="px-4 py-2.5 font-semibold">狀態</th><th className="px-4 py-2.5"></th>
            </tr></thead>
            <tbody>
              {list.map(a => (
                <tr key={a.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setModal(a)}>
                  <td className="px-4 py-2.5"><div className="font-semibold text-slate-800">{a.title}</div>{a.link && <div className="font-mono text-[10px] text-slate-400">{a.link}</div>}</td>
                  <td className="px-4 py-2.5"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${a.kind === 'promo' ? 'bg-amber-50 text-amber-700' : a.kind === 'alert' ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-700'}`}>{KIND_LABEL[a.kind]}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{a.starts_at || a.ends_at ? `${a.starts_at ? fmtDateTime(a.starts_at) : '—'} ~ ${a.ends_at ? fmtDateTime(a.ends_at) : '—'}` : '不限'}</td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggle(a)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${a.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{a.is_active ? '顯示中' : '已停用'}</button>
                  </td>
                  <td className="px-4 py-2.5"><button onClick={e => { e.stopPropagation(); del(a.id) }} className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">尚無公告</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">促銷價請至「產品」編輯（促銷價＋促銷到期日），前台會自動顯示劃線原價與「促銷」標籤。</p>
      </section>
    </div>
  )
}
