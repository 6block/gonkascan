import { useState } from 'react'
import { usePopover } from '../../hooks/usePopover'

interface FilterSearchPopoverProps {
  popover: ReturnType<typeof usePopover>
  placeholder?: string
  value: string | null
  onApply: (value: string | null) => void
}

export function FilterSearchPopover({ popover, placeholder = 'Search...', value, onApply }: FilterSearchPopoverProps) {
  const [input, setInput] = useState(value || '')

  if (!popover.open) return null

  return (
    <div
      ref={popover.popoverRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72"
      style={{ top: popover.pos.top, left: popover.pos.left }}
    >
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 mb-3"
        autoFocus
      />
      <div className="flex items-center gap-3">
        <button
          onClick={() => { onApply(input || null); popover.close() }}
          className="w-1/2 text-sm font-medium bg-blue-500 text-white rounded px-3 py-1.5 hover:bg-blue-600"
        >
          Apply
        </button>
        <button
          onClick={() => { setInput(''); onApply(null); popover.close() }}
          className="w-1/2 text-sm text-gray-400 hover:text-gray-600 text-center"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
