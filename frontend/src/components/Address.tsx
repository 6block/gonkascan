import { useQuery } from '@tanstack/react-query'
import { AddressTransactionsResponse, AssetsResponse } from '../types/inference'
import { AddressTransactionsTable } from './AddressTransactionsTable'
import { formatGNK } from '../utils'

interface AddressProps {
  address: string
}

export function Address({ address }: AddressProps) {
  const { data: assets, isLoading: assetsLoading } = useQuery<AssetsResponse>({
    queryKey: ['address-assets', address],
    queryFn: async () => {
      const res = await fetch(`/api/v1/address/assets/${address}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!address,
  })

  const { data: transactions, isLoading: transactionsLoading, error: transactionsError} = useQuery<AddressTransactionsResponse>({
    queryKey: ['address-transactions', address],
    queryFn: async () => {
      const res = await fetch(`/api/v1/transactions/${address}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!address,
  })

  const NGONKA = 1e9

  const balance = assets?.balances?.find(b => b.denom === 'ngonka')
    ? Number(assets.balances.find(b => b.denom === 'ngonka')!.amount) / NGONKA : 0

  const vesting = assets?.total_vesting?.find(v => v.denom === 'ngonka')
    ? Number(assets.total_vesting.find(v => v.denom === 'ngonka')!.amount) / NGONKA : 0

  const total = balance + vesting

  const handleBack = () => {
    const params = new URLSearchParams(window.location.search)
    params.delete('page')
    params.delete('address')

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname

    window.history.pushState({}, '', newUrl)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 py-6">
      <div className="bg-white rounded-lg shadow-sm">

        <div className="border-b border-gray-200 px-6 py-4">
          <nav className="flex items-center text-sm text-gray-500 mb-1">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>

            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{address}</span>
          </nav>
        </div>

        <div className="px-6 py-8">
          <div className="grid grid-cols-3 gap-12">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total</div>
              <div className="text-2xl font-semibold text-gray-900">{assetsLoading ? '-' : formatGNK(total)}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Balance</div>
              <div className="text-2xl font-semibold text-gray-900">{assetsLoading ? '-' : formatGNK(balance)}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Vesting</div>
              <div className="text-2xl font-semibold text-gray-900">{assetsLoading ? '-' : formatGNK(vesting)}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Transactions
          </h3>

          <AddressTransactionsTable
            transactions={transactions}
            isLoading={transactionsLoading}
            error={transactionsError}
          />

        </div>

      </div>
    </div>
  )
}
