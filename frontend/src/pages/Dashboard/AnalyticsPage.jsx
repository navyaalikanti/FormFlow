import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { BarChart3, HelpCircle, Inbox, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardShell from '../../components/dashboard/DashboardShell'
import Card from '../../components/ui/Card'
import api from '../../lib/api'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// Harmonious Orange design system palette
const ORANGE_PALETTE = [
  '#F97316', // Primary Orange
  '#FB923C', // Orange 400
  '#FDBA74', // Orange 300
  '#EA580C', // Orange 600
  '#C2410C', // Orange 700
  '#FED7AA', // Orange 200
  '#9A3412', // Orange 800
  '#7C2D12', // Orange 900
]

const RATING_PALETTE = [
  '#FED7AA', // 1 Star (Lightest)
  '#FDBA74', // 2 Star
  '#FB923C', // 3 Star
  '#F97316', // 4 Star
  '#EA580C', // 5 Star
  '#C2410C', // 6 Star
  '#9A3412', // 7 Star (Darkest)
]

function CustomTooltip({ active, payload, clickable }) {
  const { t } = useTranslation()
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="pointer-events-none rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900/95">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{data.option}</p>
        <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          <p>
            {t('analytics.count')}: <span className="font-semibold text-slate-900 dark:text-white">{data.count}</span>
          </p>
          <p>
            {t('analytics.percentage')}: <span className="font-semibold text-slate-900 dark:text-white">{data.percentage}%</span>
          </p>
        </div>
        {clickable && (
          <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] font-medium text-brand-600 dark:border-slate-700 dark:text-brand-400">
            {t('analytics.clickToViewResponses') || 'Click to view responses'}
          </p>
        )}
      </div>
    )
  }
  return null
}

