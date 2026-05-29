import { bech32 } from 'bech32'
import { EpochSeriesPoint } from './types/inference'

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

export function toGonka(amount: string | number): number {
  return Number(amount) / 1e9
}

export function formatCompact(n: number, decimals = 2, uppercase = true) {
  const suffix = uppercase ? ['B', 'M', 'K'] : ['b', 'm', 'k']
  if (n >= 1e9) return (n / 1e9).toFixed(decimals) + suffix[0]
  if (n >= 1e6) return (n / 1e6).toFixed(decimals) + suffix[1]
  if (n >= 1e3) return (n / 1e3).toFixed(decimals) + suffix[2]
  return n.toString()
}

export function formatInt(n: string | number | undefined | null): string {
  if (n === undefined || n === null) return '-'
  const num = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(num)) return '-'
  return num.toLocaleString('en-US')
}

export function formatDecimal(num: number, digits = 4) {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatGNK(value: number | null | undefined) {
  if (value == null) return '-'
  return `${formatDecimal(value, 2)} GNK`
}

// IBC voucher hash -> human-readable symbol and decimals.
// Hashes are SHA-256 of "<path>/<base_denom>" as returned by the chain's
// /ibc/apps/transfer/v1/denom_traces endpoint.
interface DenomMeta {
  symbol: string
  decimals: number
}

const IBC_DENOM_MAP: Record<string, DenomMeta> = {
  // erc20/tether/usdt via transfer/channel-5 (Kava EVM USDT)
  'ibc/115F68FBA220A028C6F6ED08EA0C1A9C8C52798B14FB66E6C89D5D8C06A524D4': { symbol: 'USDT', decimals: 6 },
  // uusdt via transfer/channel-0 (Axelar USDT)
  'ibc/0C9E2F9CC7C99D6C274F148C313E4231F383E8AAD4E1C18A260E5479F96C62ED': { symbol: 'USDT', decimals: 6 },
  // uusdt via transfer/channel-3/transfer/channel-10/transfer/channel-208
  'ibc/D3AD3CA38F2C1AB7F5406FFB5BF10701F2004B646FD806AE5767DDEC02F916F2': { symbol: 'USDT', decimals: 6 },
  // uusdt via transfer/channel-3/transfer/channel-2
  'ibc/4F64FF736B88BA8EA521D6D515D9652B7C23C903BF91ECEFB3991888F3C023F4': { symbol: 'USDT', decimals: 6 },
  // uusdc via transfer/channel-0 (Axelar USDC)
  'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5': { symbol: 'USDC', decimals: 6 },
  // uusdc via transfer/channel-3/transfer/channel-10/transfer/channel-208
  'ibc/050330FBDF981EB546270962B8F6F9658F288E21D2166DFF2ABDBA53338BC1AD': { symbol: 'USDC', decimals: 6 },
  // uusdc via transfer/channel-3/transfer/channel-2
  'ibc/B27B5CC721C3CB27B4B61BE8BEF3ECFCC3F6D9D4ED0DA8AC8634A534C54DD527': { symbol: 'USDC', decimals: 6 },
  // uaxl via transfer/channel-0 (Axelar native)
  'ibc/2CC0B1B7A981ACC74854717F221008484603BB8360E81B262411B0D830EDE9B0': { symbol: 'AXL', decimals: 6 },
  // uaxl via transfer/channel-2
  'ibc/C0E66D1C81D8AAF0E6896E05190FDFBC222367148F86AC3EA679C28327A763CD': { symbol: 'AXL', decimals: 6 },
}

function shortDenom(denom: string): string {
  if (denom.startsWith('ibc/') && denom.length > 14) {
    return `ibc/${denom.slice(4, 10)}…${denom.slice(-4)}`
  }
  return denom
}

// Format a chain coin (amount + denom) for display.
// - ngonka -> "X.XX GNK" with 1e9 scaling.
// - known IBC voucher (USDT/USDC/AXL/...) -> "X.XX SYMBOL" with the right decimals.
// - unknown denom -> raw amount + a truncated denom so the value is at least
//   technically correct rather than mislabelled.
export function formatCoin(amount: string | number, denom: string): string {
  const raw = typeof amount === 'string' ? amount : String(amount)
  if (!denom) {
    return formatInt(raw)
  }
  if (denom === 'ngonka') {
    return formatGNK(toGonka(raw))
  }
  if (denom === 'gonka') {
    return `${formatDecimal(Number(raw), 2)} GNK`
  }
  const meta = IBC_DENOM_MAP[denom]
  if (meta) {
    const scaled = Number(raw) / Math.pow(10, meta.decimals)
    return `${formatDecimal(scaled, 2)} ${meta.symbol}`
  }
  return `${formatInt(raw)} ${shortDenom(denom)}`
}

export function timeAgo(date: string | number | Date) {
  const raw = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+') ? `${date}Z` : date
  const diff = Math.floor((Date.now() - new Date(raw).getTime()) / 1000)

  if (diff <= 0) return '0s ago'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function formatCountdown(seconds: number): string {
  const totalSeconds = Math.floor(seconds)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export function formatDateTime(date: string | number | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Invalid Date'
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

export function formatDateWithOrdinal(dateStr: string) {
  const date = new Date(dateStr)

  const day = date.getDate()
  const year = date.getFullYear()
  const month = date.toLocaleString('en-US', {
    month: 'short',
  })

  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th'

  return `${month} ${day}${suffix}, ${year}`
}

export function formatMessageTypes(messages?: { ['@type']?: string }[]) {
  if (!messages || messages.length === 0) return null
  const seen = new Set<string>()
  const result: string[] = []

  for (const m of messages) {
    if (!m['@type']) return null
    const type = m['@type'].startsWith('/') ? m['@type'].slice(1) : m['@type']
    const last = type.split('.').pop() || type
    const noMsg = last.replace(/^Msg/, '')
    const spaced = noMsg.replace(/([A-Z])/g, ' $1').trim()
    const typeUpperCase = spaced.toUpperCase()
    if (!typeUpperCase) continue

    if (!seen.has(typeUpperCase)) {
      seen.add(typeUpperCase)
      result.push(typeUpperCase)
    }
  }

  return result.length > 0 ? result.join(', ') : null
}

export function shortHash(hash: string, len = 10) {
  return `${hash.slice(0, len)}…${hash.slice(-len)}`
}

type EpochRow = { epoch: number } & Record<string, number>

export function buildEpochRows(series: Record<string, EpochSeriesPoint[]>): EpochRow[] {
  const epochMap = new Map<number, EpochRow>()
  const models = Object.keys(series)

  for (const [model, points] of Object.entries(series)) {
    for (const p of points) {
      if (!epochMap.has(p.epoch_id)) {
        epochMap.set(p.epoch_id, { epoch: p.epoch_id })
      }
      epochMap.get(p.epoch_id)![model] = p.value
    }
  }

  for (const row of epochMap.values()) {
    for (const model of models) {
      if (row[model] == null) {
        row[model] = 0
      }
    }
  }

  return Array.from(epochMap.values()).sort((a, b) => a.epoch - b.epoch)
}