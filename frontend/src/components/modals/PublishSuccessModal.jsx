/**
 * PublishSuccessModal – Success dialog shown after publishing a form
 * Displays the public link and provides Copy/Open/Close actions
 */
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function PublishSuccessModal({ shareToken, onClose }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const publicLink = `${window.location.origin}/f/${shareToken}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link', err)
    }
  }

  const handleOpen = () => {
    window.open(publicLink, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-fade-in">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('modals.publishSuccess')}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Success message */}
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
            {t('modals.publishSuccessMessage')}
          </p>

          {/* Link Display */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('modals.publicLink')}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              <input
                type="text"
                value={publicLink}
                readOnly
                className="flex-1 truncate bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300"
              />
              <button
                onClick={handleCopy}
                title={t('common.copyLink')}
                className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>

            {copied && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                {t('common.copiedToClipboard')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('common.close')}
          </button>
          <button
            onClick={handleOpen}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700"
          >
            <ExternalLink size={16} />
            {t('common.openForm')}
          </button>
        </div>
      </div>
    </div>
  )
}
