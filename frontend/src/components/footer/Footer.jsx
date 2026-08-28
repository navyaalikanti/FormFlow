import { Github, Linkedin, Twitter, ArrowRight, SquareCheckBig } from 'lucide-react'

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Logo and About */}
          <div className="space-y-8 xl:col-span-1">
            <div className="flex items-center gap-3 font-semibold text-slate-950 dark:text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-glow">
                <SquareCheckBig size={20} strokeWidth={2.5} />
              </span>
              <span className="text-lg tracking-tight">FormFlow</span>
            </div>
            <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">
              Build smart forms, automate workflows, and collect structured data without writing code.
            </p>
            <div className="flex space-x-4">
              <a href="#" aria-label="Twitter" className="rounded-xl border border-slate-200/85 p-2.5 text-slate-500 transition hover:border-brand-500 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-900/50">
                <Twitter size={18} />
              </a>
              <a href="#" aria-label="GitHub" className="rounded-xl border border-slate-200/85 p-2.5 text-slate-500 transition hover:border-brand-500 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-900/50">
                <Github size={18} />
              </a>
              <a href="#" aria-label="LinkedIn" className="rounded-xl border border-slate-200/85 p-2.5 text-slate-500 transition hover:border-brand-500 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-900/50">
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          {/* Links Grid */}
          <div className="mt-12 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0 sm:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Product</h3>
              <ul className="mt-4 space-y-3">
                {['Features', 'Workflows', 'Security', 'Pricing', 'Templates'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Resources</h3>
              <ul className="mt-4 space-y-3">
                {['Documentation', 'Guides', 'API Reference', 'Status'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Newsletter</h3>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Latest updates, articles, and news, directly to your inbox.
              </p>
              <form className="mt-4 flex max-w-md gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-glow transition hover:bg-brand-600"
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200/80 pt-8 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">&copy; {new Date().getFullYear()} FormFlow. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-slate-950 dark:hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-slate-950 dark:hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
