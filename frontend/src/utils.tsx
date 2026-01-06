import { bech32 } from 'bech32'

export function isValidGonkaAddress(address: string): boolean {
  try {
    const decoded = bech32.decode(address)
    if (decoded.prefix !== 'gonka') {
      return false
    }
    bech32.fromWords(decoded.words)
    return true
  } catch {
    return false
  }
}

export function isHex64(input: string) {
  return /^[A-Fa-f0-9]{64}$/.test(input)
}

export function formatGNK(value: number | null | undefined) {
  if (value == null) return '-'
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} gonka`
}

export function timeAgo(date: string | number | Date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)

  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
