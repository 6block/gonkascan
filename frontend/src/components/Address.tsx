import { useQuery } from '@tanstack/react-query'
import { AddressTransactionsResponse, AssetsResponse } from '../types/inference'
import { AddressTransactionsTable } from './AddressTransactionsTable'
import { formatGNK, apiFetch, toGonka } from '../utils'
import { BackNavigation } from './common/BackNavigation'

interface AddressProps {
  address: string
}

export function Address({ address }: AddressProps) {
  const { data: assets, isLoading: assetsLoading } = useQuery<AssetsResponse>({
    queryKey: ['address-assets', address],
    queryFn: () => apiFetch(`/v1/address/assets/${address}`),
    enabled: !!address,
  })

  const { data: transactions, isLoading: transactionsLoading, error: transactionsError} = useQuery<AddressTransactionsResponse>({
    queryKey: ['address-transactions', address],
    queryFn: () => apiFetch(`/v1/transactions/${address}`),
    enabled: !!address,
  })

  const balance = assets?.balances?.find(b => b.denom === 'ngonka')
    ? toGonka(assets.balances.find(b => b.denom === 'ngonka')!.amount) : 0

  const vesting = assets?.total_vesting?.find(v => v.denom === 'ngonka')
    ? toGonka(assets.total_vesting.find(v => v.denom === 'ngonka')!.amount) : 0

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
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
      <div className="bg-white rounded-lg shadow-sm">

        <div className="border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <BackNavigation onBack={handleBack} backLabel="Dashboard" title={address} />
        </div>

        <div className="px-3 sm:px-4 md:px-6 py-5 sm:py-6 md:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 md:gap-12">
            <div className="bg-gray-50 p-4 rounded">
              <div className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900 break-words">{assetsLoading ? '-' : formatGNK(total)}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <div className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Balance</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900 break-words">{assetsLoading ? '-' : formatGNK(balance)}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <div className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vesting</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900 break-words">{assetsLoading ? '-' : formatGNK(vesting)}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-3 sm:px-4 md:px-6 py-5 sm:py-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 sm:mb-4">Transactions</h3>

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
