import React, { useEffect, useRef, useState } from 'react'
import { Plus, X, Trash2, Eye, EyeOff, Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../supabase'
import { nt } from '../../lib/format'
import { LEAD_TIME, SCENES_PRESET } from '../../lib/filters'

const EMPTY = { sku: '', name: '', series: '', category: '', description: '', spec: '', material: '', base_price: 0, futures_price: '', stock_qty: 0, image_url: '', qty_tiers: [], is_active: true, sort_order: 0, lead_time_type: 'normal', scenes: [] }

// 把檔案上傳到 product-images bucket，回傳 public URL
async function uploadProductImage(file, sku) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safeSku = (sku || 'product').replace(/[^a-zA-Z0-9_-]/g, '_')
  const path = `${safeSku}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

function ImageUploader({ value, onChange, sku }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('請選擇圖片檔'); return }
    if (file.size > 5 * 1024 * 1024) { setErr('檔案請小於 5MB'); return }
    setErr(''); setBusy(true)
    try { onChange(await uploadProductImage(file, sku)) }
    catch (e) { setErr('上傳失敗：' + (e.message || '請確認 Storage bucket 已建立')) }
    finally { setBusy(false) }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">圖片</label>
      <div className="flex gap-3">
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {value
            ? <img src={value} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-slate-300"><ImageIcon className="h-7 w-7" /></div>}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {busy ? '上傳中…' : '選擇圖片上傳'}
            </button>
            {value && <button type="button" onClick={() => onChange('')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">移除</button>}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFile(e.target.files?.[0])} />
          <input value={value || ''} onChange={e => onChange(e.target.value)} className="inp text-xs"
            placeholder="或直接貼網址：https://…" />
          {err && <div className="text-xs text-rose-500">{err}</div>}
          <div className="text-[10px] text-slate-400">JPG / PNG / WebP / GIF，5MB 內</div>
        </div>
      </div>
    </div>
  )
}

function ProductModal({ product, onClose, onSaved }) {
  const isNew = !product
  const [f, setF] = useState(product
    ? { ...product, qty_tiers: product.qty_tiers || [], scenes: product.scenes || [], lead_time_type: product.lead_time_type || 'normal' }
    : { ...EMPTY })
  const [options, setOptions] = useState([])
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  useEffect(() => {
    if (product) supabase.from('product_options').select('*').eq('sku', product.sku).order('sort_order').then(({ data }) => setOptions(data || []))
  }, [product])

  const setTier = (i, k, v) => setF(s => { const q = [...s.qty_tiers]; q[i] = { ...q[i], [k]: Number(v) }; return { ...s, qty_tiers: q } })
  const addTier = () => setF(s => ({ ...s, qty_tiers: [...s.qty_tiers, { min_qty: 0, rate: 1 }] }))
  const rmTier = (i) => setF(s => ({ ...s, qty_tiers: s.qty_tiers.filter((_, j) => j !== i) }))

  const save = async () => {
    if (!f.sku || !f.name) { alert('SKU 與名稱必填'); return }
    setBusy(true)
    await supabase.from('dealer_products').upsert({ ...f, base_price: Number(f.base_price), sort_order: Number(f.sort_order) }, { onConflict: 'sku' })
    setBusy(false); onSaved()
  }

  // 選配（僅既有產品可編輯）
  const addOpt = async () => {
    const row = { sku: f.sku, group_name: '顏色', label: '新選項', price_delta: 0, is_default: false, sort_order: options.length + 1 }
    const { data } = await supabase.from('product_options').insert(row).select().single()
    if (data) setOptions(o => [...o, data])
  }
  const saveOpt = async (o) => { await supabase.from('product_options').update({ group_name: o.group_name, label: o.label, price_delta: Number(o.price_delta), is_default: o.is_default }).eq('id', o.id) }
  const rmOpt = async (id) => { await supabase.from('product_options').delete().eq('id', id); setOptions(o => o.filter(x => x.id !== id)) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold">{isNew ? '新增產品' : `編輯 — ${product.sku}`}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <L label="SKU *"><input value={f.sku} onChange={e => set('sku', e.target.value)} disabled={!isNew} className="inp font-mono disabled:bg-slate-100" /></L>
            <L label="名稱 *"><input value={f.name} onChange={e => set('name', e.target.value)} className="inp" /></L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="系列"><input value={f.series || ''} onChange={e => set('series', e.target.value)} className="inp" /></L>
            <L label="類型"><input value={f.category || ''} onChange={e => set('category', e.target.value)} className="inp" /></L>
          </div>
          <L label="描述"><textarea value={f.description || ''} onChange={e => set('description', e.target.value)} rows={2} className="inp" /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="規格/尺寸"><input value={f.spec || ''} onChange={e => set('spec', e.target.value)} className="inp" /></L>
            <L label="材質"><input value={f.material || ''} onChange={e => set('material', e.target.value)} className="inp" /></L>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <L label="現貨牌價（未稅）"><input type="number" value={f.base_price} onChange={e => set('base_price', e.target.value)} className="inp font-mono" /></L>
            <L label="期貨牌價（未稅，可空）"><input type="number" value={f.futures_price ?? ''} onChange={e => set('futures_price', e.target.value === '' ? null : Number(e.target.value))} className="inp font-mono" placeholder="留空＝不開放期貨" /></L>
            <L label="現貨庫存（件）"><input type="number" value={f.stock_qty || 0} onChange={e => set('stock_qty', Number(e.target.value) || 0)} className="inp font-mono" /></L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="排序"><input type="number" value={f.sort_order} onChange={e => set('sort_order', e.target.value)} className="inp font-mono" /></L>
            <L label="上架"><label className="flex h-[38px] items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />{f.is_active ? '上架中' : '已下架'}</label></L>
          </div>
          <ImageUploader value={f.image_url} onChange={v => set('image_url', v)} sku={f.sku} />

          {/* 交期 */}
          <L label="交期">
            <div className="flex flex-wrap gap-2">
              {LEAD_TIME.map(lt => {
                const active = f.lead_time_type === lt.key
                return (
                  <button key={lt.key} type="button" onClick={() => set('lead_time_type', lt.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${active ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {lt.label}
                  </button>
                )
              })}
            </div>
          </L>

          {/* 場景（多選） */}
          <L label="適用場景（可複選）">
            <div className="flex flex-wrap gap-2">
              {SCENES_PRESET.map(s => {
                const active = (f.scenes || []).includes(s)
                return (
                  <button key={s} type="button"
                    onClick={() => set('scenes', active ? f.scenes.filter(x => x !== s) : [...(f.scenes || []), s])}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${active ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {s}
                  </button>
                )
              })}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">已選：{(f.scenes || []).join('、') || '—'}</div>
          </L>

          {/* 數量階梯 */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-500">數量階梯</span>
              <button onClick={addTier} className="text-xs text-slate-600">+ 新增一檔</button></div>
            {f.qty_tiers.length === 0 && <div className="text-xs text-slate-400">無</div>}
            {f.qty_tiers.map((t, i) => (
              <div key={i} className="mb-1.5 flex items-center gap-2 text-sm">
                滿 <input type="number" value={t.min_qty} onChange={e => setTier(i, 'min_qty', e.target.value)} className="w-20 rounded border border-slate-200 px-2 py-1 font-mono" /> 件，
                乘數 <input type="number" step="0.01" value={t.rate} onChange={e => setTier(i, 'rate', e.target.value)} className="w-20 rounded border border-slate-200 px-2 py-1 font-mono" />
                <button onClick={() => rmTier(i)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>

          {/* 選配 */}
          {isNew ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">儲存產品後即可編輯選配。</div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-500">選配</span>
                <button onClick={addOpt} className="text-xs text-slate-600">+ 新增選項</button></div>
              {options.length === 0 && <div className="text-xs text-slate-400">無</div>}
              {options.map((o, i) => (
                <div key={o.id} className="mb-1.5 flex items-center gap-1.5 text-sm">
                  <input defaultValue={o.group_name} onBlur={e => { options[i].group_name = e.target.value; saveOpt(options[i]) }} className="w-20 rounded border border-slate-200 px-2 py-1" placeholder="群組" />
                  <input defaultValue={o.label} onBlur={e => { options[i].label = e.target.value; saveOpt(options[i]) }} className="flex-1 rounded border border-slate-200 px-2 py-1" placeholder="選項" />
                  <input type="number" defaultValue={o.price_delta} onBlur={e => { options[i].price_delta = e.target.value; saveOpt(options[i]) }} className="w-24 rounded border border-slate-200 px-2 py-1 font-mono" placeholder="加價" />
                  <label className="flex items-center gap-1 text-xs text-slate-400"><input type="checkbox" defaultChecked={o.is_default} onChange={e => { options[i].is_default = e.target.checked; saveOpt(options[i]) }} />預設</label>
                  <button onClick={() => rmOpt(o.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">關閉</button>
          <button onClick={save} disabled={busy} className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? '儲存中…' : '儲存產品'}</button>
        </div>
      </div>
    </div>
  )
}
const L = ({ label, children }) => (
  <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>{children}</div>
)

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null)
  const load = async () => { const { data } = await supabase.from('dealer_products').select('*').order('sort_order'); setProducts(data || []) }
  useEffect(() => { load() }, [])
  const toggleActive = async (p) => { await supabase.from('dealer_products').update({ is_active: !p.is_active }).eq('sku', p.sku); load() }
  const del = async (sku) => { if (!confirm(`刪除 ${sku}？`)) return; await supabase.from('dealer_products').delete().eq('sku', sku); load() }

  return (
    <div className="space-y-4">
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:14px;outline:none}.inp:focus{border-color:#94a3b8}`}</style>
      {modal && <ProductModal product={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">產品（{products.length}）</h1>
        <button onClick={() => setModal('add')} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />新增產品</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2.5 font-semibold w-16"></th><th className="px-4 py-2.5 font-semibold">SKU</th><th className="px-4 py-2.5 font-semibold">名稱</th>
            <th className="px-4 py-2.5 font-semibold">系列/類型</th><th className="px-4 py-2.5 font-semibold">牌價</th><th className="px-4 py-2.5 font-semibold">狀態</th><th className="px-4 py-2.5"></th>
          </tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.sku} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setModal(p)}>
                <td className="px-4 py-2"><div className="h-10 w-10 overflow-hidden rounded bg-slate-100">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div></td>
                <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-2 font-semibold text-slate-800">{p.name}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{p.series} / {p.category}</td>
                <td className="px-4 py-2 font-mono">{nt(p.base_price)}</td>
                <td className="px-4 py-2">{p.is_active ? <span className="text-xs text-emerald-600">上架</span> : <span className="text-xs text-slate-400">下架</span>}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleActive(p)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="上下架">{p.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    <button onClick={() => del(p.sku)} className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">尚無產品</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
