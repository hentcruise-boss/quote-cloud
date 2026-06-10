import { Star } from 'lucide-react'

export default function StarRating({ value = 0, onChange, readOnly = false, size = 'w-5 h-5' }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={readOnly} onClick={() => onChange?.(n)}
          className={readOnly ? 'cursor-default' : 'hover:scale-110 transition'}>
          <Star className={`${size} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}/>
        </button>
      ))}
    </div>
  )
}
