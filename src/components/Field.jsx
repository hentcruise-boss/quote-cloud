export default function Field({ label, value, onChange, type = 'text', disabled = false, mono = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 bg-white ${mono ? 'font-mono' : ''}`}/>
    </div>
  )
}
