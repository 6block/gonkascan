import { useQuery } from '@tanstack/react-query'
import { timeAgo, apiFetch, toGonka, formatDateTime } from '../utils'
import { TransactionDetailResponse } from '../types/inference'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'
import { BackNavigation } from './common/BackNavigation'
import { JsonSection } from './common/JsonViewer'
import { MessageBlock } from './common/StructRenderer'

export function TransactionDetail({ txHash }: {txHash: string }) {
  const { data, isLoading, error } = useQuery<TransactionDetailResponse>({
    queryKey: ['transaction', txHash],
    queryFn: () => apiFetch(`/v1/transaction/${txHash}`),
    enabled: !!txHash,
  })

  if (isLoading) {
    return <LoadingScreen label="Loading transaction detail..." />
  }

  if (error || !data) {
    return <ErrorScreen error={error} title="Failed to load transaction detail" />
  }

  const fee =
    data.tx.auth_info.fee.amount.length > 0
      ? data.tx.auth_info.fee.amount
        .map((a) => `${toGonka(a.amount)} ${a.denom.replace(/^n/, '')}`)
        .join(', ')
      : '-'

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
      <div className="rounded-lg shadow-sm">
        <div className="px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <BackNavigation onBack={() => window.history.back()} title={data.txhash.toUpperCase()} />
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">Tx Hash</h3>
                <p className="font-mono text-sm break-all leading-relaxed text-gray-700">{data.txhash.toUpperCase()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Height</p>
                <p className="font-medium">{data.height}</p>
              </div>

              <div>
                <p className="text-gray-500 font-medium">Status</p>
                <p className={data.code === 0 ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
                  {data.code === 0 ? 'Success' : 'Failed'}
                </p>
              </div>

              <div>
                <p className="text-gray-500 font-medium">Time</p>
                <p className="break-words leading-relaxed">
                  {formatDateTime(data.timestamp)}{' '}
                  <span className="text-xs text-gray-500">({timeAgo(data.timestamp)})</span>
                </p>
              </div>


              <div>
                <p className="text-gray-500 font-medium">Gas(GNK)</p>
                <p className="break-all leading-relaxed">{toGonka(data.gas_used)} / {toGonka(data.gas_wanted)}</p>
              </div>

              <div>
                <p className="text-gray-500 font-medium">Fee</p>
                <p className="break-all leading-relaxed">{fee}</p>
              </div>

              <div>
                <p className="text-gray-500 font-medium">Memo</p>
                <p className="break-all leading-relaxed">{data.tx.body.memo || '-'}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg border p-4 md:p-6">
            <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Messages ({data.tx.body.messages.length})</h4>
            {data.tx.body.messages.map((msg, idx) => (<MessageBlock key={idx} msg={msg} />))}
          </section>

          <JsonSection data={data} />

        </div>
      </div>
    </div>
  )
}
