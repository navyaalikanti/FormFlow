/**
 * StatusBadge – Displays form status (Draft, Published, Archived, Live Draft)
 * and response-collection status badges (Accepting, Limit Reached, Deadline Passed, Closed).
 *
 * "live_draft" is a virtual status used in the UI only: it represents a form
 * that is currently being edited as a draft while its last published version
 * is still live and accessible to the public.
 */
import { useTranslation } from 'react-i18next'

const styles = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  live_draft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  // Response-collection status badges
  accepting: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  limit_reached: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500',
  deadline_passed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const dots = {
  accepting: 'bg-emerald-500',
  limit_reached: 'bg-amber-500',
  deadline_passed: 'bg-red-500',
  closed: 'bg-slate-400',
}

const COLLECTION_STATUSES = new Set(['accepting', 'limit_reached', 'deadline_passed', 'closed'])

export default function StatusBadge({ status }) {
  const { t } = useTranslation()

  const labels = {
    draft: t('forms.draft'),
    live_draft: t('builder.live'),
    published: t('forms.published'),
    archived: t('forms.archived'),
    // Response collection statuses (not i18n'd yet – can be added later)
    accepting: 'Accepting Responses',
    limit_reached: 'Response Limit Reached',
    deadline_passed: 'Deadline Passed',
    closed: 'Closed',
  }

  const isCollection = COLLECTION_STATUSES.has(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.draft}`}
    >
      {isCollection && (
        <span className={`h-1.5 w-1.5 rounded-full ${dots[status] || 'bg-slate-400'}`} />
      )}
      {labels[status] || status}
    </span>
  )
}

/**
 * Derive the collection-status badge key from a form object.
 * Returns one of: 'accepting' | 'limit_reached' | 'deadline_passed' | 'closed'
 * Call only for published (or live_draft) forms.
 */
export function getCollectionStatus(form) {
  if (!form) return null

  const now = new Date()

  // Check deadline first
  if (form.deadline_enabled && form.deadline_datetime) {
    if (now > new Date(form.deadline_datetime)) return 'deadline_passed'
  }

  // Check response count (only if we have the count available)
  if (form.limit_enabled && form.max_responses != null) {
    if ((form.current_response_count ?? 0) >= form.max_responses) return 'limit_reached'
  }

  return 'accepting'
}
