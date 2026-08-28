import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function AuthModal({ isOpen, onClose, children }) {
  // Listen for the escape key to close the modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Disable body scrolling when modal is open
    document.body.style.overflow = 'hidden'

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md transition-all duration-300 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95 overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: '0.4s' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close auth dialog"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 bg-white/50 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Modal content */}
        <div className="max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
