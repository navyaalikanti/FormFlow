import { useContext, useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MoonStar, SunMedium, SquareCheckBig, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ThemeContext } from '../../context/ThemeContext'
import { SUPPORTED_LANGUAGES } from '../../i18n'
import Button from '../ui/Button'

const navItems = [
  { label: 'Features', to: '#features' },
  { label: 'How it Works', to: '#about' },
  // { label: 'Pricing', to: '#pricing' },
  // { label: 'About', to: '#about' },
  { label: 'Contact', to: '#contact' },
]

export default function Navbar() {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const { i18n } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const languageMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setLanguageMenuOpen(false)
      }
    }

    if (languageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [languageMenuOpen])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={[
        'fixed left-1/2 top-4 z-40 w-[94%] max-w-7xl -translate-x-1/2 rounded-[24px] border px-4 py-3.5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] backdrop-blur-[24px] transition-all duration-300 sm:px-5',
         scrolled
  ? 'border-slate-200/40 bg-white/20 dark:border-white/10 dark:bg-black/20'
  : 'border-slate-200/15 bg-white/5 dark:border-white/5 dark:bg-black/5'
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-3 font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
            <SquareCheckBig size={20} strokeWidth={2.5} />
          </span>
          <span className="text-lg tracking-tight text-slate-950 dark:text-white">FormFlow</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.to}
              className="text-sm font-medium text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
          </button>

          <div className="relative" ref={languageMenuRef}>
            <button
              type="button"
              onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
              aria-label="Change language"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <Globe size={18} />
            </button>

            {languageMenuOpen && (
              <div className="absolute right-2 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      i18n.changeLanguage(lang.code)
                      setLanguageMenuOpen(false)
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition ${
                      i18n.language === lang.code
                        ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Button
            to="/login"
            variant="secondary"
            className="hidden h-11 px-4 font-medium sm:inline-flex"
          >
            Login
          </Button>
          <Button to="/register" className="h-11 px-5 font-medium">
            Get Started
          </Button>
        </div>
      </div>
    </header>
  )
}
