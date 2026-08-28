import { Link } from 'react-router-dom'

export default function Button({ className = '', variant = 'primary', href, to, ...props }) {
  const styles =
    variant === 'secondary'
      ? 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
      : 'bg-brand-500 text-white hover:bg-brand-600 shadow-glow'

  const classes = `inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`

  if (to) {
    return <Link className={classes} to={to} {...props} />
  }

  if (href) {
    return <a className={classes} href={href} {...props} />
  }

  return (
    <button
      className={classes}
      {...props}
    />
  )
}
