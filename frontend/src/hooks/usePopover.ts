import { useState, useRef, useEffect, useCallback } from 'react'

export interface PopoverPos {
  top: number
  left: number
}

export function usePopover() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PopoverPos>({ top: 0, left: 0 })
  const popoverRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback((e: React.MouseEvent) => {
    if (open) {
      setOpen(false)
      return
    }
    const btn = e.currentTarget as HTMLElement
    const rect = btn.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(true)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return { open, pos, toggle, close: () => setOpen(false), popoverRef }
}
