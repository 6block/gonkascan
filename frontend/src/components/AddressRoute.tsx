import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../utils'
import { ParticipantModal } from './ParticipantModal'
import { Address } from './Address'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'

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

  const { data, isLoading, error } = useQuery<StatusResponse>({
    queryKey: ['participant-status', address, epochIdFromUrl],
    queryFn: () => apiFetch(`/v1/participants/${address}/status${epochIdFromUrl ? `?epoch_id=${epochIdFromUrl}` : ''}`),
    enabled: status === null,
    staleTime: 60000,
  })
  
  useEffect(() => {
    if (data && status === null) {
      onResolved({
        isParticipant: data.is_participant,
        epochId: epochIdFromUrl ?? data.epoch_id,
      })
    }
  }, [data, status, onResolved, epochIdFromUrl])

  if (status === null && error) {
    return <ErrorScreen error={error} title="Failed to resolve address" />
  }

  if (status === null) {
    return <LoadingScreen label={isLoading ? 'Checking address type...' : 'Resolving address...'} />
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
