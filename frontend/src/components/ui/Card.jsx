export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  )
}
