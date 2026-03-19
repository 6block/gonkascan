import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BlockDetailResponse, CosmosMessage, TxRowData, TxStatus } from '../types/inference'
import { formatCompact, apiFetch, shortHash, formatDateTime, toGonka } from '../utils'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'
import { BackNavigation } from './common/BackNavigation'

type MsgSummaryNode = {
  key: string
  totalCount: number
  totalGas: number
  failedCount: number
  failedGas: number
  creators?: Record<string, {count: number, gas: number}>
}

function typeTail(typeUrl: string) {
  const tail = typeUrl.split('/').pop() || typeUrl
  const dotTail = tail.split('.').pop() || tail  
  const cleaned = dotTail.replace(/^Msg/, '')
  return cleaned
}

function extractCreatorsFromAny(anyMsg: CosmosMessage): string[] {
  const creators = new Set<string>()
  if (!anyMsg || typeof anyMsg !== 'object') return []
  const typeUrl = anyMsg['@type']

  if (typeUrl === '/cosmos.authz.v1beta1.MsgExec' && Array.isArray(anyMsg.msgs)) {
    for (const inner of anyMsg.msgs) {
      const creator = inner?.creator
      if (typeof creator === 'string' && creator.length > 0) {
        creators.add(creator)
      }
    }
    return Array.from(creators)
  }

  if (typeUrl === '/cosmwasm.wasm.v1.MsgExecuteContract') {
    const sender = anyMsg?.sender
    if (typeof sender === 'string' && sender.length > 0) {
      creators.add(sender)
    }
    return Array.from(creators)
  }

  const creator = anyMsg?.creator
  if (typeof creator === 'string' && creator.length > 0) {
    creators.add(creator)
  }

  return Array.from(creators)
}

function extractMsgTypeCountsFromAny(anyMsg: CosmosMessage): {isExec: boolean, counts: Map<string, number>} { 
  const counts = new Map<string, number>()

  if (!anyMsg || typeof anyMsg !== 'object') {
    return { isExec: false, counts }
  }

  const isExec = anyMsg['@type'] === '/cosmos.authz.v1beta1.MsgExec' && Array.isArray(anyMsg.msgs)
  if (isExec && anyMsg.msgs) {
    for (const inner of anyMsg.msgs) {
      const typeUrl = inner['@type']
      if (!typeUrl || typeof typeUrl !== 'string') continue
      const type = typeTail(typeUrl)
      counts.set(type, (counts.get(type) || 0) + 1)
    }

    if (counts.size === 0) {
      counts.set('Exec', 1)
    }

    return { isExec: true, counts }
  }

  if (typeof anyMsg['@type'] === 'string') {
    const type = typeTail(anyMsg['@type'])
    counts.set(type, 1)
  }

  return { isExec: false, counts }
}

function MsgSummaryRow({ node }: { node: MsgSummaryNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className="grid grid-cols-[1fr_220px_220px] sm:grid-cols-[1fr_260px_260px] px-3 sm:px-4 py-3 border-b cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 text-gray-800 font-medium min-w-0">
          <span className="text-gray-400">{open ? '▾' : '▸'}</span>
          <span className="truncate" title={node.key}>{node.key}</span>
        </div>

        <div className="text-right text-xs sm:text-sm text-gray-700">{node.totalCount} / {formatCompact(node.totalGas, 2, false)}</div>

        <div className="text-right text-xs sm:text-sm">
          {node.failedCount > 0 ? (
            <span className="text-red-600">{node.failedCount} / {formatCompact(node.failedGas, 2, false)}</span>
          ) : (
            <span className="text-gray-400">– / –</span>
          )}
        </div>
      </div>

      {open && node.creators && (
        <>
          {Object.entries(node.creators)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([addr, creator]) => (
              <div
                key={addr}
                className="grid grid-cols-[1fr_220px_220px] sm:grid-cols-[1fr_260px_260px] px-6 sm:px-10 py-2 text-xs sm:text-sm border-b bg-gray-50 hover:bg-gray-100 transition"
              >
                <a
                  href={`/?page=address&address=${addr}`}
                  className="text-blue-600 hover:underline font-mono truncate block min-w-0"
                >
                  {addr}
                </a>
                <div className="text-right text-gray-700">{creator.count} / {formatCompact(creator.gas, 2, false)}</div>
                <div className="text-right text-gray-400">– / –</div>
              </div>
            ))}
        </>
      )}
    </>
  )
}

function TxRow({ row }: { row: TxRowData }) {
  const [showError, setShowError] = useState(false)
  const isFailed = row.status === 'Failed' && row.errorLog

  return (
    <tr
      className="border-t"
      onMouseLeave={() => setShowError(false)}
    >
      <td className="px-3 sm:px-4 py-3 font-mono truncate" title={row.msgType}>{row.msgType}</td>

      {isFailed && showError ? (
        <td colSpan={4} className="px-3 sm:px-4 py-3">
          <div className="flex gap-3">
            <div className="w-1 bg-red-500/70 rounded-sm" />
            <pre className="text-[11px] sm:text-xs text-red-600 font-mono whitespace-pre-wrap break-all leading-relaxed">Error: {row.errorLog}</pre>
          </div>
        </td>
      ) : (
        <>
          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
            {row.status === 'Success' && (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 text-green-600 font-medium text-xs sm:text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs">✓</span>
                Success
              </span>)}
            {row.status === 'Failed' && (
              <span 
                className="inline-flex items-center gap-1.5 sm:gap-2 text-red-600 font-medium text-xs sm:text-sm cursor-help" 
                onMouseEnter={() => setShowError(true)}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs">✕</span>
                Failed
              </span>
            )}
            {row.status === 'Unknown' && (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 text-gray-400 font-medium text-xs sm:text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-white text-xs">?</span>
                Unknown
              </span>
            )}
          </td>

          <td className="px-3 sm:px-4 py-3 text-[11px] sm:text-xs text-gray-600 whitespace-nowrap">{toGonka(row.gasUsed)} Used<br />{toGonka(row.gasWanted)} Wanted</td>
          <td className="px-3 sm:px-4 py-3 font-mono text-blue-600 truncate" title={row.creator}>
            <a
              href={`/?page=address&address=${row.creator}`}
              className="text-blue-600 hover:underline font-mono truncate block"
            >
              {row.creator !== '-' ? shortHash(row.creator, 16) : '-'}
            </a>
          </td>
          <td className="px-3 sm:px-4 py-3 font-mono text-blue-600">
            <a
              href={`?page=transactions&tx=${row.txhash}`}
              className="block w-full truncate hover:underline"
              title={row.txhash}
            >
              {row.txhash}
            </a>
          </td>
        </>
      )}
    </tr>
  )
}

