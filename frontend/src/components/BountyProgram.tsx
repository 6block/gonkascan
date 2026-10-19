import { useState, useEffect, useCallback, useMemo } from 'react'
import { FaGithub, FaDiscord } from 'react-icons/fa'
import { FiExternalLink } from 'react-icons/fi'
import { BackNavigation } from './common/BackNavigation'
import { TabBar } from './common/TabBar'
import { DISCORD_USER_IDS, GITHUB_URL_OVERRIDES, REWARD_DATA, type PayoutCurrency } from '../data/bountyData'
import { buildAddressRanking, sortRanking, totalByCurrency } from '../data/bountyRank'

const DISCORD_INVITE_CODE = 'RADwCT2U6R'

const iconClass = 'inline-block ml-0.5 align-baseline relative -top-px'
const GitHubSmallIcon = () => <FaGithub className={`text-[14px] ${iconClass}`} />
const ExternalLinkIcon = () => <FiExternalLink className={`text-[12px] ${iconClass}`} />
const DiscordSmallIcon = () => <FaDiscord className={`text-[14px] ${iconClass}`} />

function truncateAddress(addr: string) {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 12)}...${addr.slice(-6)}`
}

function useDiscordStats() {
  const [stats, setStats] = useState<{ online: number | null; total: number | null }>({ online: null, total: null })

  const fetchStats = useCallback(async () => {
    try {
      const resp = await fetch(
        `https://discord.com/api/v9/invites/${DISCORD_INVITE_CODE}?with_counts=true`,
      )
      if (resp.ok) {
        const data = await resp.json()
        setStats({
          online: data.approximate_presence_count ?? null,
          total: data.approximate_member_count ?? null,
        })
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 2 * 60 * 60 * 1000) // 2h
    return () => clearInterval(interval)
  }, [fetchStats])

  return stats
}

function resolveDiscordUrl(displayName: string): string | null {
  const id = DISCORD_USER_IDS[displayName]
  return id ? `https://discord.com/users/${id}` : null
}

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CURRENCIES: PayoutCurrency[] = ['USDT', 'GNK']

// --- Shared link style ---
const linkClass = 'text-slate-50 hover:text-accent-300 underline decoration-gray-300 hover:decoration-blue-600 underline-offset-2'
const mutedDash = <span className="text-slate-500">-</span>

