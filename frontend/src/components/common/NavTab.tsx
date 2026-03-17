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
