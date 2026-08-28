import { forwardRef } from 'react'

const TextField = forwardRef(function TextField({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
      <input
        ref={ref}
        className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </label>
  )
})

export default TextField
