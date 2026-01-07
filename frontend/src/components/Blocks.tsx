import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { timeAgo } from '../utils'


type BlockItem = {
  height: number
  tx_count: number
  timestamp: string
}

type BlocksResponse = {
  blocks: BlockItem[]
}

export function Blocks() {
  const [selectedHeight, setSelectedHeight] = useState<string | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'

  const fetchBlocks = async () => {
    const endpoint = `${apiUrl}/v1/blocks/recent`
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  const { data, isLoading: loading, error: queryError, refetch } = useQuery<BlocksResponse>({
    queryKey: ['blocks', 'recent'],
    queryFn: fetchBlocks,
    staleTime: 10000,
    refetchInterval: 10000,
    refetchOnMount: true,
  })

  const error = queryError ? (queryError as Error).message : ''

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const HeightParam = params.get('height')
    if (HeightParam) {
      setSelectedHeight(HeightParam)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', 'blocks')

    if (selectedHeight) {
      params.set('height', selectedHeight)
    } else {
      params.delete('height')
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname

    window.history.replaceState({}, '', newUrl)
  }, [selectedHeight])

  const handleRefresh = () => {
    refetch()
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading blocks...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Failed to load blocks</h2>
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

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Txs</h2>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="height" tick={{ fontSize: 11 }} tickFormatter={v => v.toString()}/>
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v} txs`, 'Txs']} labelFormatter={l => `Height ${l}`}/>
              <Bar dataKey="txs" fill="#16a34a" radius={[3, 3, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
            className="cursor-pointer rounded-lg border border-gray-200 p-4 transition hover:bg-blue-50 hover:ring-1 hover:ring-blue-300"       
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-mono font-semibold text-gray-900">{block.height}</div>
              <div className="text-xs text-green-600">{timeAgo(block.timestamp)}</div>
            </div>

            <div className="text-sm text-gray-600">{block.tx_count} txs</div>
          </div>
        ))}
      </div>
    </div>
  )
}
