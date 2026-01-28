import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { MessageBlock, JsonViewer } from './TransactionDetail'
import { MarkdownViewer } from './MarkdownViewer'
import { formatCompactNumber, formatMessageTypes } from './Governance'
import { VoteBubblePack } from './VoteBubblePack'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

type VoteTx = {
  height: string
  txhash: string
  timestamp: string
  tx: {
    body: {
      messages: Array<{
        '@type': string
        voter?: string
        option?: string
        weight?: string
      }>
    }
  }
}

function getVoteWeight(tx: VoteTx): number {
  const msg = tx.tx.body.messages[0]
  if (msg?.weight) {
    const w = Number(msg.weight)
    return Number.isFinite(w) ? w : 0
  }
  return 0
}

function formatNumber(n: string | number | undefined): string {
  if (n === undefined || n === null) return '-'
  const num = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(num)) return '-'
  return num.toLocaleString('en-US')
}

type VoteType = 'YES' | 'NO' | 'VETO' | 'ABSTAIN' | 'UNKNOWN'

function parseVoteType(tx: any): VoteType {
  const msg = tx?.tx?.body?.messages?.[0]
  const typeUrl = msg?.['@type'] as string | undefined

  if (!msg || !typeUrl || !typeUrl.endsWith('MsgVote')) return 'UNKNOWN'

  switch (msg.option) {
    case 'VOTE_OPTION_YES':
      return 'YES'
    case 'VOTE_OPTION_NO':
      return 'NO'
    case 'VOTE_OPTION_NO_WITH_VETO':
      return 'VETO'
    case 'VOTE_OPTION_ABSTAIN':
      return 'ABSTAIN'
    default:
      return 'UNKNOWN'
  }
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null

  const ts = payload[0]?.payload?.ts
  const timeLabel = ts
    ? new Date(ts).toLocaleString(undefined, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div className="bg-white rounded-md shadow px-4 py-3 text-sm space-y-2">
      {/* 时间标题 */}
      <div className="font-medium text-gray-800 border-b pb-1">{timeLabel}</div>

      {/* 各投票类型 */}
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          style={{ color: p.stroke }}
          className="flex justify-between gap-4"
        >
          <span>{p.dataKey}</span>
          <span>{p.value.toLocaleString('en-US')}</span>
        </div>
      ))}
    </div>
  )
}

function formatVotingTimeRange(start?: string, end?: string) {
  if (!start || !end) return null

  const fmt = (iso: string) => {
    const d = new Date(iso) // Z => 自动按本地时区展示
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
  }

  return `${fmt(start)} ~ ${fmt(end)}`
}

function splitMessageTypeTags(label: string | null) {
  if (!label) return []
  return label
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function dedupeLatestVotesByVoter(votes: VoteTx[]): VoteTx[] {
  const map = new Map<string, VoteTx>()

  for (const tx of votes) {
    const msg = tx.tx.body.messages[0]
    const voter = msg?.voter
    if (!voter) continue

    const prev = map.get(voter)
    if (!prev) {
      map.set(voter, tx)
      continue
    }

    const prevTs = new Date(prev.timestamp).getTime()
    const currTs = new Date(tx.timestamp).getTime()

    if (currTs > prevTs) {
      map.set(voter, tx)
    }
  }

  return Array.from(map.values())
}

type GithubMetadataCandidates = {
  rawMain: string
  rawCommit?: string
  blobMain: string
  blobCommit?: string
}

function extractMetadataLikeUrl(
  metadata?: string | null,
  summary?: string | null
): { url: string; source: 'metadata' | 'summary' } | null {
  if (metadata && metadata.trim()) {
    return { url: metadata.trim(), source: 'metadata' }
  }

  if (!summary) return null

  const s = summary.trim()
  if (!/^https?:\/\/\S+$/.test(s)) {
    return null
  }

  try {
    const u = new URL(s)
    if (
      u.hostname === 'github.com' ||
      u.hostname === 'raw.githubusercontent.com' ||
      u.hostname.includes('forum') ||
      u.hostname.includes('discourse')
    ) {
      return { url: s, source: 'summary' }
    }
  } catch {
    return null
  }

  return null
}

function normalizeGithubMetadataCandidates(
  input: string
): GithubMetadataCandidates | null {
  try {
    const u = new URL(input)

    let owner = ''
    let repo = ''
    let filePath = ''
    let commit: string | undefined

    if (u.hostname === 'raw.githubusercontent.com') {
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length < 3) return null

      owner = parts[0]
      repo = parts[1]
      const ref = parts[2]
      filePath = parts.slice(3).join('/')
      if (!filePath) {
        filePath = 'README.md'
      }

      if (ref !== 'main') {
        commit = ref
      }
    } else if (u.hostname === 'github.com') {
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length < 4) return null

      owner = parts[0]
      repo = parts[1]
      const type = parts[2] // blob | tree | commit
      const ref = parts[3]
      filePath = parts.slice(4).join('/')

      if (!filePath) {
        filePath = 'README.md'
      }

      if (
        (type === 'blob' || type === 'commit' || type === 'tree') &&
        ref !== 'main'
      ) {
        commit = ref
      }
    } else {
      return null
    }

    return {
      rawMain: `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`,
      rawCommit: commit
        ? `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${filePath}`
        : undefined,

      blobMain: `https://github.com/${owner}/${repo}/blob/main/${filePath}`,
      blobCommit: commit
        ? `https://github.com/${owner}/${repo}/blob/${commit}/${filePath}`
        : undefined,
    }
  } catch {
    return null
  }
}

