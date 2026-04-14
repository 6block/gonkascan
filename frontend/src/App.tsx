import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import { InferenceResponse } from './types/inference'
import { ParticipantTable } from './components/ParticipantTable'
import { Timeline } from './components/Timeline'
import { Models } from './components/Models'
import { EpochTimer } from './components/EpochTimer'
import { Blocks } from './components/Blocks'
import LoadingScreen from './components/common/LoadingScreen'
import ErrorScreen from './components/common/ErrorScreen'
import { BlockDetail } from './components/BlockDetail'
import { Transactions } from './components/Transactions'
import { TransactionDetail } from './components/TransactionDetail'
import { ParticipantMap } from './components/ParticipantMap'
import { AddressRoute } from './components/AddressRoute'
import { Hardware } from './components/Hardware'
import { Governance } from './components/Governance'
import { GovernanceDetail } from './components/GovernanceDetail'
import { ActiveProposals } from './components/ActiveProposals'
import { MarketStats } from './components/MarketStats'
import { Resource } from './components/Resource'
import { BountyProgram } from './components/BountyProgram'
import { StatItem } from './components/common/StatItem'
import { EpochIdDisplay } from './components/common/EpochIdDisplay'
import { RefreshControlFooter } from './components/common/RefreshControlFooter'
import { NavTab, NavDropdown } from './components/common/NavTab'
import { isValidGonkaAddress, isHex64, isBlockHeight, apiFetch } from './utils'
import { usePrefetch } from './hooks/usePrefetch'
import { useEstimatedBlock } from './hooks/useEstimatedBlock'

type Page =
  | 'dashboard'
  | 'models'
  | 'hardware'
  | 'timeline'
  | 'transactions'
  | 'nodemap'
  | 'address'
  | 'blocks'
  | 'governance'
  | 'resource'
  | 'bounty'

const EPOCH_AWARE_PAGES: Page[] = ['dashboard', 'address']

type AddressParticipantStatus = {
  isParticipant: boolean
  epochId: number
} | null

