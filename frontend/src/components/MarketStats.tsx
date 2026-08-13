import { useQuery } from '@tanstack/react-query'
import { apiFetch, formatCompact, formatDecimal, timeAgo } from '../utils'

type DexStats = {
  price: number
  price_change_24h: number
  volume_24h_usd: number
  liquidity_usd: number
  pair: string
  source: string
  pool_url: string
  updated_at: string
}

type MarketResponse = {
  dex_stats: DexStats | null
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

export function MarketStats() {
  const { data } = useQuery<MarketResponse>({
    queryKey: ['market-stats'],
    queryFn: () => apiFetch('/v1/stats/market'),
    refetchInterval: 600000,
  })

  if (!data) return null

  const { market_stats } = data
  // Uniswap is the headline price; fall back to the HEX mid price if the DEX
  // poll has not landed yet.
  const dex = data.dex_stats
  const headlinePrice = dex?.price ?? market_stats.price
  const headlineUpdatedAt = dex?.updated_at ?? market_stats.updated_at

  return (
    <section className="surface p-4 sm:p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="section-title">Market &amp; Token Data</h2>
          <p className="section-subtitle mt-0.5">Live GNK market depth and supply metrics</p>
        </div>

        <a
          href={dex?.pool_url ?? 'https://hex.exchange/otc/gonka38261660'}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-accent-300 hover:text-accent-200 transition-colors"
        >
          {dex ? 'Powered by Uniswap' : 'Powered by HEX'}
          <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>

      {/* Uniswap headline price + HEX OTC as secondary reference */}
      <div className="surface-inset p-4 sm:p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-8">
          <div className="shrink-0 lg:min-w-[260px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">GNK Price</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-500/12 border border-accent-400/30">
                <span className="w-1.5 h-1.5 bg-accent-400 rounded-full animate-live-pulse shadow-[0_0_6px_rgba(62,229,177,0.7)]" />
                <span className="text-[9.5px] font-bold text-accent-300 tracking-widest">LIVE</span>
              </span>
              <span className="text-slate-500 text-[11px]">· {timeAgo(headlineUpdatedAt)}</span>
            </div>

            <div className="flex items-baseline gap-2.5 flex-wrap">
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight tabular-nums break-words">
                <span className="text-slate-500 font-semibold mr-0.5">$</span>
                {formatDecimal(headlinePrice)}
              </div>
              {dex && dex.price_change_24h !== 0 && (
                <span className={`text-sm font-bold tabular-nums ${
                  dex.price_change_24h >= 0 ? 'text-accent-300' : 'text-red-400'
                }`}>
                  {dex.price_change_24h >= 0 ? '▲' : '▼'} {Math.abs(dex.price_change_24h).toFixed(2)}%
                  <span className="text-slate-500 font-medium ml-1">24h</span>
                </span>
              )}
            </div>

            {dex && (
              <a
                href={dex.pool_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1.5 text-[11px] text-slate-500 hover:text-accent-300 transition-colors"
              >
                Uniswap V3 · {dex.pair} · Ethereum
              </a>
            )}
          </div>

          {dex && (
            <div className="flex gap-8 sm:gap-10 lg:pb-1">
              {[
                { label: '24h Volume', value: dex.volume_24h_usd },
                { label: 'Liquidity', value: dex.liquidity_usd },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                    {item.label}
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-50 tabular-nums tracking-tight">
                    ${formatCompact(item.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HEX OTC — a thinner second market, kept for reference */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-x-5 gap-y-2">
          <a
            href="https://hex.exchange/otc/gonka38261660"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-accent-300 transition-colors"
          >
            HEX OTC · NEAR
          </a>
          <span className="text-base font-bold text-slate-200 tabular-nums">
            ${formatDecimal(market_stats.price)}
          </span>
          <span className="text-[11px] text-slate-500 tabular-nums">
            Buy <span className="text-accent-300 font-semibold">${formatDecimal(market_stats.best_bid)}</span>
            <span className="mx-2 text-slate-700">/</span>
            Sell <span className="text-red-400 font-semibold">${formatDecimal(market_stats.best_ask)}</span>
            <span className="mx-2 text-slate-700">/</span>
            spread <span className="text-slate-400 font-semibold">{market_stats.spread_percent.toFixed(2)}%</span>
          </span>
          <span className="text-[11px] text-slate-600">{timeAgo(market_stats.updated_at)}</span>
        </div>
      </div>

      {/* Token stats grid */}
      {/* <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: 'Circulating supply', value: token_stats.user_circulating },
          { label: 'Total supply', value: token_stats.total_supply },
          { label: 'Mining rewards', value: token_stats.total_mining_rewards },
          { label: 'Genesis allocation', value: token_stats.genesis_total },
          { label: 'System tokens', value: token_stats.module_balance },
          { label: 'Community pool', value: token_stats.community_pool },
        ].map((item) => (
          <div key={item.label}>
            <div className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
              {item.label}
            </div>
            <div className="text-[15px] sm:text-base lg:text-lg font-bold text-slate-50 tabular-nums break-words tracking-tight">
              {formatInt(item.value)}
            </div>
          </div>
        ))}
      </div> */}
    </section>
  )
}
