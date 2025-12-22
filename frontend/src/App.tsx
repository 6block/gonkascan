import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import { InferenceResponse } from './types/inference'
import { ParticipantTable } from './components/ParticipantTable'
import { ParticipantModal } from './components/ParticipantModal'
import { EpochSelector } from './components/EpochSelector'
import { Timeline } from './components/Timeline'
import { Models } from './components/Models'
import { EpochTimer } from './components/EpochTimer'
import { Transactions } from './components/Transactions'
import { ParticipantMap } from './components/ParticipantMap'
import { Address } from './components/Address'
import { isValidGonkaAddress } from './utils'
import { usePrefetch } from './hooks/usePrefetch'
import { useEstimatedBlock } from './hooks/useEstimatedBlock'

type Page = 'dashboard' | 'models' | 'timeline' | 'transactions' | 'nodemap' | 'address'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [selectedEpochId, setSelectedEpochId] = useState<number | null>(null)
  const [currentEpochId, setCurrentEpochId] = useState<number | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [addressSearch, setAddressSearch] = useState('')

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const { prefetchAll } = usePrefetch()

  const fetchInference = async (epochId: number | null) => {
    const endpoint = epochId
      ? `${apiUrl}/v1/inference/epochs/${epochId}`
      : `${apiUrl}/v1/inference/current`
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  const { data, isLoading: loading, error: queryError, refetch, dataUpdatedAt } = useQuery<InferenceResponse>({
    queryKey: ['inference', selectedEpochId === null ? 'current' : selectedEpochId],
    queryFn: () => fetchInference(selectedEpochId),
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnMount: true,
    enabled: currentPage === 'dashboard',
  })

  const error = queryError ? (queryError as Error).message : ''

  const estimatedBlock = useEstimatedBlock(
    data?.current_block_height || 0,
    data?.current_block_timestamp || new Date().toISOString(),
    data?.avg_block_time || 6
  )

  const shouldShowEstimatedBlock = data?.current_block_height && data?.current_block_timestamp && data?.avg_block_time

  useEffect(() => {
    if (data?.is_current) {
      setCurrentEpochId(data.epoch_id)
    }
  }, [data])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pageParam = params.get('page')
    const epochParam = params.get('epoch')
    const addressParam = params.get('address')
    
    if (pageParam === 'timeline') {
      setCurrentPage('timeline')
      return
    }
    
    if (pageParam === 'models') {
      setCurrentPage('models')
      return
    }
    
    if (pageParam === 'transactions') {
      setCurrentPage('transactions')
      return
    }

    if (pageParam === 'nodemap') {
      setCurrentPage('nodemap')
      return
    }

    if (epochParam) {
      const epochId = parseInt(epochParam)
      if (!isNaN(epochId)) {
        setSelectedEpochId(epochId)
        return
      }
    }
    
    if (pageParam === 'address' && addressParam) {
      setCurrentPage('address')
      setSelectedAddress(addressParam)
      setAddressSearch(addressParam)
      return
    }
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
        setAddressSearch(addressParam)
        return
      }
  
      if (
        pageParam === 'timeline' ||
        pageParam === 'models' ||
        pageParam === 'transactions' ||
        pageParam === 'nodemap'
      ) {
        setCurrentPage(pageParam)
        setSelectedAddress(null)
        setAddressSearch('')
        return
      }
  
      setCurrentPage('dashboard')
      setSelectedAddress(null)
      setAddressSearch('')
      window.history.replaceState({}, '', window.location.pathname)
    }
  
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])  

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (selectedEpochId === null) {
      params.delete('epoch')
    } else {
      params.set('epoch', selectedEpochId.toString())
    }
    
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }, [selectedEpochId])

  useEffect(() => {
    if (currentPage === 'dashboard' && data) {
      prefetchAll()
    }
  }, [currentPage, data, prefetchAll])

  const handleRefresh = () => {
    refetch()
  }

  const handleEpochSelect = (epochId: number | null) => {
    setSelectedEpochId(epochId)
  }
  
  const handleParticipantSelect = (address: string | null) => {
    if (!address) {
      setSelectedAddress(null)
      setCurrentPage('dashboard')
      return
    }

    setSelectedAddress(address)
    setCurrentPage('address')
    
    const params = new URLSearchParams()
    params.set('page', 'address')
    params.set('address', address)

    window.history.pushState({}, '', `?${params.toString()}`)
  }

  const handlePageChange = (page: Page) => {
    setCurrentPage(page)
    
    const params = new URLSearchParams(window.location.search)
    if (page === 'timeline') {
      params.set('page', 'timeline')
      params.delete('epoch')
      params.delete('model')
    } else if (page === 'models') {
      params.set('page', 'models')
      params.delete('block')
    } else if (page === 'transactions') {
      params.set('page', 'transactions')
      params.delete('epoch')
      params.delete('model')
    } else if (page === 'nodemap') {
      params.set('page', 'nodemap')
      params.delete('epoch')
      params.delete('model')    
    } else {
      params.delete('page')
      params.delete('block')
      params.delete('model')
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.pushState({}, '', newUrl)
  }

  const handleAddressSearch = () => {
    const input = addressSearch.trim()
    if (!input) {
      toast.error('Please enter an address')
      return
    }

    if (!isValidGonkaAddress(input)) {
      toast.error('Invalid Gonka address')
      return
    }

    setSelectedAddress(input)
    setCurrentPage('address')

    const params = new URLSearchParams()
    params.set('page', 'address')
    params.set('address', input)

    window.history.pushState({}, '', `?${params.toString()}`)
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading inference statistics...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{duration: 3000,}}/>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-[1600px]">
        {currentPage !== 'address'  && (
          <header className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6">
              <img src="/gonka.svg" alt="Gonka" className="h-10 sm:h-12 w-auto" />
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  Gonka Chain Inference Tracker
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Real-time monitoring of participant performance and model availability
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                <button
                  onClick={() => handlePageChange('dashboard')}
                  className={`flex-1 sm:flex-none px-4 py-2 font-medium rounded-md transition-colors ${
                    currentPage === 'dashboard'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Host Dashboard
                </button>
                <button
                  onClick={() => handlePageChange('models')}
                  className={`flex-1 sm:flex-none px-4 py-2 font-medium rounded-md transition-colors ${
                    currentPage === 'models'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Models
                </button>
                <button
                  onClick={() => handlePageChange('timeline')}
                  className={`flex-1 sm:flex-none px-4 py-2 font-medium rounded-md transition-colors ${
                    currentPage === 'timeline'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => handlePageChange('transactions')}
                  className={`flex-1 sm:flex-none px-4 py-2 font-medium rounded-md transition-colors ${
                    currentPage === 'transactions'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => handlePageChange('nodemap')}
                  className={`flex-1 sm:flex-none px-4 py-2 font-medium rounded-md transition-colors ${
                    currentPage === 'nodemap'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Node Map
                </button>
              </div>

              <div className="ml-auto relative">
                <input
                  type="text"
                  placeholder="Search address"
                  value={addressSearch}
                  onChange={e => setAddressSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
                  className="w-64 h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
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
          ) : currentPage === 'transactions' ? (
            <Transactions /> 
          ) : currentPage === 'nodemap' ? (
            <ParticipantMap />
          ) : currentPage === 'address' ? (
            selectedAddress && data ? (
              (() => {
                const participant = data.participants.find(
                  p => p.index.toLowerCase() === selectedAddress.toLowerCase()
                )
            
                if (participant) {
                  return (
                    <ParticipantModal
                      participantId={participant.index}
                      epochId={selectedEpochId ?? data.epoch_id}
                      currentEpochId={currentEpochId}
                    />
                  )
                }
            
                return <Address address={selectedAddress} />
              })()
            ) : null
          ) : (
            data && (
              <>
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6 border border-gray-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">Epoch ID</div>
                      <div className="flex items-center gap-2 min-h-[2rem]">
                        <span className="text-2xl font-bold text-gray-900 leading-none">
                          {data.epoch_id}
                        </span>
                        {data.is_current && (
                          <span className="px-2.5 py-0.5 text-xs font-semibold bg-gray-900 text-white rounded">
                            CURRENT
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
                      <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">Current Block</div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900 leading-none">
                          {shouldShowEstimatedBlock ? estimatedBlock.toLocaleString() : data.height.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 min-h-[1.25rem]">
                          {shouldShowEstimatedBlock && (
                            <>Last confirmed: {data.height.toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
                      <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">Total Participants</div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900 leading-none">
                          {data.participants.length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 min-h-[1.25rem]"></div>
                      </div>
                    </div>

                    <div className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6">
                      <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">Total Weight</div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900 leading-none">
                          {data.participants.reduce((sum, p) => sum + p.weight, 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ~{Math.round(data.participants.reduce((sum, p) => sum + p.weight, 0) / 437)} H100 GPUs
                        </div>
                      </div>
                    </div>

                    <div className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6 col-span-2 sm:col-span-3 lg:col-span-1">
                      <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">Total Assigned Rewards</div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900 leading-none">
                          {data.total_assigned_rewards_gnk !== undefined && data.total_assigned_rewards_gnk !== null && data.total_assigned_rewards_gnk > 0
                            ? `${data.total_assigned_rewards_gnk.toLocaleString()} GNK`
                            : '-'
                          }
                        </div>
                        <div className="text-xs text-gray-500 mt-1 min-h-[1.25rem]">
                          {(data.total_assigned_rewards_gnk === undefined || data.total_assigned_rewards_gnk === null || data.total_assigned_rewards_gnk === 0) && (
                            <>{loading ? 'Loading...' : data.is_current ? 'Pending settlement' : 'Calculating...'}</>
                          )}
                        </div>
                      </div>
                    </div>

                    <EpochTimer data={data} />
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200">
                    <div className="flex-1 flex items-center justify-center sm:justify-start">
                      {selectedEpochId === null && (
                        <span className="text-xs text-gray-500">
                          Auto-refreshing every 30s
                          {dataUpdatedAt && ` (${Math.floor((Date.now() - dataUpdatedAt) / 1000)}s ago)`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <EpochSelector
                        currentEpochId={currentEpochId || data.epoch_id}
                        selectedEpochId={selectedEpochId}
                        onSelectEpoch={handleEpochSelect}
                        disabled={loading}
                      />
                      <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                        Participant Statistics
                      </h2>
                      <p className="text-xs md:text-sm text-gray-500">
                        Rows with red background indicate missed rate or invalidation rate exceeding 10%
                      </p>
                    </div>
                  </div>
                  <ParticipantTable 
                    participants={data.participants} 
                    epochId={data.epoch_id}
                    isCurrentEpoch={data.is_current}
                    currentEpochId={currentEpochId}
                    selectedParticipantId={selectedAddress &&
                      data.participants.some(p => p.index === selectedAddress)
                        ? selectedAddress
                        : null
                    }
                    onParticipantSelect={handleParticipantSelect}
                  />
                </div>
              </>
            )
          )}
        </div>
        
        <footer className="bg-white border-t border-gray-200 py-6 mt-12">
          <div className="container mx-auto px-4 max-w-[1600px]">
            <div className="flex items-center justify-center text-sm">
              <a 
                href="https://github.com/gonka-ai/gonka-tracker" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
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
