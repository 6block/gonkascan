import { useState, useRef, useEffect } from 'react'

interface NavTabProps {
  active: boolean
  onClick: () => void
  children: string
}

export function NavTab({ active, onClick, children }: NavTabProps) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap shrink-0 px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

interface NavDropdownProps {
  label: string
  active: boolean
  items: { page: string; label: string }[]
  activePage: string
  onSelect: (page: string) => void
}

export function NavDropdown({ label, active, items, activePage, onSelect }: NavDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`whitespace-nowrap shrink-0 px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-colors flex items-center gap-1 ${
          active
            ? 'bg-gray-900 text-white'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        {label}
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 min-w-[180px]">
          {items.map(item => (
            <button
              key={item.page}
              onClick={() => {
                onSelect(item.page)
                setOpen(false)
              }}
              className={`block w-full text-left px-4 py-2.5 text-sm sm:text-base font-medium transition-colors ${
                activePage === item.page
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
