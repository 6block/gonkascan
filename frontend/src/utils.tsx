import { bech32 } from 'bech32'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

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

export function isBlockHeight(input: string) {
  const value = input.trim()
  if (!/^(0|[1-9]\d*)$/.test(value)) return false
  const height = Number(value)
  if (!Number.isSafeInteger(height)) return false
  if (height <= 0) return false
  return true
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

export function formatGas(gas: number) {
  if (gas >= 1e9) return (gas / 1e9).toFixed(2) + 'b'
  if (gas >= 1e6) return (gas / 1e6).toFixed(2) + 'm'
  if (gas >= 1e3) return (gas / 1e3).toFixed(2) + 'k'
  return gas.toString()
}