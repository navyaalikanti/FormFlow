import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileUp,
  FilePlus,
  GitBranch,
  Link2,
  PanelTop,
  Rocket,
  QrCode,
  Sparkles,
  SquareCheckBig,
  Star,
  Type,
  ChevronDown,
  Inbox,
  BarChart3,
  Palette,
  Cpu,
  ShieldCheck,
  MousePointerClick,
  Workflow,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../../layouts/AppLayout'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import HeroWorkflowIllustration from '../../components/HeroWorkflowIllustration'
import ScrollIndicator from '../../components/ScrollIndicator'
import AuthModal from '../../components/auth/AuthModal'
import LoginCard from '../../components/auth/LoginCard'
import RegisterCard from '../../components/auth/RegisterCard'

const fieldCards = [
  { icon: <Type size={15} />, label: 'landing.fieldCards.textField' },
  { icon: <SquareCheckBig size={15} />, label: 'landing.fieldCards.checkbox' },
  { icon: <Star size={15} />, label: 'landing.fieldCards.rating' },
]

const highlights = [
  {
    icon: <MousePointerClick size={20} />,
    titleKey: 'landing.features.dragDropBuilder',
    textKey: 'landing.features.dragDropDesc',
  },
  {
    icon: <Workflow size={20} />,
    titleKey: 'landing.features.smartWorkflows',
    textKey: 'landing.features.smartWorkflowsDesc',
  },
  {
    icon: <ShieldCheck size={20} />,
    titleKey: 'landing.features.secureReliable',
    textKey: 'landing.features.secureReliableDesc',
  },
  {
    icon: <BarChart3 size={20} />,
    titleKey: 'landing.features.realtimeAnalytics',
    textKey: 'landing.features.realtimeAnalyticsDesc',
  },
  {
    icon: <Palette size={20} />,
    titleKey: 'landing.features.customBranding',
    textKey: 'landing.features.customBrandingDesc',
  },
  {
    icon: <Cpu size={20} />,
    titleKey: 'landing.features.seamlessIntegrations',
    textKey: 'landing.features.seamlessIntegrationsDesc',
  },
]

const workflowSteps = [
  {
    icon: FilePlus,
    titleKey: 'landing.workflow.createForm',
    accent: 'animate-workflow-paper',
  },
  {
    icon: GitBranch,
    titleKey: 'landing.workflow.addConditionalLogic',
    accent: 'animate-workflow-branch',
  },
  {
    icon: Rocket,
    titleKey: 'landing.workflow.publishForm',
    accent: 'animate-workflow-rocket',
  },
  {
    titleKey: 'landing.workflow.shareLink',
    accent: 'animate-workflow-share',
    iconGroup: true,
  },
  {
    icon: Inbox,
    titleKey: 'landing.workflow.collectResponses',
    accent: 'animate-workflow-inbox',
  },
  {
    icon: BarChart3,
    titleKey: 'landing.workflow.viewAnalytics',
    accent: 'animate-workflow-bars',
  },
]

