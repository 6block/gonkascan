import { useEffect, type ReactNode } from 'react'

interface BaseModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function BaseModal({ title, onClose, children }: BaseModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-h-[100dvh] sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg shadow-xl overflow-y-auto pb-6 sm:pb-0">
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight min-w-0">{title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 -mr-1 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">{children}</div>
      </div>
    </div>
  )
}