function weightToH100(weight: number, epoch: number) {
  let BASELINE: number

  if (epoch <= 158) {
    BASELINE = 437
  } else if (epoch <= 176) {
    BASELINE = 292.88
  } else {
    BASELINE = 254.5
  }

  return weight / BASELINE
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [selectedEpochId, setSelectedEpochId] = useState<number | null>(null)
  const [currentEpochId, setCurrentEpochId] = useState<number | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [globalSearch, setGlobalSearch] = useState('')
  const [appReady, setAppReady] = useState(false)
  const [addressParticipantStatus, setAddressParticipantStatus] = useState<AddressParticipantStatus>(null)
  const [participantFilter, setParticipantFilter] = useState<string[] | null>(null)
  const [selectedHardware, setSelectedHardware] = useState<string>('ALL')

  const { prefetchAll } = usePrefetch()

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery<InferenceResponse>({
    queryKey: ['inference', selectedEpochId === null ? 'current' : selectedEpochId],
    queryFn: () => apiFetch(selectedEpochId ? `/v1/inference/epochs/${selectedEpochId}` : '/v1/inference/current'),
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnMount: true,
    enabled: appReady && currentPage === 'dashboard',
  })

  const { data: currentData } = useQuery<InferenceResponse>({
    queryKey: ['inference', 'current'],
    queryFn: () => apiFetch('/v1/inference/current'),
    staleTime: 30000,
    enabled: currentPage === 'dashboard' && selectedEpochId !== null,
  })

  const estimatedBlock = useEstimatedBlock(
    data?.current_block_height || 0,
    data?.current_block_timestamp || new Date().toISOString(),
    data?.avg_block_time || 6,
  )

  const shouldShowEstimatedBlock = data?.current_block_height && data?.current_block_timestamp && data?.avg_block_time

  useEffect(() => {
    if (data?.is_current) {
      setCurrentEpochId(data.epoch_id)
    }
  }, [data])

  useEffect(() => {
    if (currentData) {
      setCurrentEpochId(currentData.epoch_id)
    }
  }, [currentData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pageParam = params.get('page') as Page | null
    const epochParam = params.get('epoch')
    const addressParam = params.get('address')
    const participantsParam = params.get('participants')
  
    const page = pageParam ?? 'dashboard'
    setCurrentPage(page)
  
    if (EPOCH_AWARE_PAGES.includes(page) && epochParam) {
      const epochId = parseInt(epochParam)
      setSelectedEpochId(isNaN(epochId) ? null : epochId)
    } else {
      setSelectedEpochId(null)
    }

    if (participantsParam && page === 'dashboard') {
      const list = participantsParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
  
      setParticipantFilter(list.length > 0 ? list : null)
    } else {
      setParticipantFilter(null)
    }
  
    if (page === 'address' && addressParam) {
      setSelectedAddress(addressParam)
      setAddressParticipantStatus(null)
      setGlobalSearch(addressParam)
    } else {
      setSelectedAddress(null)
    }
    setAppReady(true)
  }, [])  

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
  
      const pageParam = params.get('page') as Page | null
      const addressParam = params.get('address')
      const epochParam = params.get('epoch')
  
      if (epochParam) {
        const epochId = parseInt(epochParam)
        setSelectedEpochId(isNaN(epochId) ? null : epochId)
      } else {
        setSelectedEpochId(null)
      }
  
      if (pageParam === 'address' && addressParam) {
        setCurrentPage('address')
        setSelectedAddress(addressParam)
        setAddressParticipantStatus(null)
        setGlobalSearch(addressParam)
        return
      }
  
      if (
        pageParam === 'timeline' ||
        pageParam === 'models' ||
        pageParam === 'hardware' ||
        pageParam === 'governance' ||
        pageParam === 'blocks' ||
        pageParam === 'transactions' ||
        pageParam === 'nodemap' ||
        pageParam === 'bounty' ||
        pageParam === 'resource'
      ) {
        setCurrentPage(pageParam)
        setSelectedAddress(null)
        setGlobalSearch('')
        return
      }
  
      setCurrentPage('dashboard')
      setSelectedAddress(null)
      setGlobalSearch('')
      window.history.replaceState({}, '', window.location.pathname)
    }
  
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])  

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
  
    if (EPOCH_AWARE_PAGES.includes(currentPage)) {
      if (selectedEpochId !== null) {
        params.set('epoch', selectedEpochId.toString())
      } else {
        params.delete('epoch')
      }
    } else {
      params.delete('epoch')
    }
  
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }, [selectedEpochId, currentPage])  

  useEffect(() => {
    if (currentPage === 'dashboard' && data) {
      prefetchAll()
    }
  }, [currentPage, data, prefetchAll])

  useEffect(() => {
    setSelectedHardware('ALL')
  }, [selectedEpochId])

  const handleRefresh = () => {
    refetch()
  }

  const handleEpochSelect = (epochId: number | null) => {
    setSelectedEpochId(epochId)
  }
  
  const handleParticipantSelect = (address: string | null) => {
    if (!address) {
      setSelectedAddress(null)
      setAddressParticipantStatus(null)
      setCurrentPage('dashboard')
      return
    }

    if (!data) return

    setSelectedAddress(address)
    setAddressParticipantStatus({
      isParticipant: true,
      epochId: selectedEpochId ?? currentEpochId ?? data.epoch_id,
    })
    setCurrentPage('address')
    
    const params = new URLSearchParams()
    params.set('page', 'address')
    params.set('address', address)

    window.history.pushState({}, '', `?${params.toString()}`)
  }

  const handlePageChange = (page: Page) => {
    setCurrentPage(page)

    if (page === 'dashboard') {
      setParticipantFilter(null)
    }
    
    const params = new URLSearchParams()
    if (page !== 'dashboard') {
      params.set('page', page)
    }
  
    window.history.pushState({}, '', params.toString() ? `?${params}` : '/')
  }

  const handleGlobalSearch = () => {
    const input = globalSearch.trim()
    if (!input) {
      toast.error('Please enter address / tx hash / height')
      return
    }

    if (isValidGonkaAddress(input)) {
      setSelectedAddress(input)
      setAddressParticipantStatus(null)
      setCurrentPage('address')
  
      const params = new URLSearchParams()
      params.set('page', 'address')
      params.set('address', input)
  
      window.history.pushState({}, '', `?${params.toString()}`)
      return
    }

    if (isHex64(input)) {
      const params = new URLSearchParams()
      params.set('page', 'transactions')
      params.set('tx', input.toUpperCase())

      setCurrentPage('transactions')
      window.history.pushState({}, '', `?${params.toString()}`)
      return
    }

    if (isBlockHeight(input)) {
      const params = new URLSearchParams()
      params.set('page', 'blocks')
      params.set('height', input)

      setCurrentPage('blocks')
      window.history.pushState({}, '', `?${params.toString()}`)
      return
    }

    toast.error('Invalid Address / Tx Hash / Height')
  }

  const hardwareOptions = useMemo(() => {
    if (!data?.hardware) return []
    return Array.from(new Set(data.hardware.map(h => h.hardware))).sort()
  }, [data?.hardware])
  
  const selectedHardwareParticipantSet = useMemo(() => {
    if (selectedHardware === 'ALL') return null
    const hardware_list = data?.hardware ?? []
  
    const item = hardware_list.find(h => h.hardware === selectedHardware)
    return new Set(item?.participants ?? [])
  }, [data?.hardware, selectedHardware])

  const filteredParticipants = useMemo(() => {
    if (!data) return []
  
    let participants_list = data.participants
  
    // 1) filter by URL participants (if any)
    if (participantFilter && participantFilter.length > 0) {
      const set = new Set(participantFilter)
      participants_list = participants_list.filter(p => set.has(p.index))
    }

    // 2) filter by hardware (if selected)
    if (selectedHardwareParticipantSet) {
      participants_list = participants_list.filter(p => selectedHardwareParticipantSet.has(p.index))
    }
  
    return participants_list
  }, [data, participantFilter, selectedHardwareParticipantSet])

  const searchParams = new URLSearchParams(window.location.search)
  const blockHeight = searchParams.get('height')
  const txHash = searchParams.get('tx')
  const proposalId = searchParams.get('proposal_id')
  const isTransactionDetail = currentPage === 'transactions' && searchParams.has('tx')
  const isBlockDetail = currentPage === 'blocks' && searchParams.has('height')
  const isGovernancenDetail = currentPage === 'governance' && searchParams.has('proposal_id')
  const isBountyPage = currentPage === 'bounty'
  const shouldShowHeader = currentPage !== 'address' && !isTransactionDetail  && !isBlockDetail && !isGovernancenDetail && !isBountyPage

  if (isLoading && !data) {
    return <LoadingScreen label="Loading inference statistics..." />
  }

  if (error && !data) {
    return <ErrorScreen error={error} onRetry={handleRefresh} />
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{duration: 3000}}/>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 mx-auto w-full max-w-[1400px] px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
          {shouldShowHeader  && (
            <header className="mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
                <img src="/gonka.svg" alt="Gonka" className="h-9 sm:h-10 md:h-12 w-auto" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-1 leading-tight">
                    Gonkascan
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Real-time monitoring of participant performance and model availability
                  </p>
                </div>
              </div>
          
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  <NavTab active={currentPage === 'dashboard'} onClick={() => handlePageChange('dashboard')}>
                    Host Dashboard
                  </NavTab>
                  <NavDropdown
                    label="Network"
                    active={['blocks', 'transactions', 'timeline'].includes(currentPage)}
                    items={[
                      { page: 'blocks', label: 'Blocks' },
                      { page: 'transactions', label: 'Transactions' },
                      { page: 'timeline', label: 'Timeline' },
                    ]}
                    activePage={currentPage}
                    onSelect={(page) => handlePageChange(page as Page)}
                  />
                  <NavDropdown
                    label="Participants"
                    active={['models', 'hardware', 'nodemap'].includes(currentPage)}
                    items={[
                      { page: 'models', label: 'Models' },
                      { page: 'hardware', label: 'Hardware' },
                      { page: 'nodemap', label: 'Node Map' },
                    ]}
                    activePage={currentPage}
                    onSelect={(page) => handlePageChange(page as Page)}
                  />
                  <NavTab active={currentPage === 'governance'} onClick={() => handlePageChange('governance')}>
                    Governance
                  </NavTab>
                  <NavTab active={currentPage === 'resource'} onClick={() => handlePageChange('resource')}>
                    Resource
                  </NavTab>
                </div>

                <div className="relative w-full sm:w-auto sm:ml-auto">
                  <input
                    type="text"
                    placeholder="Search Address / Tx Hash / Height"
                    value={globalSearch}
                    onChange={e => setGlobalSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                    className="w-full sm:w-72 h-10 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
              </div>
            </header>
          )}

          {currentPage === 'timeline' ? (
            <Timeline />
          ) : currentPage === 'models' ? (
            <Models />
          ) : currentPage === 'hardware' ? (
            <Hardware />
          ) : currentPage === 'governance' ? (
            proposalId ? (
              <GovernanceDetail proposalId={proposalId}/>
            ) : (
              <Governance />
            )        
          ) : currentPage === 'blocks' ?( 
            blockHeight ? (
              <BlockDetail height={blockHeight}/>
            ) : (
              <Blocks />
            )
          ) : currentPage === 'transactions' ? (
            txHash ? (
              <TransactionDetail txHash={txHash}/>
            ) : (
              <Transactions />
            )
          ) : currentPage === 'nodemap' ? (
            <ParticipantMap />
          ) : currentPage === 'resource' ? (
            <Resource onNavigate={(page) => handlePageChange(page as Page)} />
          ) : currentPage === 'bounty' ? (
            <BountyProgram />
          ) : currentPage === 'address' ? (
            selectedAddress ? (
              <AddressRoute
                address={selectedAddress}
                status={addressParticipantStatus}
                onResolved={setAddressParticipantStatus}
              />

            ) : null
          ) : (
            data && (
              <>
                <MarketStats />
                <ActiveProposals />
                <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 mb-6 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4 mb-4">
                    <div className="col-span-2 sm:col-span-1">
                      <EpochIdDisplay epochId={data.epoch_id} isCurrent={data.is_current} />
                    </div>

                    <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
                      <StatItem
                        label="Current Block"
                        subText={shouldShowEstimatedBlock ? <>Last confirmed: {data.height.toLocaleString()}</> : ''}
                      >
                        {shouldShowEstimatedBlock ? estimatedBlock.toLocaleString() : data.height.toLocaleString()}
                      </StatItem>
                    </div>

                    <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
                      <StatItem label="Total Participants" subText="">{data.participants.length}</StatItem>
                    </div>

                    <div className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6">
                      <StatItem label="Total Weight">
                        {data.participants.reduce((sum, p) => sum + p.weight, 0).toLocaleString()}
                      </StatItem>
                    </div>

                    <div className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6">
                      <StatItem label="Equivalent H100" subText="">
                        {Math.round(weightToH100(
                          data.participants.reduce((sum, p) => sum + p.weight, 0), data.epoch_id,
                        )).toLocaleString()} GPUs
                      </StatItem>
                    </div>

                    <div className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6 col-span-2 sm:col-span-3 lg:col-span-1">
                      <StatItem
                        label="Total Assigned Rewards"
                        subText={
                          (data.total_assigned_rewards_gnk === undefined
                            || data.total_assigned_rewards_gnk === null
                            || data.total_assigned_rewards_gnk === 0)
                            ? <>{isLoading ? 'Loading...' : data.is_current
                              ? 'Pending settlement' : 'Calculating...'}</>
                            : ''
                        }
                      >
                        {data.total_assigned_rewards_gnk !== undefined
                          && data.total_assigned_rewards_gnk !== null
                          && data.total_assigned_rewards_gnk > 0
                          ? `${data.total_assigned_rewards_gnk.toLocaleString()} GNK`
                          : '-'
                        }
                      </StatItem>
                    </div>

                    <EpochTimer data={data} />
                  </div>

                  <RefreshControlFooter
                    refreshInterval="30s"
                    selectedEpochId={selectedEpochId}
                    dataUpdatedAt={dataUpdatedAt}
                    currentEpochId={currentEpochId || data.epoch_id}
                    isLoading={isLoading}
                    onSelectEpoch={handleEpochSelect}
                    onRefresh={handleRefresh}
                  />
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                        Participant Statistics
                      </h2>
                      <p className="text-xs md:text-sm text-gray-500">
                        Rows with red background indicate missed rate or invalidation rate exceeding 10%
                      </p>
                    </div>

                    <div className="w-full sm:w-auto flex items-center gap-2">
                      <select
                        value={selectedHardware}
                        onChange={(e) => setSelectedHardware(e.target.value)}
                        className="h-9 w-full sm:w-auto sm:min-w-[260px] px-3 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                        disabled={!data || hardwareOptions.length === 0}
                      >
                        <option value="ALL">All Hardware</option>
                        {hardwareOptions.map(hardware => (<option key={hardware} value={hardware}>{hardware}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {participantFilter && filteredParticipants.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center">
                      No matching participants in this epoch
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <ParticipantTable
                        participants={filteredParticipants}
                        epochId={data.epoch_id}
                        isCurrentEpoch={data.is_current}
                        currentEpochId={currentEpochId}
                        selectedParticipantId={selectedAddress &&
                          filteredParticipants.some(p => p.index === selectedAddress)
                          ? selectedAddress
                          : null
                        }
                        onParticipantSelect={handleParticipantSelect}
                      />
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
        
        <footer className="bg-white border-t border-gray-200 py-5 sm:py-6 mt-8 sm:mt-12">
          <div className="container mx-auto px-3 sm:px-4 max-w-[1600px]">
            <div className="flex items-center justify-center text-sm">
              <a 
                href="https://github.com/6block/gonkascan"
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 text-center"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub Repository
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default App
