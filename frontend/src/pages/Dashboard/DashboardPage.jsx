import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, CirclePlus, FileText, Gauge, Share2, Users } from 'lucide-react'
import Card from '../../components/ui/Card'
import DashboardShell from '../../components/dashboard/DashboardShell'
import { AuthContext } from '../../context/AuthContext'
import api from '../../lib/api'

function StatSkeleton() {
  return (
    <Card className="p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="mt-4 h-10 w-20 rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="mt-2 h-4 w-32 rounded-md bg-slate-100 dark:bg-slate-800" />
    </Card>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setStatsLoading(true)
    api.get('/v1/dashboard/stats')
      .then((res) => { if (!cancelled) setStats(res.data) })
      .catch(() => { if (!cancelled) setStats({ totalForms: 0, publishedForms: 0, totalResponses: 0, completionRate: 0 }) })
      .finally(() => { if (!cancelled) setStatsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const statCards = stats
    ? [
        { label: t('dashboard.totalForms'), value: stats.totalForms.toLocaleString(), icon: <FileText size={18} />, note: t('dashboard.allFormsCreated') },
        { label: t('dashboard.publishedForms'), value: stats.publishedForms.toLocaleString(), icon: <Share2 size={18} />, note: t('dashboard.currentlyLive') },
        { label: t('dashboard.totalResponses'), value: stats.totalResponses.toLocaleString(), icon: <Users size={18} />, note: t('dashboard.allSubmissions') },
        { label: t('dashboard.completionRate'), value: `${stats.completionRate}%`, icon: <Gauge size={18} />, note: t('dashboard.submittedStarted') },
      ]
    : []

  return (
    <DashboardShell
      title={`${t('dashboard.welcomeBack')}, ${user?.full_name || user?.name || 'Admin'}`}
      subtitle={t('dashboard.subtitle')}
      action={
        <button
          onClick={() => navigate('/dashboard/forms')}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600"
        >
          <CirclePlus size={16} className="mr-2" />
          {t('common.createForm')}
        </button>
      }
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((stat) => (
              <Card key={stat.label} className="p-6">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-sm font-medium tracking-tight">{stat.label}</span>
                  <span className="rounded-xl bg-brand-500/10 p-2 text-brand-500">{stat.icon}</span>
                </div>
                <p className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">{stat.note}</p>
              </Card>
            ))}
      </section>

      <section className="mt-10 mb-8">
        <h2 className="mb-5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{t('dashboard.quickActions')}</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              path: '/dashboard/forms',
              icon: <CirclePlus size={20} />,
              title: t('dashboard.createFormTemplate'),
              desc: t('dashboard.createFormDesc'),
              bullets: [t('dashboard.versioning'), t('dashboard.validationRules'), t('dashboard.conditionalLogic'), t('dashboard.formPublishing')],
              cta: t('dashboard.startBuilding'),
            },
            {
              path: '/dashboard/responses',
              icon: <Users size={20} />,
              title: t('dashboard.reviewSubmissions'),
              desc: t('dashboard.reviewSubmissionsDesc'),
              bullets: [t('dashboard.smartSearch'), t('dashboard.pagination'), t('dashboard.versionTracking'), t('dashboard.csvJsonExport')],
              cta: t('dashboard.viewResponses'),
            },
            {
              path: '/dashboard/responses?view=analytics',
              icon: <BarChart3 size={20} />,
              title: t('dashboard.openAnalytics'),
              desc: t('dashboard.analyticsDesc'),
              bullets: [t('dashboard.trendAnalysis'), t('dashboard.interactiveCharts'), t('dashboard.fieldInsights'), t('dashboard.responseDistribution')],
              cta: t('dashboard.viewAnalytics'),
            },
          ].map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-brand-400 hover:shadow-[0_8px_32px_rgba(249,115,22,0.13)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-all duration-200 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white">
                {action.icon}
              </span>

              <p className="mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                {action.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {action.desc}
              </p>

              <ul className="mt-4 w-full space-y-1.5">
                {action.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex w-full items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-sm font-semibold text-brand-500 group-hover:underline">
                  {action.cta}
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500 transition-transform duration-200 group-hover:translate-x-1">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </DashboardShell>
  )
}
