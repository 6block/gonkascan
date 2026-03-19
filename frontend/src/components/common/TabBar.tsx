interface TabBarProps<T extends string> {
  tabs: T[]
  activeTab: T
  onChange: (tab: T) => void
  label?: (tab: T) => string
  variant?: 'solid' | 'outline'
}

export function TabBar<T extends string>({
  tabs,
  activeTab,
  onChange,
  label,
  variant = 'outline',
}: TabBarProps<T>) {
  const getLabel = label ?? ((tab: T) => tab.charAt(0).toUpperCase() + tab.slice(1))

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`shrink-0 whitespace-nowrap text-sm font-medium rounded border transition-colors ${
            variant === 'solid'
              ? `px-4 py-2 rounded-md ${
                activeTab === tab
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`
              : `px-3 py-1.5 ${
                activeTab === tab
                  ? 'border-gray-800 text-gray-900'
                  : 'border-gray-300 text-gray-400 hover:text-gray-600'
              }`
          }`}
        >
          {getLabel(tab)}
        </button>
      ))}
    </div>
  )
}
