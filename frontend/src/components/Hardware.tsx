import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HardwaresResponse, HardwareStats, HardwareEpochSeriesResponse } from '../types/inference'
import { apiFetch, buildEpochRows } from '../utils'
import { HardwareModal } from './HardwareModal'
import { EpochAreaChart } from './common/EpochAreaChart'
import { StatItem } from './common/StatItem'
import { EpochIdDisplay } from './common/EpochIdDisplay'
import { RefreshControlFooter } from './common/RefreshControlFooter'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'

export function Hardware() {
  const [selectedEpochId, setSelectedEpochId] = useState<number | null>(null)
  const [currentEpochId, setCurrentEpochId] = useState<number | null>(null)
  const [selectedHardwareId, setSelectedHardwareId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [extraHardwareId, setExtraHardwareId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery<HardwaresResponse>({
    queryKey: ['hardware', selectedEpochId === null ? 'current' : selectedEpochId],
    queryFn: () => apiFetch(selectedEpochId ? `/v1/hardware/epochs/${selectedEpochId}` : '/v1/hardware/current'),
    staleTime: 90000,
    refetchInterval: 90000,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  })

  const { data: metricsData, isLoading: metricsLoading } = useQuery<HardwareEpochSeriesResponse>({
    queryKey: ['hardware-metrics'],
    queryFn: () => apiFetch('/v1/metrics/hardware'),
    staleTime: 300000,
    refetchInterval: 300000,
    refetchOnMount: false,
  })

  useEffect(() => {
    if (data?.is_current) {
      setCurrentEpochId(data.epoch_id)
    }
  }, [data])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const epochParam = params.get('epoch')
    const hardwareParam = params.get('hardware')
    
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
    params.set('page', 'hardware')
    
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

  if (isLoading && !data) {
    return <LoadingScreen label="Loading hardware..." />
  }

  if (error && !data) {
    return <ErrorScreen error={error} onRetry={handleRefresh} />
  }

  if (!data) return null

  const allModels = Array.from(new Set(data.hardware.flatMap(hardware => hardware.models))).sort()
  let filteredHardwares = data.hardware

  if (selectedModel) {
    filteredHardwares = filteredHardwares.filter(hw =>
      hw.models.includes(selectedModel),
    )
  }
  const canExpand = filteredHardwares.length > 5
  const sortedByWeight = [...filteredHardwares].sort((a, b) => b.total_weight - a.total_weight)
  const sortedByAmount = [...filteredHardwares].sort((a, b) => b.amount - a.amount)

  const top5ByWeight = sortedByWeight.slice(0, 5)
  const top5ByAmount = sortedByAmount.slice(0, 5)

  let displayHardwares: HardwareStats[] = []
  
  if (showAll && canExpand) {
    displayHardwares = sortedByWeight
  } else {
    displayHardwares = [...top5ByWeight]
    if (
      extraHardwareId &&
        !displayHardwares.some(h => h.id === extraHardwareId)
    ) {
      const extra = data.hardware.find(h => h.id === extraHardwareId)
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
    ? data.hardware.find(h => h.id === selectedHardwareId) || null
    : null
  
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <div className="col-span-2 sm:col-span-1">
            <EpochIdDisplay epochId={data.epoch_id} isCurrent={data.is_current} />
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
            <StatItem label="Total Weight" subText="">{data.total_weight.toLocaleString()}</StatItem>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
            <StatItem label="Total Hardware" subText="">{data.hardware.reduce((sum, hardware) => sum + hardware.amount, 0).toLocaleString()}</StatItem>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 lg:pl-6">
            <StatItem label="Supported Hardware Types" subText="">{data.hardware.length}</StatItem>
          </div>
        </div>

        <RefreshControlFooter
          refreshInterval="90s"
          selectedEpochId={selectedEpochId}
          dataUpdatedAt={dataUpdatedAt}
          currentEpochId={currentEpochId || data.epoch_id}
          isLoading={isLoading}
          onSelectEpoch={handleEpochSelect}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200 mb-8 md:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Hardware</h2>
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">Click on a hardware to view detailed information</p>
          </div>

          <select
            value={selectedModel ?? ''}
            onChange={(e) => setSelectedModel(e.target.value || null)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white w-full sm:w-56 h-10 sm:max-w-[14rem] truncate focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option className="text-sm" value="">Select Model</option>
            {allModels.map(model => (<option key={model} value={model}>{model}</option>))}
          </select>
        </div>


        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-[640px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Hardware</th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Total Weight</th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayHardwares.map((hardware) => {
                return (
                  <tr key={hardware.id} onClick={() => handleRowClick(hardware)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-3 text-sm font-mono text-gray-900 whitespace-nowrap">{hardware.id}</td>
                    <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">{hardware.total_weight.toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{hardware.amount}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {canExpand && (
          <div className="w-full flex justify-center mt-4">
            <button
              onClick={() => {
                setShowAll(!showAll)
                setExtraHardwareId(null)
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition rounded-md"
            >
              <span className="text-lg leading-none">{showAll ? '▲' : '▼'}</span>
              <span>{showAll ? 'Collapse' : 'All Hardware'}</span>
            </button>
          </div>
        )}
      </div>

      <HardwareModal 
        hardware={selectedHardware}
        epochId={selectedEpochId ?? data.epoch_id}
        currentEpochId={currentEpochId}
        onClose={() => handleHardwareSelect(null)} 
      />

      {metricsData && !metricsLoading && (
        <div className="flex flex-col gap-6 sm:gap-8 md:gap-10 mb-8 md:mb-10">
          <EpochAreaChart title="Total Weight" data={totalWeightData} />
          <EpochAreaChart title="Amount" data={amountData} />
        </div>
      )}

    </div>
  )
}
