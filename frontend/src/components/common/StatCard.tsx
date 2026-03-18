import type { ReactNode } from 'react'

interface StatCardProps {
  label: ReactNode
  children: ReactNode
  valueClassName?: string
  size?: 'sm' | 'lg'
}

export function StatCard({ label, children, valueClassName, size = 'sm' }: StatCardProps) {
  const sizeClass = size === 'lg'
    ? 'text-xl sm:text-2xl'
    : 'text-base sm:text-lg'

  return (
    <div className="bg-gray-50 p-4 rounded">
      <div className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`mt-1 ${sizeClass} font-semibold break-words ${valueClassName || 'text-gray-900'}`}>{children}</div>
    </div>
  )
}