type ProposalMetadataProps = {
  metadata?: string | null
  summary?: string | null
}

type ResolvedMetadata = {
  content: string
  raw: string
  blob: string
  source: 'main' | 'commit'
  from: 'metadata' | 'summary'
}

export function ProposalMetadata({ metadata, summary }: ProposalMetadataProps) {
  // 1️⃣ 统一入口：选用 metadata / summary
  const metaLike = useMemo(() => {
    return extractMetadataLikeUrl(metadata, summary)
  }, [metadata, summary])

  // 2️⃣ 解析 GitHub 候选
  const candidates = useMemo(() => {
    return metaLike ? normalizeGithubMetadataCandidates(metaLike.url) : null
  }, [metaLike])

  const { data, isLoading } = useQuery<ResolvedMetadata | null>({
    queryKey: ['proposal-metadata', metaLike, candidates],
    queryFn: async () => {
      if (!candidates || !metaLike) return null

      const tryFetch = async (raw: string) => {
        const r = await fetch(raw)
        if (!r.ok) throw new Error('not found')
        return r.text()
      }

      // main 优先
      try {
        const text = await tryFetch(candidates.rawMain)
        return {
          content: text,
          raw: candidates.rawMain,
          blob: candidates.blobMain,
          source: 'main',
          from: metaLike.source,
        }
      } catch {}

      if (candidates.rawCommit && candidates.blobCommit) {
        try {
          const text = await tryFetch(candidates.rawCommit)
          return {
            content: text,
            raw: candidates.rawCommit,
            blob: candidates.blobCommit,
            source: 'commit',
            from: metaLike.source,
          }
        } catch {}
      }

      return null
    },
    enabled: !!candidates,
  })

  if (!metaLike || !candidates) return null
  if (isLoading) {
    return (
      <section className="bg-white border rounded-lg p-6">
        <div className="text-sm text-gray-500">Loading metadata…</div>
      </section>
    )
  }
  if (!data) return null

  return (
    <section className="bg-white border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">METADATA</h3>

          {/* 来源标注 */}
          {data.from === 'summary' && (
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              summary
            </span>
          )}

          {/* 历史文档标注 */}
          {data.source === 'commit' && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
              commit
            </span>
          )}
        </div>

        <a
          href={data.blob}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Open original ↗
        </a>
      </div>

      <MarkdownViewer content={data.content} />
    </section>
  )
}

