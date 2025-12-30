import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ParticipantModal } from './ParticipantModal'
import { Address } from './Address'

type AddressParticipantStatus = {
  isParticipant: boolean
  epochId: number
}

interface AddressRouteProps {
  address: string
  status: AddressParticipantStatus | null
  onResolved: (status: AddressParticipantStatus) => void
}

type StatusResponse = {
  participant_id: string
  epoch_id: number
  is_participant: boolean
}

export function AddressRoute({ address, status, onResolved }: AddressRouteProps) {
  const searchParams = new URLSearchParams(window.location.search)
  const epochFromUrl = searchParams.get('epoch')
  const epochIdFromUrl = epochFromUrl ? Number(epochFromUrl) : null   

  const { data, isLoading } = useQuery<StatusResponse>({
    queryKey: ['participant-status', address, epochIdFromUrl],
    queryFn: async () => {
      const params = epochIdFromUrl ? `?epoch_id=${epochIdFromUrl}` : ''
      const res = await fetch(
        `/api/v1/participants/${address}/status${params}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: status === null,
    staleTime: 60_000,
  })
  
  useEffect(() => {
    if (data && status === null) {
      onResolved({
        isParticipant: data.is_participant,
        epochId: epochIdFromUrl ?? data.epoch_id,
      })
    }
  }, [data, status, onResolved, epochIdFromUrl])

  if (status === null) {
    return (
      <div className="p-8 text-gray-400">{isLoading ? 'Checking address type…' : 'Resolving address…'}</div>
    )
  }

  if (status.isParticipant) {
    return (
      <ParticipantModal
        participantId={address}
        epochId={status.epochId}
        currentEpochId={status.epochId}
      />
    )
  }

  return <Address address={address} />
}
