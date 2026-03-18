import { useMemo } from 'react'
import { useUrlParam } from '../hooks/useUrlParam'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { timeAgo, apiFetch } from '../utils'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'


type BlockItem = {
  height: number
  tx_count: number
  timestamp: string
}

type BlocksResponse = {
  blocks: BlockItem[]
}

export function Blocks() {
  const [, setSelectedHeight] = useUrlParam('height')

  const { data, isLoading, error, refetch } = useQuery<BlocksResponse>({
    queryKey: ['blocks', 'recent'],
    queryFn: () => apiFetch('/v1/blocks/recent'),
    staleTime: 10000,
    refetchInterval: 10000,
    refetchOnMount: true,
  })

  const blocks = useMemo(() => {
    if (!data?.blocks) return []
    return [...data.blocks].sort((a, b) => b.height - a.height)
  }, [data])

  const latestBlocks = useMemo(() => {
    return blocks.slice(0, 30)
  }, [blocks])
  
  const chartData = useMemo(() => {
    return [...blocks]
      .slice()
      .reverse()
      .map(b => ({
        height: b.height,
        txs: b.tx_count,
      }))
  }, [blocks])

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading && !data) {
    return <LoadingScreen label="Loading blocks..." />
  }

  if (error && !data) {
    return <ErrorScreen error={error} title="Failed to load blocks" onRetry={handleRefresh} />
  }

  if (!data) return null

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 md:p-6">
        <h2 className="text-sm sm:text-base font-medium text-gray-700 mb-3 sm:mb-4">Txs</h2>

        <div className="w-full overflow-x-hidden">
          <div className="h-[220px] sm:h-[240px] md:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="height" tick={{ fontSize: 11 }} tickFormatter={v => v.toString()} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} txs`, 'Txs']} labelFormatter={l => `Height ${l}`}/>
                <Bar dataKey="txs" fill="#16a34a" radius={[3, 3, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {latestBlocks.map(block => (
          <div
            key={block.height}
            onClick={() => {
              const height = block.height.toString()
              setSelectedHeight(height)
              const params = new URLSearchParams(window.location.search)
              params.set('page', 'blocks')
              params.set('height', height)
              window.history.pushState({}, '', `?${params}`)
            }}
            className="cursor-pointer rounded-lg border border-gray-200 p-3 sm:p-4 transition hover:bg-blue-50 hover:ring-1 hover:ring-blue-300 active:bg-blue-100"       
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="text-base sm:text-lg font-mono font-semibold text-gray-900 break-all">{block.height}</div>
              <div className="text-[11px] sm:text-xs text-green-600 whitespace-nowrap">{timeAgo(block.timestamp)}</div>
            </div>

            <div className="text-xs sm:text-sm text-gray-600">{block.tx_count} txs</div>
          </div>
        ))}
      </div>
    </div>
  )
}
