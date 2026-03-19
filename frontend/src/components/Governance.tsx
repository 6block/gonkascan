import { useEffect, useMemo, useState } from 'react'
import { useUrlParam } from '../hooks/useUrlParam'
import { useQuery } from '@tanstack/react-query'
import { GovernanceProposal } from '../types/inference'
import { apiFetch, formatDateWithOrdinal, formatCompact, formatMessageTypes } from '../utils'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'
import { TabBar } from './common/TabBar'

type Tab = 'voting' | 'passed' | 'rejected'

const PAGE_SIZE = 20

export function Governance() {
  const [, setSelectedProposalId] = useUrlParam('proposal_id')
  const [tab, setTab] = useState<Tab | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery<Record<Tab, GovernanceProposal[]>>({
    queryKey: ['governance-proposals'],
    queryFn: () => apiFetch('/v1/proposals'),
  })

  const effectiveTab: Tab = useMemo(() => {
    if (!data) return 'passed'
    if (data.voting?.length > 0) return 'voting'
    return 'passed'
  }, [data])

  useEffect(() => {
    if (!data) return
    if (tab !== null) return
  
    if (data.voting?.length > 0) {
      setTab('voting')
    } else {
      setTab('passed')
    }
  }, [data, tab])

  const activeTab = tab ?? effectiveTab

  const list: GovernanceProposal[] = useMemo(() => {
    if (!data) return []
    const raw = data[activeTab] || []
    return [...raw].sort((a, b) => b.id - a.id)
  }, [data, activeTab])

  const totalPages = Math.ceil(list.length / PAGE_SIZE)
  const paged = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) {
    return <LoadingScreen label="Loading proposals..." />
  }

  if (error || !data) {
    return <ErrorScreen error={error} title="Failed to load proposals" />
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Proposals</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">Approved proposals are then executed to update the network</p>
        </div>

        <TabBar
          tabs={['voting', 'passed', 'rejected'] as Tab[]}
          activeTab={activeTab}
          onChange={(t) => { setTab(t); setPage(1) }}
          variant="solid"
        />
      </div>

      {activeTab === 'voting' && list.length === 0 ? (
        <div className="py-12 sm:py-16 text-center px-4">
          <div className="text-base sm:text-lg font-medium text-gray-700 mb-2">There are no active proposals right now.</div>
          <div className="text-sm text-gray-500">Check back later to see what’s up for voting.</div>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <div className="grid min-w-[900px] grid-cols-[3fr_1fr_3fr_1.5fr_1.5fr] bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
              <div>PROPOSALS</div>
              <div>EPOCH</div>
              <div>VOTES</div>
              <div className="text-center">WEIGHT</div>
              <div className="text-center">ADDRESS</div>
            </div>

            {paged.map((p) => {
              const yes = Number(p.final_tally_result?.yes_count || 0)
              const no = Number(p.final_tally_result?.no_count || 0)
              const abstain = Number(p.final_tally_result?.abstain_count || 0)
              const veto = Number(p.final_tally_result?.no_with_veto_count || 0)

              const voteItems = [
                yes > 0 && { value: yes, color: 'text-green-600' },
                no > 0 && { value: no, color: 'text-red-500' },
                abstain > 0 && { value: abstain, color: 'text-gray-400' },
                veto > 0 && { value: veto, color: 'text-purple-500' },
              ].filter(Boolean) as { value: number; color: string }[]

              const votes = [
                {
                  key: 'yes',
                  label: 'Yes',
                  value: yes,
                  color: 'bg-green-500',
                  text: 'text-green-600',
                },
                {
                  key: 'no',
                  label: 'No',
                  value: no,
                  color: 'bg-red-500',
                  text: 'text-red-500',
                },
                {
                  key: 'abstain',
                  label: 'Abstain',
                  value: abstain,
                  color: 'bg-purple-500',
                  text: 'text-purple-500',
                },
                {
                  key: 'veto',
                  label: 'Veto',
                  value: veto,
                  color: 'bg-gray-400',
                  text: 'text-gray-400',
                },
              ].filter((v) => v.value > 0)

              const totalVotes = votes.reduce((s, v) => s + v.value, 0)
              const dominant = votes.reduce(
                (a, b) => (b.value > a.value ? b : a),
                votes[0],
              )

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProposalId(String(p.id))
                    const params = new URLSearchParams(window.location.search)
                    params.set('page', 'governance')
                    params.set('proposal_id', String(p.id))
                    window.history.pushState({}, '', `?${params.toString()}`)
                  }}
                  className="group grid min-w-[900px] grid-cols-[3fr_1fr_3fr_1.5fr_1.5fr] px-4 py-4 border-t text-sm cursor-pointer hover:bg-gray-50 transition"
                >
                  {/* Proposal */}
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:underline break-words">#{p.id} {p.title}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.status.includes('PASSED')
                            ? 'bg-green-100 text-green-700'
                            : p.status.includes('REJECTED')
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {p.status.replace('PROPOSAL_STATUS_', '')}
                      </span>
                      <span className="text-xs text-gray-500">{formatDateWithOrdinal(p.submit_time)}</span>
                    </div>
                    {formatMessageTypes(p.messages) && (
                      <div className="text-xs text-gray-500 mt-1 leading-relaxed break-words">{formatMessageTypes(p.messages)}</div>
                    )}
                  </div>

                  {/* Epoch */}
                  <div className="flex items-center font-medium text-gray-900">{p.epoch_id}</div>

                  {/* Votes */}
                  <div className="pr-3 sm:pr-6">
                    <div className="flex flex-wrap text-xs gap-2 mb-1 leading-relaxed">
                      {voteItems.map((item, idx) => (
                        <span key={idx} className="flex items-center">
                          <span className={item.color}>{formatCompact(item.value)}</span>
                          {idx < voteItems.length - 1 && (
                            <span className="mx-1.5 text-gray-300 text-sm leading-none relative -top-[1px]">·</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="relative group">
                      <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden flex">
                        {votes.map((v) => {
                          const pct = (v.value / totalVotes) * 100
                          return (
                            <div
                              key={v.key}
                              className={`${v.color} h-full`}
                              style={{ width: `${pct}%` }}
                            />
                          )
                        })}
                      </div>

                      {/* center percentage (only one, never overlaps) */}
                      {dominant && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[11px] font-semibold text-white drop-shadow">
                            {((dominant.value / totalVotes) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {/* hover tooltip (whole bar) */}
                      <div
                        className="
                            absolute left-1/2 -top-2 translate-x-[-50%] -translate-y-full
                            opacity-0 group-hover:opacity-100 transition
                            rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap z-10 hidden sm:block
                        "
                      >
                        {votes.map((v, _) => (
                          <div
                            key={v.key}
                            className={`flex items-center gap-2 ${v.text}`}
                          >
                            <span className="inline-block w-2 h-2 rounded-full bg-current" />
                            <span>{v.label}: {formatCompact(v.value)} ({((v.value / totalVotes) * 100).toFixed(2)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="flex items-center justify-center text-center font-medium break-words">
                    {p.total_weight > 0
                      ? `${formatCompact(
                        p.voted_weight,
                      ).toLocaleString()}/${formatCompact(
                        p.total_weight,
                      ).toLocaleString()}`
                      : `${formatCompact(
                        p.voted_weight,
                      ).toLocaleString()}/ - `}
                  </div>

                  {/* Address */}
                  <div className="flex items-center justify-center text-center font-medium break-words">
                    {p.total_voters}/{p.total_participants}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between sm:justify-end gap-3 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-2 text-sm border rounded-md disabled:opacity-40"
          >
            Prev
          </button>
          <span className="min-h-[36px] flex items-center text-sm text-gray-600 leading-none whitespace-nowrap">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-2 text-sm border rounded-md disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