export function GovernanceDetail({ proposalId }: { proposalId: string }) {
  const [copied, setCopied] = useState(false)
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const [tab, setTab] = useState<'details' | 'vote' | 'json'>('details')
  const [voteFilter, setVoteFilter] = useState<
    'ALL' | 'YES' | 'NO' | 'VETO' | 'ABSTAIN'
  >('ALL')
  const [voterKeyword, setVoterKeyword] = useState('')
  const [sortKey, setSortKey] = useState<'weight' | 'height'>('weight')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: proposalData, isLoading } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      const r = await fetch(`${apiUrl}/v1/proposals/${proposalId}`)
      if (!r.ok) throw new Error('Failed to load proposal')
      return r.json()
    },
  })

  const { data: txData } = useQuery({
    queryKey: ['proposal-transactions', proposalId],
    queryFn: async () => {
      const r = await fetch(`${apiUrl}/v1/proposals/${proposalId}/transactions`)
      if (!r.ok) throw new Error('Failed to load vote txs')
      return r.json()
    },
    enabled: !!proposalId,
  })

  if (isLoading || !proposalData) {
    return <div className="p-6 text-gray-500">Loading proposal…</div>
  }

  const proposal = proposalData.proposal
  const diff_params = proposalData.diff_params || []
  const messages = proposal.messages || []
  const updateMsgs = messages.filter((m: any) =>
    m['@type']?.endsWith('MsgUpdateParams')
  )
  const otherMsgs = messages.filter(
    (m: any) => !m['@type']?.endsWith('MsgUpdateParams')
  )

  const jsonString = JSON.stringify(proposal, null, 2)

  const VOTE_COLOR_MAP: Record<VoteType, string> = {
    YES: '#22c55e', // green-500
    NO: '#ef4444', // red-500
    VETO: '#f59e0b', // amber-500
    ABSTAIN: '#3b82f6', // blue-500
    UNKNOWN: '#9ca3af', // gray-400
  }

  const messageTypesLabel = formatMessageTypes(messages)
  const messageTypeTags = splitMessageTypeTags(messageTypesLabel)

  const votingTimeText = formatVotingTimeRange(
    proposal.voting_start_time,
    proposal.voting_end_time
  )

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
      <div className="px-6 py-4">
        <nav className="flex items-center text-sm text-gray-500 mb-1">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">
            {proposal.id}. {proposal.title}
          </span>
        </nav>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-6">
        <section className="bg-white border rounded-lg p-6 flex flex-col">
          {messageTypeTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {messageTypeTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
                                        bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900">
            {proposal.id}. {proposal.title}
          </h2>
          {votingTimeText && (
            <div className="mt-1 mb-5 text-sm text-gray-500">
              Voting Time: {votingTimeText}
            </div>
          )}

          <div className="grid grid-cols-3 gap-y-3 text-base mb-5">
            <div>
              <p className="text-xs text-gray-500 tracking-wide">STATUS</p>
              <p className="font-semibold text-green-600 text-lg">
                {proposal.status.replace('PROPOSAL_STATUS_', '')}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 tracking-wide">EPOCH</p>
              <p className="font-medium text-lg">{proposal.epoch_id}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 tracking-wide">
                TURNOUT / QUORUM
              </p>
              <p className="font-medium text-lg">
                {proposal.total_weight > 0
                  ? (
                      (proposal.voted_weight / proposal.total_weight) *
                      100
                    ).toFixed(2)
                  : ' - '}
                /{' '}
                {(Number(proposal.tally_params?.quorum || 0) * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Bottom metrics (compact) */}
          <div className="grid grid-cols-3 gap-y-3 text-base">
            <div>
              <p className="text-xs text-gray-500">WEIGHT</p>
              <p className="font-semibold">
                {proposal.total_weight > 0 ? (
                  <>
                    {formatCompactNumber(proposal.voted_weight)}/
                    {formatCompactNumber(proposal.total_weight)}
                  </>
                ) : (
                  <>
                    {formatCompactNumber(proposal.voted_weight)}
                    /-
                  </>
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">ADDRESS</p>
              <p className="font-semibold">
                {proposal.total_voters}/{proposal.total_participants}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Tally</h3>

          {(() => {
            const tally = proposal.final_tally_result || {}

            const yes = Number(tally.yes_count || 0)
            const no = Number(tally.no_count || 0)
            const veto = Number(tally.no_with_veto_count || 0)
            const abstain = Number(tally.abstain_count || 0)

            const total = yes + no + veto + abstain

            const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)

            return (
              <div className="space-y-4 text-sm">
                {/* YES */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-900">Yes</span>
                    <span className="text-gray-500">
                      {pct(yes).toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${pct(yes)}%` }}
                    />
                  </div>
                </div>

                {/* NO */}
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded bg-red-500" />
                  <span className="flex-1 text-gray-900">No</span>
                  <span className="text-gray-500">{pct(no).toFixed(2)}%</span>
                </div>

                {/* NO WITH VETO */}
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded bg-pink-400" />
                  <span className="flex-1 text-gray-900">No With Veto</span>
                  <span className="text-gray-500">{pct(veto).toFixed(2)}%</span>
                </div>

                {/* ABSTAIN */}
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded bg-yellow-400" />
                  <span className="flex-1 text-gray-900">Abstain</span>
                  <span className="text-gray-500">
                    {pct(abstain).toFixed(2)}%
                  </span>
                </div>
              </div>
            )
          })()}
        </section>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {['details', 'vote', 'json'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={[
              'px-4 py-1.5 text-sm rounded border',
              tab === t
                ? 'border-gray-900 text-gray-900'
                : 'border-gray-300 text-gray-500',
            ].join(' ')}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Details */}
      {tab === 'details' && (
        <div className="space-y-6">
          {/* Messages / Diff */}
          <section className="bg-white border rounded-lg p-6 space-y-6">
            {Array.isArray(diff_params) && updateMsgs.length > 0 && (
              <>
                {diff_params.map((msg: any, i: number) => (
                  <MessageBlock key={`diff-${i}`} msg={msg} />
                ))}
              </>
            )}

            {otherMsgs.map((msg: any, i: number) => (
              <MessageBlock key={i} msg={msg} />
            ))}
          </section>

          {/* Metadata (README) */}
          <ProposalMetadata
            metadata={proposal.metadata}
            summary={proposal.summary}
          />
        </div>
      )}

      {/* Vote */}
      {tab === 'vote' && txData && (
        <section className="bg-white border rounded-lg p-6 space-y-6">
          {(() => {
            const rawVoteTxs: VoteTx[] = txData.vote?.txs ?? []
            const voteTxs: VoteTx[] = dedupeLatestVotesByVoter(rawVoteTxs)

            const groups = {
              YES: [] as VoteTx[],
              NO: [] as VoteTx[],
              VETO: [] as VoteTx[],
              ABSTAIN: [] as VoteTx[],
            }

            for (const tx of voteTxs) {
              const type = parseVoteType(tx)
              if (type !== 'UNKNOWN') {
                groups[type].push(tx)
              }
            }

            let filteredVotes =
              voteFilter === 'YES'
                ? groups.YES
                : voteFilter === 'NO'
                ? groups.NO
                : voteFilter === 'VETO'
                ? groups.VETO
                : voteFilter === 'ABSTAIN'
                ? groups.ABSTAIN
                : voteTxs

            filteredVotes = [...filteredVotes].sort((a, b) => {
              if (sortKey === 'weight') {
                const wa = getVoteWeight(a)
                const wb = getVoteWeight(b)
                return sortOrder === 'desc' ? wb - wa : wa - wb
              }

              const ha = Number(a.height)
              const hb = Number(b.height)
              return sortOrder === 'desc' ? hb - ha : ha - hb
            })

            if (voterKeyword.trim()) {
              filteredVotes = filteredVotes.filter((tx) =>
                tx.tx.body.messages[0]?.voter
                  ?.toLowerCase()
                  .includes(voterKeyword.toLowerCase())
              )
            }

            const bubbleData = voteTxs
              .map((tx) => {
                const type = parseVoteType(tx)
                const weight = getVoteWeight(tx)

                if (type === 'UNKNOWN' || weight <= 0) return null

                return {
                  id: tx.txhash,
                  value: weight,
                  color: VOTE_COLOR_MAP[type],
                }
              })
              .filter(Boolean) as {
              id: string
              value: number
              color: string
            }[]

            if (voteTxs.length === 0) {
              return (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No vote data
                </div>
              )
            }

            // 按时间排序
            const sorted = [...voteTxs].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            )

            const cumulative = {
              YES: 0,
              NO: 0,
              VETO: 0,
              ABSTAIN: 0,
            }

            const data = sorted.map((tx) => {
              const type = parseVoteType(tx)
              const weight = getVoteWeight(tx)

              if (type !== 'UNKNOWN') {
                cumulative[type] += weight
              }

              return {
                ts: new Date(tx.timestamp).getTime(),
                YES: cumulative.YES,
                NO: cumulative.NO,
                VETO: cumulative.VETO,
                ABSTAIN: cumulative.ABSTAIN,
              }
            })

            const allTs = data.map((d) => d.ts)

            const minTs = Math.min(...allTs)
            const maxTs = Math.max(...allTs)

            // 每 3 小时一个 tick
            const HOUR = 60 * 60 * 1000
            const ticks: number[] = []

            let t = Math.floor(minTs / HOUR) * HOUR
            while (t <= maxTs) {
              ticks.push(t)
              t += 3 * HOUR
            }

            return (
              <>
                <div className="grid grid-cols-2 gap-6">
                  {/* Vote Distribution */}
                  <div className="bg-[#1f2a44] rounded-xl p-6 h-[420px] overflow-hidden">
                    <h4 className="text-center text-gray-200 font-semibold mb-3 shrink-0">
                      Vote Distribution
                    </h4>

                    <div className="flex-1 flex items-center justify-center">
                      {bubbleData.length === 0 ? (
                        <div className="text-gray-400">No votes</div>
                      ) : (
                        <VoteBubblePack
                          data={bubbleData}
                          width={360}
                          height={360}
                        />
                      )}
                    </div>
                  </div>

                  {/* Voting Power Timeline */}
                  <div className="bg-[#1f2a44] rounded-xl p-6 h-[420px] flex flex-col">
                    <h4 className="text-center text-gray-200 font-semibold mb-4 shrink-0">
                      Voting Power Timeline
                    </h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <XAxis
                          dataKey="ts"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          ticks={ticks}
                          tickFormatter={(v) => {
                            const d = new Date(v)
                            return `${d.getHours()}:00`
                          }}
                          stroke="#9ca3af"
                          tickMargin={10}
                        />

                        <YAxis
                          stroke="#94a3b8"
                          tickFormatter={(v) => Number(v).toLocaleString()}
                          width={80}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />

                        <Line
                          type="stepAfter"
                          dataKey="YES"
                          stroke="#34d399"
                          dot={false}
                        />
                        <Line
                          type="stepAfter"
                          dataKey="NO"
                          stroke="#f87171"
                          dot={false}
                        />
                        <Line
                          type="stepAfter"
                          dataKey="VETO"
                          stroke="#fbbf24"
                          dot={false}
                        />
                        <Line
                          type="stepAfter"
                          dataKey="ABSTAIN"
                          stroke="#38bdf8"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between">
                  <div className="flex gap-3">
                    {(['ALL', 'YES', 'NO', 'VETO', 'ABSTAIN'] as const).map(
                      (f) => (
                        <button
                          key={f}
                          onClick={() => setVoteFilter(f)}
                          className={[
                            'px-4 py-1.5 text-sm rounded-full font-medium transition',
                            voteFilter === f
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                          ].join(' ')}
                        >
                          {f}
                        </button>
                      )
                    )}
                  </div>

                  <input
                    value={voterKeyword}
                    onChange={(e) => setVoterKeyword(e.target.value)}
                    placeholder="Search voter…"
                    className="border rounded-md px-3 py-1.5 text-sm w-64"
                  />
                </div>

                {/* vote table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[3fr_1fr_1fr_1fr] bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
                    <div>VOTER</div>
                    <div>OPTION</div>
                    <button
                      onClick={() => {
                        setSortKey('height')
                        setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
                      }}
                      className="text-left hover:underline"
                    >
                      HEIGHT{' '}
                      {sortKey === 'height'
                        ? sortOrder === 'desc'
                          ? '↓'
                          : '↑'
                        : ''}
                    </button>

                    <button
                      onClick={() => {
                        setSortKey('weight')
                        setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
                      }}
                      className="text-left hover:underline"
                    >
                      POWER{' '}
                      {sortKey === 'weight'
                        ? sortOrder === 'desc'
                          ? '↓'
                          : '↑'
                        : ''}
                    </button>
                  </div>

                  {filteredVotes.map((tx) => {
                    const msg = tx.tx.body.messages[0]
                    const option = parseVoteType(tx)

                    return (
                      <div
                        key={tx.txhash}
                        className="grid grid-cols-[3fr_1fr_1fr_1fr] px-4 py-2 border-t text-sm hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-mono truncate">
                          {msg?.voter || '-'}
                        </div>
                        <div
                          className="font-semibold"
                          style={{ color: VOTE_COLOR_MAP[option] }}
                        >
                          {option}
                        </div>
                        <div>{formatNumber(tx.height)}</div>
                        <div className="font-mono truncate">
                          {formatNumber(getVoteWeight(tx))}
                        </div>
                      </div>
                    )
                  })}
                  {filteredVotes.length === 0 && (
                    <div className="py-6 text-center text-sm text-gray-500">
                      No votes found in this category
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </section>
      )}

      {/* JSON */}
      {tab === 'json' && (
        <section className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">JSON</h4>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(jsonString)
                  setCopied(true)
                }}
                onMouseLeave={() => setCopied(false)}
                className={[
                  'text-xs hover:underline transition-colors',
                  copied ? 'text-green-600' : 'text-blue-600',
                ].join(' ')}
              >
                {copied ? '✓ copied' : 'copy'}
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded overflow-auto max-h-[600px]">
            <JsonViewer data={proposal} />
          </div>
        </section>
      )}
    </div>
  )
}