function GithubLinks({ names }: { names: string[] }) {
  if (names.length === 0) return mutedDash
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      {names.map((name, i) => (
        <span key={name} className="inline-flex items-center">
          <a
            href={GITHUB_URL_OVERRIDES[name] ?? `https://github.com/${name}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {name}
            <GitHubSmallIcon />
          </a>
          {i < names.length - 1 && <span className="text-slate-500">,</span>}
        </span>
      ))}
    </span>
  )
}

function DiscordLinks({ names }: { names: string[] }) {
  if (names.length === 0) return mutedDash
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      {names.map((name) => {
        const url = resolveDiscordUrl(name)
        return url ? (
          <a key={name} href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {name}
            <DiscordSmallIcon />
          </a>
        ) : (
          <span key={name} className="text-slate-50">{name}</span>
        )
      })}
    </span>
  )
}

function AddressLink({ address }: { address: string }) {
  return (
    <a
      href={`?page=address&address=${address}`}
      className="text-accent-300 hover:text-accent-200 font-mono text-xs"
      title={address}
    >
      {truncateAddress(address)}
    </a>
  )
}

type Tab = 'records' | 'rank'

export function BountyProgram() {
  const [activeTab, setActiveTab] = useState<Tab>('records')
  const [rankSort, setRankSort] = useState<PayoutCurrency>('USDT')
  const discordStats = useDiscordStats()

  const handleBack = () => {
    window.history.pushState({}, '', '?page=resource')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const ranking = useMemo(() => sortRanking(buildAddressRanking(REWARD_DATA), rankSort), [rankSort])
  const totalDistributed = useMemo(() => totalByCurrency(REWARD_DATA), [])

  return (
    <div className="space-y-6">
      <BackNavigation onBack={handleBack} backLabel="Resource" title="Bounty Program"/>

      {/* Discord Community */}
      <div className="surface p-4 sm:p-6">
        <h3 className="text-base font-semibold text-slate-50 mb-4">Discord community</h3>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img src="/gonka.svg" alt="Gonka" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-50 truncate">Gonka Official</div>
              <div className="text-xs text-slate-400 truncate">
                Live: {discordStats.online?.toLocaleString() ?? '...'} &bull;&nbsp;
                Total: {discordStats.total?.toLocaleString() ?? '...'}
              </div>
            </div>
          </div>
          <a
            href="https://discord.com/invite/RADwCT2U6R"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center px-4 sm:px-5 h-9 bg-[#5865F2] text-white text-sm font-medium rounded-lg hover:bg-[#4752C4] transition-colors"
          >
            Join
          </a>
        </div>
        <p className="text-sm text-slate-400 mt-4 leading-relaxed">
          Join our Discord community to get the latest bounty program updates, technical support, and connect with other developers.
        </p>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Addresses and amounts are taken from on-chain payouts (upgrade handlers and governance proposals).
        Payouts up to v0.2.11 were made in GNK, and later payouts in USDT. GitHub and Discord handles come
        from Discord announcements and are for reference only. The only sources of truth for exact details
        are on-chain transactions and GitHub records.
      </p>

      {/* Tabs */}
      <TabBar
        tabs={['records', 'rank'] as Tab[]}
        activeTab={activeTab}
        onChange={setActiveTab}
        label={(tab) => tab === 'records' ? 'Reward Records' : 'Rank'}
      />

      {/* Tab Content */}
      {activeTab === 'records' ? (
        <div className="space-y-6">
          {REWARD_DATA.map((group, gi) => (
            <div key={gi} className="surface overflow-hidden">
              <div className="bg-white/[0.02] border-b border-white/[0.06] px-5 py-3">
                <div className="font-semibold text-slate-50">{group.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Paid in {group.currency} &bull; {group.time} &bull;&nbsp;
                  <a href={`?page=governance&proposal_id=${group.proposalId}`} className={linkClass}>
                    Proposal #{group.proposalId}
                  </a>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[15%]" />
                    <col />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2.5 px-4 font-medium text-slate-300">Address</th>
                      <th className="text-right py-2.5 px-4 font-medium text-slate-300">Amount ({group.currency})</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-300">GitHub</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-300">Task</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-300">Discord</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.records.map((r, ri) => {
                      return (
                        <tr key={ri} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] align-top">
                          <td className="py-2.5 px-4">
                            <AddressLink address={r.address} />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-50 whitespace-nowrap">
                            {formatAmount(r.amount)}
                          </td>
                          <td className="py-2.5 px-4">
                            <GithubLinks names={r.githubUsername ? r.githubUsername.split(', ') : []} />
                          </td>
                          <td className="py-2.5 px-4 text-slate-300 break-words">
                            {r.task ? (
                              r.taskUrl ? (
                                <a
                                  href={r.taskUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-300 hover:text-accent-300 underline decoration-gray-300 hover:decoration-blue-600 underline-offset-2"
                                >
                                  {r.task}<ExternalLinkIcon />
                                </a>
                              ) : (
                                <span>{r.task}</span>
                              )
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <DiscordLinks names={r.discord ? [r.discord] : []} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[18%]" />
                <col className="w-[26%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                  <th className="text-left py-3 px-4 font-medium text-slate-300">#</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Address</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">GitHub</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Discord</th>
                  {CURRENCIES.map((currency) => (
                    <th key={currency} className="text-right py-3 px-4 font-medium" aria-sort={rankSort === currency ? 'descending' : 'none'}>
                      <button
                        type="button"
                        onClick={() => setRankSort(currency)}
                        className={`inline-flex items-center gap-1 transition-colors ${
                          rankSort === currency ? 'text-slate-50' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {currency}
                        <span aria-hidden="true" className="text-[10px]">{rankSort === currency ? '▼' : '↕'}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, i) => (
                  <tr key={row.address} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 text-slate-500">{i + 1}</td>
                    <td className="py-2.5 px-4"><AddressLink address={row.address} /></td>
                    <td className="py-2.5 px-4 font-medium"><GithubLinks names={row.githubUsernames} /></td>
                    <td className="py-2.5 px-4 font-medium"><DiscordLinks names={row.discordNames} /></td>
                    {CURRENCIES.map((currency) => (
                      <td key={currency} className="py-2.5 px-4 text-right font-mono whitespace-nowrap text-slate-50">
                        {row.totals[currency] > 0 ? formatAmount(row.totals[currency]) : mutedDash}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/[0.02] border-t border-white/[0.06]">
                  <td className="py-3 px-4" />
                  <td className="py-3 px-4 font-semibold text-slate-50" colSpan={3}>Total Distributed</td>
                  {CURRENCIES.map((currency) => (
                    <td key={currency} className="py-3 px-4 text-right font-semibold text-slate-50 font-mono whitespace-nowrap">
                      {formatAmount(totalDistributed[currency])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
