import { AddressTransactionsResponse } from '../types/inference'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'

interface AddressTransactionsTableProps {
  transactions?: AddressTransactionsResponse
  isLoading: boolean
  error?: Error | null
}

export function AddressTransactionsTable({transactions, isLoading, error,}: AddressTransactionsTableProps) {
  if (isLoading) {
    return <LoadingScreen label="Loading transactions..." className="py-10" />
  }

  if (error) {
    return <ErrorScreen error={error} title="Failed to load transactions" className="py-10" />
  }

  if (!transactions || transactions.transactions.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 text-sm text-gray-400">No transactions found for this address</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[640px] sm:min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 sm:px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Height</th>
            <th className="px-2 sm:px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Hash</th>
            <th className="px-2 sm:px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Messages</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.transactions.map(tx => (
            <tr key={tx.tx_hash} className="hover:bg-gray-50">
              <td className="px-2 sm:px-4 py-2 text-center text-sm text-blue-600 whitespace-nowrap">
                <a href={`?page=blocks&height=${tx.height}`} rel="noopener noreferrer" className="hover:underline">{tx.height.toLocaleString()}</a>
              </td>
              <td className="px-2 sm:px-4 py-2 text-center text-xs sm:text-sm font-mono text-blue-600 break-all max-w-[180px] sm:max-w-md">
                <a href={`?page=transactions&tx=${tx.tx_hash}`} rel="noopener noreferrer" className="hover:underline">
                  <div className="truncate max-w-[220px] sm:max-w-none mx-auto" title={tx.tx_hash}>
                    {tx.tx_hash}
                  </div>
                </a>
              </td>
              <td className="px-2 sm:px-4 py-2 text-center text-xs sm:text-sm text-gray-700 break-words">{tx.messages.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
