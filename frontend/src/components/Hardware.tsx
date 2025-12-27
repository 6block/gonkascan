import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HardwaresResponse, HardwareStats, EpochSeriesPoint, HardwareEpochSeriesResponse, } from '../types/inference'
import { EpochSelector } from './EpochSelector'
import { HardwareModal } from './HardwareModal'
import { EpochAreaChart } from "./ModelChart"

type EpochRow = { epoch: number } & Record<string, number>

function buildEpochRows(series: Record<string, EpochSeriesPoint[]>): EpochRow[] {
  const epochMap = new Map<number, EpochRow>()
  const models = Object.keys(series)

  for (const [model, points] of Object.entries(series)) {
    for (const p of points) {
      if (!epochMap.has(p.epoch_id)) {
        epochMap.set(p.epoch_id, { epoch: p.epoch_id })
      }
      epochMap.get(p.epoch_id)![model] = p.value
    }
  }

  for (const row of epochMap.values()) {
    for (const model of models) {
      if (row[model] == null) {
        row[model] = 0
      }
    }
  }

  return Array.from(epochMap.values()).sort((a, b) => a.epoch - b.epoch)
}

export function Hardware() {
  const [selectedEpochId, setSelectedEpochId] = useState<number | null>(null)
  const [currentEpochId, setCurrentEpochId] = useState<number | null>(null)
  const [selectedHardwareId, setSelectedHardwareId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [extraHardwareId, setExtraHardwareId] = useState<string | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'

  const fetchHardware = async (epochId: number | null) => {
    const endpoint = epochId
      ? `${apiUrl}/v1/hardware/epochs/${epochId}`
      : `${apiUrl}/v1/hardware/current`
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  const { data, isLoading: loading, error: queryError, refetch, dataUpdatedAt } = useQuery<HardwaresResponse>({
    queryKey: ['hardwares', selectedEpochId === null ? 'current' : selectedEpochId],
    queryFn: () => fetchHardware(selectedEpochId),
    staleTime: 90000,
    refetchInterval: 90000,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  })

  const fetchHardwareMetrics = async () => {
    const endpoint = `${apiUrl}/v1/metrics/hardwares`
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  const { data: metricsData, isLoading: metricsLoading } = useQuery<HardwareEpochSeriesResponse>({
    queryKey: ['hardware-metrics'],
    queryFn: fetchHardwareMetrics,
    staleTime: 300000,
    refetchInterval: 300000,
    refetchOnMount: false,
  })
  
  const error = queryError ? (queryError as Error).message : ''

  useEffect(() => {
    if (data?.is_current) {
      setCurrentEpochId(data.epoch_id)
    }
  }, [data])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const epochParam = params.get('epoch')
    const hardwareParam = params.get('hardwares')
    
    if (epochParam) {
      const epochId = parseInt(epochParam)
      if (!isNaN(epochId)) {
        setSelectedEpochId(epochId)
        if (hardwareParam) {
            setSelectedHardwareId(hardwareParam)
        }
        return
      }
    }
    
    if (hardwareParam) {
        setSelectedHardwareId(hardwareParam)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', 'hardwares')
    
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

  const handleRefresh = () => {
    refetch()
  }

  const handleEpochSelect = (epochId: number | null) => {
    setSelectedEpochId(epochId)
  }

  const handleHardwareSelect = (hardwareId: string | null) => {
    setSelectedHardwareId(hardwareId)
    
    const params = new URLSearchParams(window.location.search)
    if (hardwareId) {
      params.set('hardware', hardwareId)
    } else {
      params.delete('hardware')
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }

  const handleRowClick = (hardware: HardwareStats) => {
    handleHardwareSelect(hardware.id)
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading hardware...</p>
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
          <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Retry</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const sortedByWeight = [...data.hardwares].sort((a, b) => b.total_weight - a.total_weight)
  const sortedByAmount = [...data.hardwares].sort((a, b) => b.amount - a.amount)
  const sortedByName = [...data.hardwares].sort((a, b) =>a.id.localeCompare(b.id))
  
  const top5ByWeight = sortedByWeight.slice(0, 5)
  const top5ByAmount = sortedByAmount.slice(0, 5)

  let displayHardwares: HardwareStats[] = []
  
  if (showAll) {
    displayHardwares = sortedByWeight
  } else {
    displayHardwares = [...top5ByWeight]
    if (
        extraHardwareId &&
        !displayHardwares.some(h => h.id === extraHardwareId)
    ) {
        const extra = data.hardwares.find(h => h.id === extraHardwareId)
        if (extra) {
        displayHardwares.push(extra)
        }
    }
  }
  
  const top5WeightIds = top5ByWeight.map(h => h.id)
  const top5AmountIds = top5ByAmount.map(h => h.id)
  const totalWeightData = metricsData? buildEpochRows(
        Object.fromEntries(Object.entries(metricsData.series.total_weight).filter(([k]) => top5WeightIds.includes(k)))): []
  const amountData = metricsData? buildEpochRows(
    Object.fromEntries(Object.entries(metricsData.series.amount).filter(([k]) => top5AmountIds.includes(k)))): []

  const selectedHardware = selectedHardwareId 
    ? data.hardwares.find(h => h.id === selectedHardwareId) || null
    : null
  
  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6 border border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">Epoch ID</div>
            <div className="flex items-center gap-2 min-h-[2rem]">
              <span className="text-2xl font-bold text-gray-900 leading-none">{data.epoch_id}
              </span>
              {data.is_current && (
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-gray-900 text-white rounded">CURRENT</span>
              )}
            </div>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
            <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">Total Weight</div>
            <div>
              <div className="text-2xl font-bold text-gray-900 leading-none">
                {data.total_weight.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1 min-h-[1.25rem]"></div>
            </div>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
            <div className="text-sm font-medium text-gray-500 mb-1 leading-tight">Total Hardware</div>
            <div>
              <div className="text-2xl font-bold text-gray-900 leading-none">
                {data.hardwares.length}
              </div>
              <div className="text-xs text-gray-500 mt-1 min-h-[1.25rem]"></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200">
          <div className="flex-1 flex items-center justify-center sm:justify-start">
            {selectedEpochId === null && (
              <span className="text-xs text-gray-500">
                Auto-refreshing every 90s
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

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Hardware</h2>
            <p className="text-xs md:text-sm text-gray-500">Click on a hardware to view detailed information</p>
          </div>

          <div className="flex items-center gap-2">
            <select
            value={extraHardwareId ?? ''}
            onChange={(e) =>setExtraHardwareId(e.target.value || null)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white w-56 h-10 max-w-[14rem] truncate"
            >
              <option className="text-sm" value="">Select Hardware</option>
              {sortedByName.map(hw => (<option key={hw.id} value={hw.id}>{hw.id}</option>))}
            </select>

            <button
                onClick={() => {
                    setShowAll(!showAll)
                    setExtraHardwareId(null)
                }}
                className={`px-3 py-1.5 h-10 text-sm font-medium rounded border transition ${
                    showAll ? 'bg-gray-900 text-white' : 'border-gray-300 hover:text-gray-700'
                }`}
                >All Hardware
            </button>
          </div>
        </div>


        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Hardware</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Weight</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayHardwares.map((hardware) => {
                return (
                  <tr key={hardware.id} onClick={() => handleRowClick(hardware)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{hardware.id}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{hardware.total_weight.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{hardware.amount}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <HardwareModal 
        hardware={selectedHardware}
        epochId={selectedEpochId ?? data.epoch_id}
        currentEpochId={currentEpochId}
        onClose={() => handleHardwareSelect(null)} 
      />

      {metricsData && !metricsLoading && (
        <div className="flex flex-col gap-10 mb-10">
          <EpochAreaChart title="Total Weight" data={totalWeightData} />
          <EpochAreaChart title="Amount" data={amountData} />
        </div>
      )}

    </div>
  )
}