export default function LandingPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const showLogin = location.pathname === '/login'
  const showRegister = location.pathname === '/register'
  const showAuth = showLogin || showRegister

  // Typewriter effect loops through Forms, Workflows, Applications
  const typewriterWords = [t('landing.hero.typewriter.forms'), t('landing.hero.typewriter.workflows'), t('landing.hero.typewriter.applications')]
  const [wordIdx, setWordIdx] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timer
    const currentWord = typewriterWords[wordIdx]

    if (isDeleting) {
      timer = setTimeout(() => {
        setDisplayedText((prev) => prev.slice(0, -1))
      }, 50)
    } else {
      timer = setTimeout(() => {
        setDisplayedText((prev) => currentWord.slice(0, prev.length + 1))
      }, 100)
    }

    if (!isDeleting && displayedText === currentWord) {
      timer = setTimeout(() => setIsDeleting(true), 1500)
    } else if (isDeleting && displayedText === '') {
      setIsDeleting(false)
      setWordIdx((prev) => (prev + 1) % typewriterWords.length)
    }

    return () => clearTimeout(timer)
  }, [displayedText, isDeleting, wordIdx])

  // Input Field Typing Animation (typing "Navya")
  const [typedName, setTypedName] = useState('')
  const [isDeletingName, setIsDeletingName] = useState(false)

  useEffect(() => {
    const fullText = 'Navya'
    let timer

    if (isDeletingName) {
      timer = setTimeout(() => {
        setTypedName((prev) => prev.slice(0, -1))
      }, 150)
    } else {
      timer = setTimeout(() => {
        setTypedName((prev) => fullText.slice(0, prev.length + 1))
      }, 200)
    }

    if (!isDeletingName && typedName === fullText) {
      timer = setTimeout(() => setIsDeletingName(true), 2500)
    } else if (isDeletingName && typedName === '') {
      setIsDeletingName(false)
    }

    return () => clearTimeout(timer)
  }, [typedName, isDeletingName])

  // Dropdown select simulation ("Developer")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('Select role...')

  useEffect(() => {
    const interval = setInterval(() => {
      setIsDropdownOpen(true)

      setTimeout(() => {
        setSelectedRole('Developer')
      }, 1200)

      setTimeout(() => {
        setIsDropdownOpen(false)
      }, 2400)

      setTimeout(() => {
        setSelectedRole('Select role...')
      }, 5000)

    }, 7000)

    return () => clearInterval(interval)
  }, [])

  // Checkbox toggling simulation
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsCheckboxChecked((prev) => !prev)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  // Star Rating rating count simulation
  const [ratingStars, setRatingStars] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRatingStars((prev) => {
        if (prev >= 4) return 0
        return prev + 1
      })
    }, 850)
    return () => clearInterval(interval)
  }, [])

  // Published Link copy checkmark simulation
  const [isCopied, setIsCopied] = useState(false)
  const [shouldPulseLink, setShouldPulseLink] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setShouldPulseLink(true)
      setTimeout(() => setShouldPulseLink(false), 800)

      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1200)

    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AppLayout>
      <main className="overflow-hidden">
        <section
          id="hero"
          className="relative mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-16 lg:pt-36"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="hero-dots absolute inset-0 opacity-40 dark:opacity-20" />
          </div>

          <div className="relative grid gap-16 lg:grid-cols-[0.98fr_0.92fr] lg:items-center lg:gap-20">
            <div className="animate-fade-up relative z-10 flex flex-col justify-center">
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1] dark:text-white">
                <span className="block whitespace-normal sm:whitespace-nowrap">
                  {t('landing.hero.titlePart1')}{' '}
                  <span className="text-brand-500 dark:text-brand-500 relative">
                    {displayedText}
                  </span>
                </span>
                <span className="block whitespace-normal sm:whitespace-nowrap">{t('landing.hero.titlePart2')}</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                {t('landing.hero.description')}
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button
                  to="/register"
                  className="group min-w-44 gap-2 px-6 py-3 text-sm shadow-glow transition-transform duration-300 hover:-translate-y-0.5"
                >
                  {t('landing.hero.getStarted')}
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </Button>
                <Button
                  href="#features"
                  variant="secondary"
                  className="group min-w-44 gap-2 px-6 py-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]"
                >
                  {t('landing.hero.exploreFeatures')}
                  <ChevronRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
                {[
                  t('landing.hero.benefits.noCode'),
                  t('landing.hero.benefits.responsive'),
                  t('landing.hero.benefits.trustworthy'),
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check size={16} className="text-brand-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <HeroWorkflowIllustration />
          </div>

          <div className="mt-16 flex justify-center lg:mt-20">
            <ScrollIndicator />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24 border-t border-slate-100 dark:border-slate-900">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">{t('landing.features.sectionLabel')}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {t('landing.features.sectionTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
              {t('landing.features.sectionDesc')}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => (
              <Card
                key={item.titleKey}
                className="group border-slate-200 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/30 hover:shadow-[0_20px_50px_-15px_rgba(249,115,22,0.15)] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-brand-500/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 transition-colors duration-300 group-hover:bg-brand-500 group-hover:text-white">
                  {item.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">
                  {t(item.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t(item.textKey)}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl border-t border-slate-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-24 dark:border-slate-900">
          <div className="mb-16 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">{t('landing.workflow.sectionLabel')}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {t('landing.workflow.sectionTitle')}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
              {t('landing.workflow.sectionDesc')}
            </p>
          </div>

          <div className="relative">
            {/* SVG Connectors - Desktop Only */}
            <svg
              className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0" />
                  <stop offset="50%" stopColor="rgb(249, 115, 22)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="connector-gradient-dark" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(124, 45, 18)" stopOpacity="0" />
                  <stop offset="50%" stopColor="rgb(249, 115, 22)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="rgb(124, 45, 18)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Connector lines with arrows */}
              {[0, 1, 2, 3, 4].map((i) => {
                const startX = (i + 0.5) * (1200 / 6)
                const endX = (i + 1.5) * (1200 / 6)
                const midX = (startX + endX) / 2
                const midY = 60

                return (
                  <g key={`connector-${i}`}>
                    {/* Main curved connector line */}
                    <path
                      d={`M ${startX} 60 Q ${midX} ${midY - 15} ${endX} 60`}
                      stroke="url(#connector-gradient)"
                      strokeWidth="2.5"
                      fill="none"
                      className="dark:stroke-[url(#connector-gradient-dark)] transition-opacity duration-300"
                      strokeLinecap="round"
                    />
                    
                    {/* Animated flowing dots along connector */}
                    <circle
                      cx={startX}
                      cy="60"
                      r="1.5"
                      fill="rgb(249, 115, 22)"
                      opacity="0.6"
                      className="workflow-flow-dot"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />

                    {/* Arrow head */}
                    <path
                      d={`M ${endX - 6} 54 L ${endX} 60 L ${endX - 6} 66`}
                      stroke="rgb(249, 115, 22)"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="dark:stroke-slate-700"
                      opacity="0.7"
                    />
                  </g>
                )
              })}
            </svg>

            {/* Workflow Steps Container */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-0 md:py-2">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon

                return (
                  <div
                    key={step.titleKey}
                    className="workflow-step-card group relative flex-1 flex flex-col items-center px-3 py-6 transition-all duration-300 md:px-2"
                    style={{ 
                      animation: `slideInUp 0.6s ease-out ${index * 0.12}s both`,
                    }}
                  >
                    {/* Premium Card Container with Glow */}
                    <div className="relative w-full flex flex-col items-center">
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-brand-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-xl" />

                      {/* Icon Circle */}
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-brand-500/10 opacity-0 transition-all duration-300 group-hover:opacity-100 blur-sm scale-150" />
                        
                        <span
                          className={`workflow-step-icon relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 text-slate-600 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 dark:border-slate-800/80 dark:from-slate-900 dark:to-slate-950 dark:text-slate-400 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] group-hover:border-brand-400/60 group-hover:bg-white group-hover:text-brand-500 group-hover:shadow-[0_12px_32px_-6px_rgba(249,115,22,0.25)] group-hover:scale-110 dark:group-hover:border-brand-500/40 dark:group-hover:bg-slate-900 dark:group-hover:shadow-[0_12px_32px_-6px_rgba(249,115,22,0.15)] ${step.accent}`}
                        >
                          {step.iconGroup ? (
                            <span className="flex items-center gap-1.5">
                              <QrCode size={20} />
                              <Link2 size={18} />
                            </span>
                          ) : (
                            <Icon size={20} />
                          )}
                        </span>
                      </div>

                      {/* Step Label */}
                      <p className="workflow-step-title mt-4 text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-white group-hover:text-brand-500 dark:group-hover:text-brand-400 px-2 text-center leading-snug">
                        {t(step.titleKey)}
                      </p>
                    </div>

                    {/* Mobile connector (vertical) */}
                    {index !== workflowSteps.length - 1 && (
                      <div className="mt-4 h-6 w-px bg-gradient-to-b from-brand-500/60 to-brand-500/0 md:hidden" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <style>{`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes flowDot {
            0%, 100% {
              opacity: 0.3;
              r: 1.5px;
            }
            50% {
              opacity: 0.8;
              r: 2.5px;
            }
          }

          .workflow-flow-dot {
            animation: flowDot 2s ease-in-out infinite;
          }

          /* Smooth floating animation for hover state */
          .workflow-step-icon {
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .group:hover .workflow-step-icon {
            animation: float 3s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-4px);
            }
          }

          /* Animation for existing animations */
          @keyframes workflow-appear-1 {
            0% { opacity: 0; transform: scale(0.9) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }

          .animate-workflow-paper, 
          .animate-workflow-branch, 
          .animate-workflow-rocket, 
          .animate-workflow-share, 
          .animate-workflow-inbox, 
          .animate-workflow-bars {
            animation: workflow-appear-1 0.6s ease-out backwards;
          }

          .animate-workflow-paper { animation-delay: 0s; }
          .animate-workflow-branch { animation-delay: 0.12s; }
          .animate-workflow-rocket { animation-delay: 0.24s; }
          .animate-workflow-share { animation-delay: 0.36s; }
          .animate-workflow-inbox { animation-delay: 0.48s; }
          .animate-workflow-bars { animation-delay: 0.6s; }
        `}</style>
      </main>

      <AuthModal isOpen={showAuth} onClose={() => navigate('/')}>
        {showLogin && <LoginCard />}
        {showRegister && <RegisterCard />}
      </AuthModal>
    </AppLayout>
  )
}
