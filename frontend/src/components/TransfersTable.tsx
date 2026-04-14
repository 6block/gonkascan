import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AddressTransfersResponse, TransferTransaction } from '../types/inference'
import { toGonka, formatGNK, timeAgo, apiFetch, shortHash } from '../utils'
import { usePopover } from '../hooks/usePopover'
import { FilterIcon } from './common/FilterIcon'
import { FilterListPopover } from './common/FilterListPopover'
import { FilterSearchPopover } from './common/FilterSearchPopover'
import { LoadMoreBar } from './common/LoadMoreBar'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'

interface TransfersTableProps {
  address: string
}

const PAGE_SIZE = 20

const DURATION_PRESETS = [
  { label: 'LAST 1H', hours: 1 },
  { label: 'LAST 24H', hours: 24 },
  { label: 'LAST 7D', hours: 7 * 24 },
  { label: 'LAST 30D', hours: 30 * 24 },
  { label: 'LAST 90D', hours: 90 * 24 },
  { label: 'LAST 180D', hours: 180 * 24 },
]

const STATUS_OPTIONS = [
  { label: 'Success', value: 'success' },
  { label: 'Fail', value: 'failed' },
]

function formatTransferAmount(tx: TransferTransaction, address: string) {
  const isOutgoing = tx.from_address === address
  const coin = tx.amount.find(a => a.denom === 'ngonka' || a.denom === 'gonka') || tx.amount[0]
  if (!coin) return { text: '-', color: '' }
  const gonka = coin.denom === 'ngonka' ? toGonka(coin.amount) : Number(coin.amount)
  const sign = isOutgoing ? '-' : '+'
  const color = isOutgoing ? 'text-red-500' : 'text-green-500'
  return { text: `${sign}${formatGNK(gonka)}`, color }
}