export function BlockDetail({ height }: {height: string }) {
  const { data, isLoading, error } = useQuery<BlockDetailResponse>({
    queryKey: ['block', height],
    queryFn: () => apiFetch(`/v1/block/${height}`),
    enabled: !!height,
  })

  const txRows = useMemo(() => {
    if (!data) return []
  
    const txs = data.data?.txs || []
    const results = data.result?.txs_results || []
  
    return txs.flatMap((tx, txIndex) => {
      const txhash = (tx.hash || '').toUpperCase()
      const body = tx.body || {}
      const auth = tx.auth_info || {}
      const gasLimit = auth.fee?.gas_limit?.toString?.() ?? '-'
  
      const result = results[txIndex]
      const status: TxStatus = result?.code === 0 ? 'Success' : result?.code != null ? 'Failed': 'Unknown'
      const gasUsed = result?.gas_used ?? '-'
      const gasWanted = result?.gas_wanted ?? gasLimit

      const messages = body?.messages ?? []
  
      return messages.flatMap((anyMsg: CosmosMessage, msgIndex: number) => {
        const creators = extractCreatorsFromAny(anyMsg)
        const creator = 
            creators.length === 1 ? creators[0] : creators.length > 1
              ? `${creators[0]} +${creators.length - 1}` : '-'
        const { isExec, counts } = extractMsgTypeCountsFromAny(anyMsg)
        const prefix = isExec ? 'Exec > ' : ''
            
        return Array.from(counts.entries()).map(([innerType, count], idx) => ({
          key: `${txIndex}-${msgIndex}-${idx}`,
          txhash,
          msgType: count > 1 ? `${prefix}${innerType} × ${count}` : `${prefix}${innerType}`,
          creator,
          status,
          gasUsed,
          gasWanted,
          errorLog: result?.log ?? null, 
        }))
      })
    })
  }, [data])
  
  const msgSummary = useMemo(() => {
    const map = new Map<string, MsgSummaryNode>()
  
    for (const row of txRows) {
      const key = row.msgType
  
      if (!map.has(key)) {
        map.set(key, {
          key,
          totalCount: 0,
          totalGas: 0,
          failedCount: 0,
          failedGas: 0,
          creators: {},
        })
      }
  
      const node = map.get(key)!
      const gas = Number(row.gasUsed) || 0
  
      node.totalCount += 1
      node.totalGas += gas
  
      if (row.status === 'Failed') {
        node.failedCount += 1
        node.failedGas += gas
      }
  
      if (row.creator && row.creator !== '-') {
        const creator = row.creator
        if (!node.creators![creator]) {
          node.creators![creator] = { count: 0, gas: 0 }
        }
        node.creators![creator].count += 1
        node.creators![creator].gas += gas
      }
    }
  
    return Array.from(map.values())
  }, [txRows])

  if (isLoading) {
    return <LoadingScreen label="Loading block..." />
  }

  if (error || !data) {
    return <ErrorScreen error={error} title="Failed to load block" />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <BackNavigation onBack={() => window.history.back()} title={data.header.height} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
          <div>
            <div className="text-xs sm:text-sm text-gray-500 mb-1">Height</div>
            <div className="text-base sm:text-lg font-mono font-semibold break-all">{data.header.height}</div>
          </div>
          <div className="lg:col-span-2">
            <div className="text-xs sm:text-sm text-gray-500 mb-1">Time</div>
            <div className="text-sm sm:text-lg break-words">{formatDateTime(data.header.time)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[1fr_220px_220px] sm:grid-cols-[1fr_260px_260px] px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 font-medium border-b">
              <div>MSG TYPE</div>
              <div className="text-right">TOTAL (COUNT / GAS)</div>
              <div className="text-right">FAILED (COUNT / GAS)</div>
            </div>
            {msgSummary
              .slice()
              .sort((a, b) => {
                if (b.totalCount !== a.totalCount) {
                  return b.totalCount - a.totalCount
                }
                return a.key.localeCompare(b.key)
              })
              .map(node => (
                <MsgSummaryRow key={node.key} node={node} />
              ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs sm:text-sm table-fixed">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left w-[20%] whitespace-nowrap">MSG TYPE</th>
                <th className="px-3 sm:px-4 py-3 text-left w-[10%] whitespace-nowrap">STATUS</th>
                <th className="px-3 sm:px-4 py-3 text-left w-[15%] whitespace-nowrap">GAS(GNK)</th>
                <th className="px-3 sm:px-4 py-3 text-left w-[25%] whitespace-nowrap">CREATOR</th>
                <th className="px-3 sm:px-4 py-3 text-left w-[25%] whitespace-nowrap">TX HASH</th>
              </tr>
            </thead>
            <tbody>
              {txRows.map(row => (
                <TxRow key={row.key} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
