import type { ReactNode } from 'react'

type BadgeVariant = 'green' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray' | 'dark'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-700 border border-green-300',
  red: 'bg-red-100 text-red-700 border border-red-300',
  orange: 'bg-orange-100 text-orange-700 border border-orange-300',
  yellow: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  blue: 'bg-blue-100 text-blue-700 border border-blue-300',
  gray: 'bg-gray-100 text-gray-700 border border-gray-300',
  dark: 'bg-gray-900 text-white',
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
