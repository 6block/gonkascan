import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GovernanceProposal } from '../types/inference'
import { apiFetch } from '../utils'

type Tab = 'voting' | 'passed' | 'rejected'

function useCountdown(endTime?: string) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!endTime) return null

  const diff = new Date(endTime).getTime() - now
  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}

function ProposalCard({
  proposal,
  onClick,
}: {
  proposal: GovernanceProposal
  onClick: () => void
}) {
  const countdown = useCountdown(proposal.voting_end_time)

  const tally = proposal.final_tally_result || {}
  const yes = Number(tally.yes_count || 0)
  const no = Number(tally.no_count || 0)
  const abstain = Number(tally.abstain_count || 0)
  const veto = Number(tally.no_with_veto_count || 0)
  const totalVotes = yes + no + abstain + veto

  const votes = [
    { key: 'yes', label: 'Yes', value: yes, color: 'bg-green-500', text: 'text-green-600' },
    { key: 'no', label: 'No', value: no, color: 'bg-red-500', text: 'text-red-500' },
    { key: 'abstain', label: 'Abstain', value: abstain, color: 'bg-purple-500', text: 'text-purple-500' },
    { key: 'veto', label: 'Veto', value: veto, color: 'bg-gray-400', text: 'text-gray-400' },
  ].filter((v) => v.value > 0)

  return (
    <div
      onClick={onClick}
      className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Row 1: #id + title + voters + countdown */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        <span className="shrink-0 text-xs font-semibold text-gray-900">#{proposal.id}</span>
        <h3 className="font-semibold text-gray-900 text-sm truncate min-w-0 flex-1 sm:flex-none">{proposal.title}</h3>
        <span className="shrink-0 text-xs text-gray-400">Voters {proposal.total_voters}/{proposal.total_participants}</span>
        {countdown && (
          <span className="shrink-0 sm:ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {countdown}
          </span>
        )}
      </div>

      {/* Row 2: Vote labels + vote bar */}
      {totalVotes > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-2 shrink-0">
            {votes.map((v) => (
              <span key={v.key} className={`${v.text} text-[11px] whitespace-nowrap`}>
                {v.label} {((v.value / totalVotes) * 100).toFixed(1)}%
              </span>
            ))}
          </div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
            {votes.map((v) => (
              <div
                key={v.key}
                className={`${v.color} h-full`}
                style={{ width: `${(v.value / totalVotes) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ActiveProposals() {
  const [showAll, setShowAll] = useState(false)

  const { data } = useQuery<Record<Tab, GovernanceProposal[]>>({
    queryKey: ['governance-proposals'],
    queryFn: () => apiFetch('/v1/proposals'),
    staleTime: 30000,
  })

  const votingProposals = useMemo(() => {
    if (!data?.voting) return []
    return [...data.voting].sort((a, b) => b.id - a.id)
  }, [data])

  const filtered = useMemo(() => {
    if (showAll || votingProposals.length <= 1) return votingProposals
    const significant = votingProposals.filter(
      (p) => p.total_weight > 0 && p.voted_weight / p.total_weight >= 0.01,
    )
    return significant.length > 0 ? significant : votingProposals
  }, [votingProposals, showAll])

  if (votingProposals.length === 0) return null

  const handleClick = (id: number) => {
    const params = new URLSearchParams()
    params.set('page', 'governance')
    params.set('proposal_id', String(id))
    window.history.pushState({}, '', `?${params.toString()}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const hasHidden = !showAll && filtered.length < votingProposals.length

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 border border-gray-200">
      {/* Header: title + count on same line */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold text-gray-900">Active Proposals</h2>
          <span className="text-sm text-gray-400">
            {votingProposals.length} proposal{votingProposals.length > 1 ? 's' : ''} currently in voting
          </span>
        </div>
        {hasHidden && (
          <button onClick={() => setShowAll(true)} className="text-sm text-blue-600 hover:underline">
            Show all ({votingProposals.length})
          </button>
        )}
        {showAll && votingProposals.length > 1 && (
          <button onClick={() => setShowAll(false)} className="text-sm text-blue-600 hover:underline">
            Show significant only
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <ProposalCard key={p.id} proposal={p} onClick={() => handleClick(p.id)} />
        ))}
      </div>
    </div>
  )
}
