import type { ReactNode } from 'react'

interface BackNavigationProps {
  onBack: () => void
  backLabel?: string
  title: ReactNode
  badge?: { label: string; color: 'blue' | 'orange' }
}

export function BackNavigation({ onBack, backLabel, title, badge }: BackNavigationProps) {
  return (
    <nav className="min-w-0">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition mb-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {backLabel}
      </button>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg sm:text-xl font-semibold text-gray-900 break-all">{title}</span>
        {badge && (
          <span className={`shrink-0 inline-block px-3 py-1 text-sm font-semibold rounded-md ${
            badge.color === 'blue'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-orange-100 text-orange-700'
          }`}>
            {badge.label}
          </span>
        )}
      </div>
    </nav>
  )
}
