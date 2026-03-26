import { usePopover } from '../../hooks/usePopover'

interface FilterListPopoverProps {
  popover: ReturnType<typeof usePopover>
  title: string
  options: { label: string; value: string | null }[]
  selected: string | null
  onSelect: (value: string | null) => void
  width?: string
}

export function FilterListPopover({ popover, title, options, selected, onSelect, width = 'w-52' }: FilterListPopoverProps) {
  if (!popover.open) return null

  return (
    <div
      ref={popover.popoverRef}
      className={`fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-3 ${width}`}
      style={{ top: popover.pos.top, left: popover.pos.left }}
    >
      {title && <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</div>}
      <div className="space-y-1">
        {options.map(opt => (
          <button
            key={opt.label}
            onClick={() => { onSelect(selected === opt.value ? null : opt.value); popover.close() }}
            className={`block w-full text-left text-sm px-2 py-1.5 rounded ${
              selected === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
