/**
 * ArchiveConfirmModal – Confirmation dialog for archiving a form
 */
import { AlertTriangle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ArchiveConfirmModal({ formTitle, onConfirm, onCancel, loading }) {
  const { t } = useTranslation()

  const benefits = t('modals.archiveBenefits', { returnObjects: true })
  const benefitsList = Array.isArray(benefits) ? benefits : [
    "Public link will no longer accept responses",
    "Existing responses remain available",
    "You can still view version history",
    "You can restore this form later"
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('modals.archiveForm')}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="mb-4 text-slate-600 dark:text-slate-300">
            {t('modals.archiveDescription')}
          </p>
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <strong>"{formTitle}"</strong>
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {benefitsList.map((benefit, idx) => (
                <li key={idx}>{benefit}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('modals.archiving')}
              </span>
            ) : (
              t('common.archive')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
