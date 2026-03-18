import { useEffect, useState } from 'react'

export function useUrlParam(key: string): [string | null, (value: string | null) => void] {
  const [value, setValue] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get(key)
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }, [key, value])

  return [value, setValue]
}
