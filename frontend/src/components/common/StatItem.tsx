import type { ReactNode } from 'react'

interface StatItemProps {
  label: string
  children: ReactNode
  subText?: ReactNode
}

export function StatItem({ label, children, subText }: StatItemProps) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{children}</div>
      {subText !== undefined && (
        <div className="text-xs text-gray-500 mt-1 min-h-[1.25rem]">{subText}</div>
      )}
    </div>
  )
}
