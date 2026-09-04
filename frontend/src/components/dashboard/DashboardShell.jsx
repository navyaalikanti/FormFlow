import {
  CirclePlus,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  MoonStar,
  Settings,
  SquareCheckBig,
  SunMedium,
  Users,
  Globe,
  ScrollText,
  Menu,
  X,
} from 'lucide-react'
import { useContext, useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../../context/AuthContext'
import { ThemeContext } from '../../context/ThemeContext'
import { SUPPORTED_LANGUAGES } from '../../i18n'
import Button from '../ui/Button'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Forms', to: '/dashboard/forms', icon: FileText },
  { label: 'Responses', to: '/dashboard/responses', icon: Users },
  { label: 'Audit Logs', to: '/dashboard/audit-logs', icon: ScrollText },
]

export default function DashboardShell({ title, subtitle, children, action }) {
  const { user, logout } = useContext(AuthContext)
  const { theme, toggleTheme } = useContext(ThemeContext)
  const { t, i18n } = useTranslation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [mobileLanguageMenuOpen, setMobileLanguageMenuOpen] = useState(false)
  const languageMenuRef = useRef(null)
  const mobileLanguageMenuRef = useRef(null)
  const location = useLocation()

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Handle clicking outside desktop language menu
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

  // Handle clicking outside mobile language menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileLanguageMenuRef.current && !mobileLanguageMenuRef.current.contains(event.target)) {
        setMobileLanguageMenuOpen(false)
      }
    }

    if (mobileLanguageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileLanguageMenuOpen])

  // Prevent background scrolling and handle Escape key when mobile drawer is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  const isItemActive = (item) => {
    if (item.to === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    if (item.to.includes('view=analytics')) {
      return location.pathname === '/dashboard/responses' && location.search.includes('view=analytics')
    }
    if (item.to === '/dashboard/responses') {
      return location.pathname === '/dashboard/responses' && !location.search.includes('view=analytics')
    }
    return location.pathname.startsWith(item.to)
  }

  const compactLinkClasses = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition',
      sidebarCollapsed ? 'justify-center px-0' : 'px-4',
      isActive
        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    ].join(' ')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile Top Header (visible only on screens below lg) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-glow">
              <SquareCheckBig size={18} strokeWidth={2.5} />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">FormFlow</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-500 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
          >
            {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
          </button>

          <div className="relative" ref={mobileLanguageMenuRef}>
            <button
              type="button"
              onClick={() => setMobileLanguageMenuOpen((prev) => !prev)}
              aria-label="Change language"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-500 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <Globe size={16} />
            </button>

            {mobileLanguageMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      i18n.changeLanguage(lang.code)
                      setMobileLanguageMenuOpen(false)
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition ${
                      i18n.language === lang.code
                        ? 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Sidebar Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation Drawer"
      >
        {/* Drawer Header: [×] FormFlow */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/60 px-4 py-5 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-glow">
              <SquareCheckBig size={20} strokeWidth={2.5} />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">FormFlow</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isItemActive(item)
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={[
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                    active
                      ? 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-brand-50 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800',
                  ].join(' ')}
                  end={item.to === '/dashboard'}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="flex-shrink-0 space-y-1 border-t border-slate-200/60 px-4 py-4 dark:border-slate-800/60">
          <NavLink
            to="/dashboard/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              ].join(' ')
            }
          >
            <Settings size={18} />
            <span>{t('common.settings')}</span>
          </NavLink>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false)
              logout()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10"
          >
            <LogOut size={18} />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Layout Wrapper */}
      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop Sidebar (unchanged on desktop lg and above) */}
        <aside
          className={`sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 lg:flex ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          {/* Header - Fixed */}
          <div className="flex-shrink-0 border-b border-slate-200/60 px-4 py-6 dark:border-slate-800/60">
            <div className={`flex items-center justify-between font-semibold ${sidebarCollapsed ? 'flex-col gap-4' : 'gap-3'}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-glow transition-transform duration-300">
                  <SquareCheckBig size={20} strokeWidth={2.5} />
                </span>
                {!sidebarCollapsed && <span className="text-lg tracking-tight text-slate-950 dark:text-white">FormFlow</span>}
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </button>
            </div>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isItemActive(item)
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={[
                      'flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition',
                      sidebarCollapsed ? 'justify-center px-0' : 'px-4',
                      active
                        ? 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-300'
                        : 'text-slate-600 hover:bg-brand-50 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800',
                    ].join(' ')}
                    end={item.to === '/dashboard'}
                  >
                    <Icon size={18} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          </nav>

          {/* Bottom Actions - Fixed */}
          <div className="flex-shrink-0 space-y-1 border-t border-slate-200/60 px-4 py-4 dark:border-slate-800/60">
            <NavLink
              to="/dashboard/settings"
              title={sidebarCollapsed ? t('common.settings') : undefined}
              className={compactLinkClasses}
            >
              <Settings size={18} />
              {!sidebarCollapsed && <span>{t('common.settings')}</span>}
            </NavLink>

            <button
              type="button"
              onClick={logout}
              title={sidebarCollapsed ? t('common.logout') : undefined}
              className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition ${
                sidebarCollapsed
                  ? 'justify-center px-0 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10'
                  : 'px-4 text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10'
              }`}
            >
              <LogOut size={18} />
              {!sidebarCollapsed && <span>{t('common.logout')}</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10 overflow-x-hidden">
          <div className="mb-6 lg:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>

            <div className="relative flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Desktop Theme & Language Selectors */}
              <div className="hidden lg:flex items-center gap-3" ref={languageMenuRef}>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-500 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                >
                  {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-500 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                    onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                    aria-label="Change language"
                  >
                    <Globe size={18} />
                  </button>

                  {languageMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            i18n.changeLanguage(lang.code)
                            setLanguageMenuOpen(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-medium transition ${
                            i18n.language === lang.code
                              ? 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-300'
                              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Header Action Button (e.g. Create Form, Export, etc.) */}
              {action !== undefined ? (
                action
              ) : (
                <Button>
                  <CirclePlus size={16} className="mr-2" />
                  {t('common.createForm')}
                </Button>
              )}
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  )
}