export function TransfersTable({ address }: TransfersTableProps) {
  const [extraTransfers, setExtraTransfers] = useState<TransferTransaction[]>([])
  const [loadingMore, setLoadingMore] = useState(false)

  const [msgType, setMsgType] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [timeFrom, setTimeFrom] = useState<string | null>(null)
  const [timeTo, setTimeTo] = useState<string | null>(null)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedFromAddr, setAppliedFromAddr] = useState<string | null>(null)
  const [appliedToAddr, setAppliedToAddr] = useState<string | null>(null)

  const typePop = usePopover()
  const statusPop = usePopover()
  const timePop = usePopover()
  const fromPop = usePopover()
  const toPop = usePopover()

  const buildQs = useCallback((customOffset: number) => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(customOffset))
    if (msgType) params.set('msg_type', msgType)
    if (timeFrom) params.set('time_from', timeFrom)
    if (timeTo) params.set('time_to', timeTo)
    return params.toString()
  }, [msgType, timeFrom, timeTo])

  const { data, isLoading, error } = useQuery<AddressTransfersResponse>({
    queryKey: ['address-transfers', address, msgType, timeFrom, timeTo],
    queryFn: () => apiFetch(`/v1/transfers/${address}?${buildQs(0)}`) as Promise<AddressTransfersResponse>,
    enabled: !!address,
  })

  // Reset extra data when filters change (useQuery refetches the first page)
  useEffect(() => {
    setExtraTransfers([])
  }, [msgType, timeFrom, timeTo])

  const { data: typesData } = useQuery<{ types: string[] }>({
    queryKey: ['address-transfer-types', address],
    queryFn: () => apiFetch(`/v1/transfers/${address}/types`),
    enabled: !!address,
  })

  const typeOptions = useMemo(() =>
    (typesData?.types || []).map(t => ({ label: t, value: t })),
  [typesData])

  const allTransfers = useMemo(() => {
    if (!data) return []
    return [...data.transfers, ...extraTransfers]
  }, [data, extraTransfers])

  const total = data?.total ?? 0

  const list = useMemo(() => {
    let result = allTransfers
    if (statusFilter) result = result.filter(t => t.status === statusFilter)
    if (appliedFromAddr) result = result.filter(t => t.from_address.toLowerCase().includes(appliedFromAddr.toLowerCase()))
    if (appliedToAddr) result = result.filter(t => t.to_address.toLowerCase().includes(appliedToAddr.toLowerCase()))
    return result
  }, [allTransfers, statusFilter, appliedFromAddr, appliedToAddr])

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const offset = (data?.transfers.length ?? 0) + extraTransfers.length
      const result = await apiFetch(
        `/v1/transfers/${address}?${buildQs(offset)}`
      ) as AddressTransfersResponse
      setExtraTransfers(prev => [...prev, ...result.transfers])
    } finally {
      setLoadingMore(false)
    }
  }, [address, data, extraTransfers.length, buildQs])

  function applyPreset(hours: number) {
    const from = new Date(Date.now() - hours * 3600 * 1000)
    setTimeFrom(from.toISOString())
    setTimeTo(null)
    setCustomFrom('')
    setCustomTo('')
    timePop.close()
  }

  function applyCustomTime() {
    setTimeFrom(customFrom ? new Date(customFrom).toISOString() : null)
    setTimeTo(customTo ? new Date(customTo + 'T23:59:59Z').toISOString() : null)
    timePop.close()
  }

  function clearTime() {
    setTimeFrom(null)
    setTimeTo(null)
    setCustomFrom('')
    setCustomTo('')
    timePop.close()
  }

  function closeAllPopovers() {
    typePop.close()
    statusPop.close()
    timePop.close()
    fromPop.close()
    toPop.close()
  }

  if (isLoading) return <LoadingScreen label="Loading transfers..." className="py-10" />
  if (error) return <ErrorScreen error={error} title="Failed to load transfers" className="py-10" />
  if (allTransfers.length === 0) {
    return <div className="text-center py-6 sm:py-8 text-sm text-gray-400">No transfers found</div>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] sm:min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Hash</th>
              <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                <span className="inline-flex items-center">
                  <span>Type</span>
                  <FilterIcon active={!!msgType} onClick={(e) => { closeAllPopovers(); typePop.toggle(e) }} />
                </span>
              </th>
              <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Amount</th>
              <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                <span className="inline-flex items-center">
                  <span>From</span>
                  <FilterIcon active={!!appliedFromAddr} onClick={(e) => { closeAllPopovers(); fromPop.toggle(e) }} />
                </span>
              </th>
              <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                <span className="inline-flex items-center">
                  <span>To</span>
                  <FilterIcon active={!!appliedToAddr} onClick={(e) => { closeAllPopovers(); toPop.toggle(e) }} />
                </span>
              </th>
              <th className="px-2 sm:px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                <span className="inline-flex items-center">
                  <span>Status</span>
                  <FilterIcon active={!!statusFilter} onClick={(e) => { closeAllPopovers(); statusPop.toggle(e) }} />
                </span>
              </th>
              <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Height</th>
              <th className="px-2 sm:px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                <span className="inline-flex items-center justify-end">
                  <span>Time</span>
                  <FilterIcon active={!!(timeFrom || timeTo)} onClick={(e) => { closeAllPopovers(); timePop.toggle(e) }} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {list.map((tx, idx) => {
              const amt = formatTransferAmount(tx, address)
              return (
                <tr key={`${tx.tx_hash}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-2 text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                    <a href={`?page=transactions&tx=${tx.tx_hash.toUpperCase()}`} className="text-blue-600 hover:underline" title={tx.tx_hash.toUpperCase()}>
                      {shortHash(tx.tx_hash.toUpperCase(), 8)}
                    </a>
                  </td>
                  <td className="px-2 sm:px-4 py-2 text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">{tx.msg_type || '-'}</td>
                  <td className={`px-2 sm:px-4 py-2 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis text-left ${amt.color}`}>{amt.text}</td>
                  <td className="px-2 sm:px-4 py-2 text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                    {tx.from_address ? (
                      <a href={`?page=address&address=${tx.from_address}`} className="hover:underline text-blue-600" title={tx.from_address}>
                        {shortHash(tx.from_address, 8)}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-2 sm:px-4 py-2 text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                    {tx.to_address ? (
                      <a href={`?page=address&address=${tx.to_address}`} className="hover:underline text-blue-600" title={tx.to_address}>
                        {shortHash(tx.to_address, 8)}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-2 sm:px-4 py-2 text-sm text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 text-sm font-semibold rounded ${tx.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {tx.status === 'success' ? 'Success' : 'Fail'}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 text-sm text-left whitespace-nowrap">
                    <a href={`?page=blocks&height=${tx.height}`} className="text-blue-600 hover:underline">{tx.height.toLocaleString()}</a>
                  </td>
                  <td className="px-2 sm:px-4 py-2 text-sm text-gray-500 text-center whitespace-nowrap" title={tx.timestamp || ''}>
                    {tx.timestamp ? timeAgo(tx.timestamp) : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <LoadMoreBar
        loaded={allTransfers.length}
        total={total}
        loading={loadingMore}
        label="Transfers"
        onLoadMore={handleLoadMore}
      />

      <FilterListPopover popover={typePop} title="" options={typeOptions} selected={msgType} onSelect={setMsgType} />
      <FilterListPopover popover={statusPop} title="" options={STATUS_OPTIONS} selected={statusFilter} onSelect={setStatusFilter} width="w-32" />
      <FilterSearchPopover popover={fromPop} placeholder="Search by address e.g. gonka1..." value={appliedFromAddr} onApply={setAppliedFromAddr} />
      <FilterSearchPopover popover={toPop} placeholder="Search by address e.g. gonka1..." value={appliedToAddr} onApply={setAppliedToAddr} />

      {timePop.open && (
        <div
          ref={timePop.popoverRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72"
          style={{ top: timePop.pos.top, left: timePop.pos.left }}
        >
          <div className="text-sm font-semibold text-gray-700 mb-2">Set Duration</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {DURATION_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.hours)}
                className="text-xs font-medium border border-gray-300 rounded px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-100"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Custom Duration</div>
          <div className="space-y-2 mb-4">
            <div>
              <label className="text-xs text-gray-500">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">To</label>
              <input
                type="date"
                value={customTo || new Date().toISOString().split('T')[0]}
                onChange={e => setCustomTo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyCustomTime}
              className="flex-1 text-sm font-medium bg-blue-500 text-white rounded px-3 py-1.5 hover:bg-blue-600"
            >
              Apply
            </button>
            <button
              onClick={clearTime}
              className="flex-1 text-sm font-medium border border-gray-300 rounded px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
