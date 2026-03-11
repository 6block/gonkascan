import { useQuery } from '@tanstack/react-query'

type MarketResponse = {
  market_stats: {
    price: number
    best_ask: number
    best_bid: number
    spread_percent: number
    updated_at: string
  }
  token_stats: {
    user_circulating: number
    total_supply: number
    total_mining_rewards: number
    genesis_total: number
    module_balance: number
    community_pool: number
    updated_at: string
  }
}

const formatNumber = (num: number, digits = 4) =>
  num.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

const formatInt = (num: number) => num.toLocaleString()

const minutesAgo = (dateStr: string) => {
  // 如果没有带 Z，强制补 Z（按 UTC 解析）
  const utcString = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`

  const serverTime = new Date(utcString).getTime()
  const now = Date.now()

  const diffMs = now - serverTime

  if (diffMs <= 0) return 0

  return Math.floor(diffMs / 60000)
}

export function MarketStats() {
  const apiUrl = import.meta.env.VITE_API_URL || '/api'

  const { data } = useQuery<MarketResponse>({
    queryKey: ['market-stats'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/v1/stats/market`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    refetchInterval: 600000,
  })

  if (!data) return null

  const { market_stats, token_stats } = data
  const askRatio = 50 + market_stats.spread_percent / 2
  const bidRatio = 100 - askRatio

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Market & Token Data
        </h2>

        <a
          href="https://hex.exchange/otc/gonka38261660"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Data is from HEX →
        </a>
      </div>

      {/* ===== Price + OrderBook 同一个框 ===== */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 mb-6 sm:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* 左边 Price */}
          <div className="shrink-0 sm:min-w-[220px]">
            <div className="flex items-center gap-3 text-sm mb-2">
              <span className="text-gray-600 font-medium">Price</span>

              <span className="flex items-center text-green-600 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Live
              </span>

              <span className="text-gray-400">
                • {minutesAgo(market_stats.updated_at)}m ago
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              ${formatNumber(market_stats.price)}
            </div>
          </div>

          {/* 右边 Sell / Buy */}
          <div className="flex-1">
            <div className="lg:col-span-2 bg-gray-100 rounded-lg p-4 sm:p-5 border border-gray-200">
              <div className="flex justify-between text-lg font-semibold mb-2">
                <span className="text-red-600">
                  Sell ${formatNumber(market_stats.best_ask)}
                </span>

                <span className="text-green-600">
                  Buy ${formatNumber(market_stats.best_bid)}
                </span>
              </div>

              <div className="relative h-2 bg-gray-200 rounded overflow-hidden mb-2">
                <div
                  className="absolute left-0 top-0 h-full bg-red-500"
                  style={{ width: `${askRatio}%` }}
                />
                <div
                  className="absolute right-0 top-0 h-full bg-green-500"
                  style={{ width: `${bidRatio}%` }}
                />
              </div>

              <div className="text-center text-xs text-gray-400">
                {askRatio.toFixed(0)}% / {bidRatio.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 下半部分 Token 数据 ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
        <div>
          <div className="text-xs sm:text-sm text-gray-500 mb-1">Circulating supply</div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">
            {formatInt(token_stats.user_circulating)}
          </div>
        </div>

        <div>
          <div className="text-xs sm:text-sm text-gray-500 mb-1">Total supply</div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">
            {formatInt(token_stats.total_supply)}
          </div>
        </div>

        <div>
          <div className="text-xs sm:text-sm text-gray-500 mb-1">Mining rewards</div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">
            {formatInt(token_stats.total_mining_rewards)}
          </div>
        </div>

        <div>
          <div className="text-xs sm:text-sm text-gray-500 mb-1">Genesis Allocation</div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">
            {formatInt(token_stats.genesis_total)}
          </div>
        </div>

        <div>
          <div className="text-xs sm:text-sm text-gray-500 mb-1">System Tokens</div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">
            {formatInt(token_stats.module_balance)}
          </div>
        </div>

        <div>
          <div className="text-xs sm:text-sm text-gray-500 mb-1">Community pool</div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">
            {formatInt(token_stats.community_pool)}
          </div>
        </div>
      </div>
    </div>
  )
}
