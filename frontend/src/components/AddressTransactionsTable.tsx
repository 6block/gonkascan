import { AddressTransactionsResponse } from '../types/inference'

interface AddressTransactionsTableProps {
  transactions?: AddressTransactionsResponse
  isLoading: boolean
  error?: unknown
}

export function AddressTransactionsTable({transactions, isLoading, error,}: AddressTransactionsTableProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">Loading transactions...</div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">Failed to load transactions</div>
    )
  }

  if (!transactions || transactions.transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">No transactions found for this address</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Height</th>
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Hash</th>
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Messages</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.transactions.map(tx => (
            <tr key={tx.tx_hash} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-center text-sm text-blue-600 whitespace-nowrap">
                <a href={`?page=blocks&height=${tx.height}`} rel="noopener noreferrer" className="hover:underline">{tx.height.toLocaleString()}</a>
              </td>
              <td className="px-4 py-2 text-center text-sm font-mono text-blue-600 break-all max-w-md">
                <a href={`?page=transactions&tx=${tx.tx_hash}`} rel="noopener noreferrer" className="hover:underline"> {tx.tx_hash}</a>
              </td>
              <td className="px-4 py-2 text-center text-sm text-gray-700">{tx.messages.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