function AnalyticsChartCard({ field, onValueClick }) {
  const { t } = useTranslation()
  const { fieldId, fieldLabel, fieldType, totalValidResponses, distribution } = field
  const hasData = totalValidResponses > 0 && distribution && distribution.length > 0

  const getDistributionValue = (entry) => entry?.optionValue ?? entry?.option_value ?? entry?.option

  // Handle bar/segment click - navigate to responses with filter
  const handleBarClick = (data) => {
    if (onValueClick && data) {
      const value = getDistributionValue(data)
      if (value) {
        onValueClick(fieldId, fieldLabel, value, fieldType)
      }
    }
  }

  // Handle Pie chart click (sector click)
  const handlePieClick = (entry) => {
    if (onValueClick && entry) {
      const value = getDistributionValue(entry)
      if (value) {
        onValueClick(fieldId, fieldLabel, value, fieldType)
      }
    }
  }

  // Chart configuration selectors
  const chartElement = useMemo(() => {

    if (!hasData) {
      return (
        <div className="flex h-[240px] flex-col items-center justify-center rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
          <Inbox size={28} className="text-slate-300 dark:text-slate-700" />
          <p className="mt-2 text-sm font-medium text-slate-400 dark:text-slate-500">{t('analytics.noResponsesAvailable')}</p>
        </div>
      )
    }

    if (fieldType === 'dropdown' || fieldType === 'radio') {
      if (distribution.length <= 5) {
        // Pie Chart
        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                nameKey="option"
                style={{ cursor: 'pointer' }}
              >
                {distribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={ORANGE_PALETTE[index % ORANGE_PALETTE.length]}
                    onClick={() => handlePieClick(entry)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip clickable />} />
              <Legend
                verticalAlign="bottom"
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 10, pointerEvents: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )
      } else {
        // Bar Chart
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="option" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip clickable />} cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} onClick={(state) => handleBarClick(state.payload)}>
                {distribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={ORANGE_PALETTE[index % ORANGE_PALETTE.length]}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    }

    if (fieldType === 'rating') {
      // Vertical Bar Chart with gradient colors from lower rating (lighter) to higher rating (darker)
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis dataKey="option" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip clickable />} cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} onClick={(state) => handleBarClick(state.payload)}>
              {distribution.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={RATING_PALETTE[index % RATING_PALETTE.length] || '#EA580C'}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (fieldType === 'checkbox') {
      // Horizontal Bar Chart
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={distribution}
            layout="vertical"
            margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="option" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
            <Tooltip content={<CustomTooltip clickable />} cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} onClick={(state) => handleBarClick(state.payload)}>
              {distribution.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={ORANGE_PALETTE[index % ORANGE_PALETTE.length]}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return null
  }, [fieldType, distribution, hasData, t, handleBarClick, handlePieClick])

  return (
    <Card className="flex flex-col p-6 h-full justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              {fieldLabel}
            </h3>
            <span className="mt-1 inline-flex items-center rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-500 capitalize">
              {fieldType}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {totalValidResponses}
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t('analytics.validResponses')}
            </p>
          </div>
        </div>

        <div 
          className="mt-6 cursor-pointer"
        >
          {chartElement}
        </div>
      </div>

      {hasData && (
        <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <HelpCircle size={14} className="shrink-0 text-slate-400 dark:text-slate-600" />
          <span>{t('analytics.percentagesCalculated')}</span>
        </div>
      )}
    </Card>
  )
}

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [selectedFormId, setSelectedFormId] = useState('')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loadingForms, setLoadingForms] = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Handle click on chart value - navigate to responses with filter
  const handleChartValueClick = (fieldId, fieldLabel, fieldValue, fieldType) => {
    const params = new URLSearchParams()
    params.set('fieldId', fieldId)
    params.set('field', fieldLabel)
    params.set('value', fieldValue)
    params.set('formId', selectedFormId)

    const navigationUrl = `/dashboard/responses?${params.toString()}`
    navigate(navigationUrl)
  }

  // 1. Load the list of forms on load
  useEffect(() => {
    let cancelled = false
    setLoadingForms(true)
    api.get('/forms')
      .then((res) => {
        if (cancelled) return
        const list = res.data.items || []
        setForms(list)
        
        // Pick initial form: from query param or fallback to first form
        const paramId = searchParams.get('formId')
        if (paramId && list.some(f => f.id === paramId)) {
          setSelectedFormId(paramId)
        } else if (list.length > 0) {
          setSelectedFormId(list[0].id)
          setSearchParams({ formId: list[0].id })
        }
      })
      .catch((err) => {
        console.error("Failed to load forms", err)
      })
      .finally(() => {
        if (!cancelled) setLoadingForms(false)
      })

    return () => { cancelled = true }
  }, [searchParams, setSearchParams])

  // 2. Load analytics for the selected form
  useEffect(() => {
    if (!selectedFormId) {
      setAnalyticsData(null)
      return
    }
    let cancelled = false
    setLoadingAnalytics(true)
    api.get(`/forms/${selectedFormId}/analytics`)
      .then((res) => {
        if (!cancelled) {
          setAnalyticsData(res.data)
        }
      })
      .catch((err) => {
        console.error("Failed to load form analytics", err)
        if (!cancelled) setAnalyticsData(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingAnalytics(false)
      })

    return () => { cancelled = true }
  }, [selectedFormId])

  const handleFormChange = (e) => {
    const newId = e.target.value
    setSelectedFormId(newId)
    setSearchParams({ formId: newId })
  }

  // Selected form details
  const selectedForm = useMemo(() => {
    return forms.find((f) => f.id === selectedFormId)
  }, [forms, selectedFormId])

  return (
    <DashboardShell title={t('analytics.title')} subtitle={t('analytics.subtitle')}>
      {/* Form Selector Dropdown Card */}
      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label htmlFor="form-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('analytics.selectForm')}
            </label>
            {loadingForms ? (
              <div className="mt-1.5 flex items-center gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin text-brand-500" />
                <span className="text-sm">{t('analytics.loadingForms')}</span>
              </div>
            ) : forms.length === 0 ? (
              <p className="mt-1 text-sm font-medium text-slate-500">{t('analytics.noFormsAvailable')}</p>
            ) : (
              <select
                id="form-select"
                value={selectedFormId}
                onChange={handleFormChange}
                className="mt-1.5 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-500"
              >
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title} {form.status === 'published' ? `(${t('analytics.published')})` : `(${t('analytics.draft')})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedForm && analyticsData && (
            <div className="flex gap-6 border-t border-slate-100 pt-4 sm:border-0 sm:pt-0">
              <div className="text-left sm:text-right">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {analyticsData.totalResponses.toLocaleString()}
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('analytics.totalSubmissions')}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Main Analytics Display */}
      {loadingAnalytics ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <Loader2 size={36} className="animate-spin text-brand-500" />
          <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t('analytics.gatheringAnalytics')}
          </p>
        </div>
      ) : !selectedFormId ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Inbox size={42} className="text-slate-300 dark:text-slate-700" />
          <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">{t('analytics.noFormSelected')}</h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-400">
            {t('analytics.selectFormPlaceholder')}
          </p>
        </Card>
      ) : !analyticsData || !analyticsData.fields || analyticsData.fields.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <BarChart3 size={42} className="text-slate-300 dark:text-slate-700" />
          <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">{t('analytics.noAnalyticsAvailable')}</h3>
          <p className="mt-1.5 max-w-md text-sm text-slate-400">
            {t('analytics.noSupportedFields')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {analyticsData.fields.map((field) => (
            <AnalyticsChartCard 
              key={field.fieldId} 
              field={field}
              onValueClick={handleChartValueClick}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
