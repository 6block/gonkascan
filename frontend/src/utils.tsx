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

export function formatGNK(value: number | null | undefined) {
  if (value == null) return '-'
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} gonka`
}