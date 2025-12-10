import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClockIcon } from "@heroicons/react/24/outline";
import { TransactionsResponse } from '../types/inference'

export function Transactions() {
  const apiUrl = import.meta.env.VITE_API_URL || '/api'

  const [selectedTxHash, setSelectedTxHash] = useState<string | null>(null)

  const fetchTransactions = async () => {
    const endpoint = `${apiUrl}/v1/transactions`
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  const { data, isLoading: loading, error: queryError, refetch, dataUpdatedAt } = useQuery<TransactionsResponse>({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    staleTime: 10000,
    refetchInterval: 10000,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  })

  const error = queryError ? (queryError as Error).message : ''

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const txParam = params.get('tx')
    if (txParam) {
      setSelectedTxHash(txParam)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', 'transactions')

    if (selectedTxHash) {
      params.set('tx', selectedTxHash)
    } else {
      params.delete('tx')
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname

    window.history.replaceState({}, '', newUrl)
  }, [selectedTxHash])

  const handleRefresh = () => {
    refetch()
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

  if (!data) return null

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
        <div className="mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
            Transactions
            </h2>
            <p className="text-xs text-gray-500 mt-1">
                Auto-refreshing every 10s
                {dataUpdatedAt && ` (${Math.floor((Date.now() - dataUpdatedAt) / 1000)}s ago)`}
            </p>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[10%]">HEIGHT</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[55%]">HASH</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[15%]">MESSAGES</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[20%]">TIME</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {data.transactions.map((tx) => (
                <tr
                  key={tx.tx_hash}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-center text-gray-900 w-[10%]">{tx.height}</td>
                  <td className="px-4 py-3 text-sm text-center font-mono text-gray-900 w-[55%]">{tx.tx_hash}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 w-[15%]">{tx.messages.join(", ")}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 w-[20%]">
                    <div className="flex items-center justify-center gap-1">
                        <ClockIcon className="w-4 h-4 text-gray-500" />
                        <span>
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleString("en-CA", {
                            hour12: false,
                            timeZone: "UTC"
                        }) : "-" }
                        </span>
                    </div>
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
