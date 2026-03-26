import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ProposalDetailResponse, CosmosMessage, ChartTooltipProps } from '../types/inference'
import { apiFetch, formatCompact, formatMessageTypes, formatInt, formatDateTime } from '../utils'
import { MessageBlock } from './common/StructRenderer'
import { JsonSection } from './common/JsonViewer'
import { ProposalMetadata } from './ProposalMetadata'
import { VoteBubblePack } from './VoteBubblePack'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'
import { BackNavigation } from './common/BackNavigation'
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

type VoteType = 'YES' | 'NO' | 'VETO' | 'ABSTAIN' | 'UNKNOWN'

function parseVoteType(tx: VoteTx): VoteType {
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

const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null

  const ts = payload[0]?.payload?.ts as string | number | undefined
  const timeLabel = ts ? formatDateTime(ts) : ''

  return (
    <div className="bg-white rounded-md shadow px-4 py-3 text-sm space-y-2">
      <div className="font-medium text-gray-800 border-b pb-1">{timeLabel}</div>

      {payload.map((p) => (
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
  return `${formatDateTime(start)} ~ ${formatDateTime(end)}`
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

export function GovernanceDetail({ proposalId }: { proposalId: string }) {
  const [tab, setTab] = useState<'details' | 'vote' | 'json'>('details')
  const [voteFilter, setVoteFilter] = useState<
    'ALL' | 'YES' | 'NO' | 'VETO' | 'ABSTAIN'
  >('ALL')
  const [voterKeyword, setVoterKeyword] = useState('')
  const [sortKey, setSortKey] = useState<'weight' | 'height'>('weight')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: proposalData, isLoading, error: proposalError } = useQuery<ProposalDetailResponse>({
    queryKey: ['proposal', proposalId],
    queryFn: () => apiFetch(`/v1/proposals/${proposalId}`),
  })

  const { data: txData } = useQuery<{ vote: { txs: VoteTx[] } }>({
    queryKey: ['proposal-transactions', proposalId],
    queryFn: () => apiFetch(`/v1/proposals/${proposalId}/transactions`),
    enabled: !!proposalId,
  })

  if (isLoading) {
    return <LoadingScreen label="Loading proposal..." />
  }

  if (proposalError || !proposalData) {
    return <ErrorScreen error={proposalError} title="Failed to load proposal" />
  }

  const proposal = proposalData.proposal
  const diff_params = proposalData.diff_params || []
  const messages: CosmosMessage[] = proposal.messages || []
  const updateMsgs = messages.filter((m) =>
    m['@type']?.endsWith('MsgUpdateParams'),
  )
  const otherMsgs = messages.filter(
    (m) => !m['@type']?.endsWith('MsgUpdateParams'),
  )

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
    proposal.voting_end_time,
  )

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
      <div className="px-0 sm:px-2 md:px-6 py-2 sm:py-4">
        <BackNavigation onBack={() => window.history.back()} backLabel="Governance" title={<>{proposal.id}. {proposal.title}</>} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="bg-white border rounded-lg p-4 sm:p-6 flex flex-col">
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
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{proposal.id}. {proposal.title}</h2>
          {votingTimeText && (
            <div className="mt-1 mb-5 text-sm text-gray-500 leading-relaxed break-words">Voting Time: {votingTimeText}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-base mb-5">
            <div>
              <p className="text-xs text-gray-500 tracking-wide">STATUS</p>
              <p className="font-semibold text-green-600 text-base sm:text-lg break-words">{proposal.status.replace('PROPOSAL_STATUS_', '')}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 tracking-wide">EPOCH</p>
              <p className="font-medium text-base sm:text-lg break-words">{proposal.epoch_id}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 tracking-wide">TURNOUT / QUORUM</p>
              <p className="font-medium text-base sm:text-lg break-words">
                {proposal.total_weight > 0
                  ? ((proposal.voted_weight / proposal.total_weight) * 100).toFixed(2)
                  : ' - '}
                /{' '}
                {(Number(proposal.tally_params?.quorum || 0) * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Bottom metrics (compact) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-base">
            <div>
              <p className="text-xs text-gray-500">WEIGHT</p>
              <p className="font-semibold break-words">
                {proposal.total_weight > 0 ? (
                  <>
                    {formatCompact(proposal.voted_weight)}/{formatCompact(proposal.total_weight)}
                  </>
                ) : (
                  <>
                    {formatCompact(proposal.voted_weight)}/-
                  </>
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">ADDRESS</p>
              <p className="font-semibold break-words">{proposal.total_voters}/{proposal.total_participants}</p>
            </div>
          </div>
        </section>

        <section className="bg-white border rounded-lg p-4 sm:p-6">
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
                    <span className="text-gray-500">{pct(yes).toFixed(2)}%</span>
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
                  <span className="text-gray-500">{pct(abstain).toFixed(2)}%</span>
                </div>
              </div>
            )
          })()}
        </section>
      </div>

      {/* Tabs */}
      <div className="mt-1 sm:mt-2 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {['details', 'vote', 'json'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as 'details' | 'vote' | 'json')}
            className={[
              'whitespace-nowrap shrink-0 px-4 py-2 text-sm rounded-md border transition-colors',
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
          <section className="bg-white border rounded-lg p-4 sm:p-6 space-y-6">
            {Array.isArray(diff_params) && updateMsgs.length > 0 && (
              <>
                {diff_params.map((msg, i) => (
                  <MessageBlock key={`diff-${i}`} msg={msg} />
                ))}
              </>
            )}

            {otherMsgs.map((msg, i) => (
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
        <section className="bg-white border rounded-lg p-4 sm:p-6 space-y-6">
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
                  .includes(voterKeyword.toLowerCase()),
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
                <div className="h-full flex items-center justify-center text-gray-400">No vote data</div>
              )
            }

            // sort by time
            const sorted = [...voteTxs].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
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

            // one tick every 3 hours
            const HOUR = 60 * 60 * 1000
            const ticks: number[] = []

            let t = Math.floor(minTs / HOUR) * HOUR
            while (t <= maxTs) {
              ticks.push(t)
              t += 3 * HOUR
            }

            return (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                  {/* Vote Distribution */}
                  <div className="bg-[#1f2a44] rounded-xl p-4 sm:p-6 h-[320px] sm:h-[420px] overflow-hidden">
                    <h4 className="text-center text-sm sm:text-base text-gray-200 font-semibold mb-3 shrink-0">Vote Distribution</h4>

                    <div className="flex-1 flex items-center justify-center">
                      {bubbleData.length === 0 ? (
                        <div className="text-gray-400">No votes</div>
                      ) : (
                        <VoteBubblePack
                          data={bubbleData}
                          width={280}
                          height={280}
                        />
                      )}
                    </div>
                  </div>

                  {/* Voting Power Timeline */}
                  <div className="bg-[#1f2a44] rounded-xl p-4 sm:p-6 h-[320px] sm:h-[420px] flex flex-col">
                    <h4 className="text-center text-sm sm:text-base text-gray-200 font-semibold mb-4 shrink-0">Voting Power Timeline</h4>
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

                <div className="bg-white rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {(['ALL', 'YES', 'NO', 'VETO', 'ABSTAIN'] as const).map(
                      (f) => (
                        <button
                          key={f}
                          onClick={() => setVoteFilter(f)}
                          className={[
                            'px-4 py-2 text-sm rounded-full font-medium transition whitespace-nowrap',
                            voteFilter === f
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                          ].join(' ')}
                        >
                          {f}
                        </button>
                      ),
                    )}
                  </div>

                  <input
                    value={voterKeyword}
                    onChange={(e) => setVoterKeyword(e.target.value)}
                    placeholder="Search voter…"
                    className="border rounded-md px-3 py-2 text-sm w-full sm:w-64"
                  />
                </div>

                {/* vote table */}
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <div className="grid min-w-[720px] grid-cols-[3fr_1fr_1fr_1fr] bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
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
                        className="grid min-w-[720px] grid-cols-[3fr_1fr_1fr_1fr] px-4 py-3 border-t text-sm hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-mono truncate pr-4">{msg?.voter || '-'}</div>
                        <div className="font-semibold" style={{ color: VOTE_COLOR_MAP[option] }}>{option}</div>
                        <div>{formatInt(tx.height)}</div>
                        <div className="font-mono truncate pr-2">{formatInt(getVoteWeight(tx))}</div>
                      </div>
                    )
                  })}
                  {filteredVotes.length === 0 && (
                    <div className="py-6 px-4 text-center text-sm text-gray-500">No votes found in this category</div>
                  )}
                </div>
              </>
            )
          })()}
        </section>
      )}

      {/* JSON */}
      {tab === 'json' && (
        <JsonSection data={proposal} />
      )}
    </div>
  )
}
