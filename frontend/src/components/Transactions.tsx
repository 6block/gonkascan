import { useQuery } from '@tanstack/react-query'
import { useUrlParam } from '../hooks/useUrlParam'
import { ClockIcon } from '@heroicons/react/24/outline'
import { TransactionsResponse } from '../types/inference'
import { apiFetch, formatDateTime } from '../utils'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'

export function Transactions() {
  const [selectedTxHash, setSelectedTxHash] = useUrlParam('tx')

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery<TransactionsResponse>({
    queryKey: ['transactions'],
    queryFn: () => apiFetch('/v1/transactions'),
    staleTime: 10000,
    refetchInterval: 10000,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  })

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading && !data) {
    return <LoadingScreen label="Loading transactions..." />
  }

  if (error && !data) {
    return <ErrorScreen error={error} onRetry={handleRefresh} />
  }

  if (!data) return null

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Transactions</h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Auto-refreshing every 10s
            {dataUpdatedAt && ` (${Math.floor((Date.now() - dataUpdatedAt) / 1000)}s ago)`}
          </p>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[10%]">HEIGHT</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[55%]">HASH</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[15%]">MESSAGES</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[20%]">TIME</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {data.transactions.map((tx) => (
                <tr
                  key={tx.tx_hash}
                  onClick={() => {
                    setSelectedTxHash(tx.tx_hash)
                    const params = new URLSearchParams(window.location.search)
                    params.set('page', 'transactions')
                    params.set('tx', tx.tx_hash)
                    window.history.pushState({}, '', `?${params}`)
                  }}    
                  className={[
                    'cursor-pointer',
                    selectedTxHash === tx.tx_hash
                      ? 'bg-blue-50 ring-1 ring-blue-200'
                      : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center text-gray-900 w-[10%]">
                    <a
                      href={`?page=blocks&height=${tx.height}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block w-full truncate text-blue-600 hover:text-blue-800 hover:underline"
                      title={tx.height.toString()}
                    >
                      {tx.height}
                    </a>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center font-mono text-gray-900 w-[55%]">
                    <div className="truncate max-w-[220px] sm:max-w-none mx-auto" title={tx.tx_hash}>{tx.tx_hash}</div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center text-gray-900 w-[15%] break-words">{tx.messages.join(', ')}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center text-gray-900 w-[20%]">
                    <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                      <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                      <span>{tx.timestamp ? formatDateTime(tx.timestamp) : '-'}</span>
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
