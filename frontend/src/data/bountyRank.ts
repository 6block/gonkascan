import type { PayoutCurrency, RewardGroup } from './bountyData'

export interface AddressRank {
  address: string
  githubUsernames: string[]
  discordNames: string[]
  totals: Record<PayoutCurrency, number>
}

function splitNames(raw: string): string[] {
  return raw.split(',').map((name) => name.trim()).filter(Boolean)
}

// Aggregate payouts per wallet address. GNK and USDT are kept as separate totals
// because they are different assets and cannot be summed.
export function buildAddressRanking(groups: readonly RewardGroup[]): AddressRank[] {
  const byAddress = new Map<string, AddressRank>()

  for (const group of groups) {
    for (const record of group.records) {
      const existing = byAddress.get(record.address)
      const github = record.githubUsername ? splitNames(record.githubUsername) : []
      const discord = record.discord ? [record.discord] : []

      byAddress.set(record.address, {
        address: record.address,
        githubUsernames: [...new Set([...(existing?.githubUsernames ?? []), ...github])],
        discordNames: [...new Set([...(existing?.discordNames ?? []), ...discord])],
        totals: {
          GNK: (existing?.totals.GNK ?? 0) + (group.currency === 'GNK' ? record.amount : 0),
          USDT: (existing?.totals.USDT ?? 0) + (group.currency === 'USDT' ? record.amount : 0),
        },
      })
    }
  }

  return [...byAddress.values()]
}

export function sortRanking(rows: readonly AddressRank[], by: PayoutCurrency): AddressRank[] {
  const other: PayoutCurrency = by === 'USDT' ? 'GNK' : 'USDT'
  return [...rows].sort(
    (a, b) => b.totals[by] - a.totals[by] || b.totals[other] - a.totals[other],
  )
}

export function totalByCurrency(groups: readonly RewardGroup[]): Record<PayoutCurrency, number> {
  return groups.reduce(
    (acc, group) => ({
      ...acc,
      [group.currency]: acc[group.currency] + group.records.reduce((sum, r) => sum + r.amount, 0),
    }),
    { GNK: 0, USDT: 0 } as Record<PayoutCurrency, number>,
  )
}
