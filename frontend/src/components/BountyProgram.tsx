import { useState, useEffect, useCallback } from 'react'
import { FaGithub, FaDiscord } from 'react-icons/fa'
import { FiExternalLink } from 'react-icons/fi'
import { BackNavigation } from './common/BackNavigation'
import { GITHUB_URL_OVERRIDES, REWARD_DATA, CONTRIBUTOR_SUMMARY } from '../data/bountyData'

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

// --- Discord ID map (single source of truth) ---
// Parsed once from CONTRIBUTOR_SUMMARY entries like @Name["discordId"]
const DISCORD_ID_MAP: Record<string, string> = {}
for (const c of CONTRIBUTOR_SUMMARY) {
  const m = c.name.match(/^(@[^"[]+)\["(\d+)"\]/)
  if (m) DISCORD_ID_MAP[m[1]] = m[2]
}

function resolveDiscordUrl(displayName: string): string | null {
  const id = DISCORD_ID_MAP[displayName]
  return id ? `https://discord.com/users/${id}` : null
}

// --- Shared link style ---
const linkClass = 'text-gray-900 hover:text-blue-600 underline decoration-gray-300 hover:decoration-blue-600 underline-offset-2'

// --- Contributor name parsing for Rank table ---

type NamePart = { text: string; url?: string; type: 'discord' | 'github' | 'plain' }

function parseContributorName(raw: string): NamePart[] {
  const parts: NamePart[] = []
  const tokenRe = /(\S+)\["([^"]+)"\]|(@[^\s,&)[\]]+)/g
  let lastIndex = 0
  let m

  while ((m = tokenRe.exec(raw)) !== null) {
    if (m.index > lastIndex) {
      const gap = raw.slice(lastIndex, m.index)
      if (gap) parts.push({ text: gap, type: 'plain' })
    }
    if (m[1] && m[2]) {
      const name = m[1]
      const value = m[2]
      if (name.startsWith('@') && /^\d+$/.test(value)) {
        parts.push({ text: name, url: `https://discord.com/users/${value}`, type: 'discord' })
      } else if (value.startsWith('https://github.com/')) {
        parts.push({ text: name, url: value, type: 'github' })
      } else {
        parts.push({ text: name, type: 'plain' })
      }
    } else if (m[3]) {
      parts.push({ text: m[3], url: resolveDiscordUrl(m[3]) ?? undefined, type: 'discord' })
    }
    lastIndex = m.index + m[0].length
  }

  if (lastIndex < raw.length) {
    const tail = raw.slice(lastIndex)
    if (tail) parts.push({ text: tail, type: 'plain' })
  }

  return parts.length > 0 ? parts : [{ text: raw, type: 'plain' }]
}

function ContributorNameCell({ name }: { name: string }) {
  const parts = parseContributorName(name)

  return (
    <span className="inline-flex flex-wrap items-center gap-x-0">
      {parts.map((p, i) => {
        if (p.url && (p.type === 'github' || p.type === 'discord')) {
          const Icon = p.type === 'github' ? GitHubSmallIcon : DiscordSmallIcon
          return (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {p.text}
              <Icon />
            </a>
          )
        }
        return <span key={i} className="text-gray-900">{p.text}</span>
      })}
    </span>
  )
}

/** Check if a CONTRIBUTOR_SUMMARY name is a discord user. Returns display name + url, or null. */
function getDiscordInfo(name: string): { display: string; url: string | null } | null {
  const m = name.match(/^(@[^"[]+)\["(\d+)"\]/)
  if (m) return { display: m[1], url: `https://discord.com/users/${m[2]}` }
  if (name.startsWith('@')) return { display: name, url: resolveDiscordUrl(name) }
  return null
}

type Tab = 'records' | 'rank'

export function BountyProgram() {
  const [activeTab, setActiveTab] = useState<Tab>('records')
  const discordStats = useDiscordStats()

  const handleBack = () => {
    window.history.pushState({}, '', '?page=resource')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const totalDistributed = REWARD_DATA.reduce(
    (sum, group) => sum + group.records.reduce((s, r) => s + r.amount, 0),
    0,
  )

  return (
    <div className="space-y-6">
      <BackNavigation
        onBack={handleBack}
        backLabel="Resource"
        title="Bounty Program"
      />

      {/* Discord Community */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Discord community</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/gonka.svg" alt="Gonka" className="w-10 h-10 rounded-full shrink-0" />
            <div>
              <div className="text-sm font-semibold text-gray-900">Gonka Official</div>
              <div className="text-xs text-gray-500">
                Live: {discordStats.online?.toLocaleString() ?? '...'} &bull;&nbsp;
                Total: {discordStats.total?.toLocaleString() ?? '...'}
              </div>
            </div>
          </div>
          <a
            href="https://discord.com/invite/RADwCT2U6R"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-[#5865F2] text-white text-sm font-medium rounded-lg hover:bg-[#4752C4] transition-colors"
          >
            Join
          </a>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Join our Discord community to get the latest bounty program updates, technical support, and connect with other developers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['records', 'rank'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm rounded border transition
              ${activeTab === tab ? 'border-gray-800 text-gray-900' : 'border-gray-300 text-gray-400 hover:text-gray-600'}`}
          >
            {tab === 'records' ? 'Reward Records' : 'Rank'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'records' ? (
        <div className="space-y-6">
          {REWARD_DATA.map((group, gi) => (
            <div key={gi} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                <div className="font-semibold text-gray-900">{group.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{group.time}</div>
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
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2.5 px-4 font-medium text-gray-600">Address</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-600">Amount (GNK)</th>
                      <th className="text-left py-2.5 px-4 font-medium text-gray-600">GitHub</th>
                      <th className="text-left py-2.5 px-4 font-medium text-gray-600">Task</th>
                      <th className="text-left py-2.5 px-4 font-medium text-gray-600">Discord</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.records.map((r, ri) => {
                      const discordUrl = r.discord ? resolveDiscordUrl(r.discord) : null
                      return (
                        <tr key={ri} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 align-top">
                          <td className="py-2.5 px-4">
                            {r.address ? (
                              <a
                                href={`?page=address&address=${r.address}`}
                                className="text-blue-600 hover:text-blue-800 font-mono text-xs"
                                title={r.address}
                              >
                                {truncateAddress(r.address)}
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-gray-900 whitespace-nowrap">
                            {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4">
                            {r.githubUsername ? (
                              <a
                                href={GITHUB_URL_OVERRIDES[r.githubUsername] ?? `https://github.com/${r.githubUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={linkClass}
                              >
                                {r.githubUsername}
                                <GitHubSmallIcon />
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-gray-600 break-words">
                            {r.task ? (
                              r.taskUrl ? (
                                <a
                                  href={r.taskUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-blue-600 underline decoration-gray-300 hover:decoration-blue-600 underline-offset-2"
                                >
                                  {r.task}<ExternalLinkIcon />
                                </a>
                              ) : (
                                <span>{r.task}</span>
                              )
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            {r.discord ? (
                              discordUrl ? (
                                <a href={discordUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                  {r.discord}
                                  <DiscordSmallIcon />
                                </a>
                              ) : (
                                <span className="text-gray-900">{r.discord}</span>
                              )
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[30%]" />
                <col className="w-[30%]" />
                <col className="w-[30%]" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Github / Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Discord</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Amount (GNK)</th>
                </tr>
              </thead>
              <tbody>
                {CONTRIBUTOR_SUMMARY.map((c, i) => {
                  const discord = getDiscordInfo(c.name)
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-gray-400">{i + 1}</td>
                      <td className="py-2.5 px-4 font-medium">
                        {discord ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <ContributorNameCell name={c.name} />
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-medium">
                        {discord ? (
                          discord.url ? (
                            <a href={discord.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                              {discord.display}
                              <DiscordSmallIcon />
                            </a>
                          ) : (
                            <span className="text-gray-900">{discord.display}</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center text-gray-900 font-mono">
                        {c.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="py-3 px-4" />
                  <td className="py-3 px-4 font-semibold text-gray-900" colSpan={2}>Total Distributed</td>
                  <td className="py-3 px-4 text-center font-semibold text-gray-900 font-mono">
                    {totalDistributed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
