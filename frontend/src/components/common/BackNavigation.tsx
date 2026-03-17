import type { ReactNode } from 'react'

interface BackNavigationProps {
  onBack: () => void
  backLabel?: string
  title: ReactNode
}

export function BackNavigation({ onBack, backLabel, title }: BackNavigationProps) {
  return (
    <nav className="flex flex-wrap sm:flex-nowrap items-center gap-y-1 text-sm text-gray-500 mb-1 min-w-0">
      <button
        onClick={onBack}
        className="shrink-0 flex items-center gap-1 text-gray-500 hover:text-gray-900 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {backLabel}
      </button>

      <span className="mx-2 shrink-0">/</span>
      <span className="block sm:inline min-w-0 text-gray-900 font-medium break-all sm:break-normal">{title}</span>
    </nav>
  )
}
