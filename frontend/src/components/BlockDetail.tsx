import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatGas } from '../utils'


type BlockDetailResponse = {
  header: {
    height: string
    time: string
  }
  data: {
    txs: any[]
  },
  result: {
    txs_results: any[]
  }
}

type MsgSummaryNode = {
  key: string
  totalCount: number
  totalGas: number
  failedCount: number
  failedGas: number
  creators?: Record<string, {count: number, gas: number}>
}

function shortHash(hash: string, len = 10) {
  return `${hash.slice(0, len)}…${hash.slice(-len)}`
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString()
}

function typeTail(typeUrl: string) {
  const tail = typeUrl.split('/').pop() || typeUrl
  const dotTail = tail.split('.').pop() || tail  
  const cleaned = dotTail.replace(/^Msg/, '')
  return cleaned
}

function extractCreatorsFromAny(anyMsg: any): string[] {
  const creators = new Set<string>()
  if (!anyMsg || typeof anyMsg !== 'object') return []
  const typeUrl = anyMsg["@type"]

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
  console.log(creators)

  return Array.from(creators)
}

function extractMsgTypeCountsFromAny(anyMsg: any): {isExec: boolean, counts: Map<string, number>} { 
  const counts = new Map<string, number>()

  if (!anyMsg || typeof anyMsg !== 'object') {
    return { isExec: false, counts }
  }

  const isExec = anyMsg["@type"] === '/cosmos.authz.v1beta1.MsgExec' && Array.isArray(anyMsg.msgs)
  if (isExec) {
    for (const inner of anyMsg.msgs) {
      const typeUrl = inner["@type"]
      if (!typeUrl || typeof typeUrl !== 'string') continue
      const type = typeTail(typeUrl)
      counts.set(type, (counts.get(type) || 0) + 1)
    }

    if (counts.size === 0) {
      counts.set('Exec', 1)
    }

    return { isExec: true, counts }
  }

  if (typeof anyMsg["@type"] === 'string') {
    const type = typeTail(anyMsg["@type"])
    counts.set(type, 1)
  }

  return { isExec: false, counts }
}

function MsgSummaryRow({ node }: { node: MsgSummaryNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className="grid grid-cols-[1fr_260px_260px] px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 text-gray-800 font-medium">
          <span className="text-gray-400">{open ? '▾' : '▸'}</span>
          <span>{node.key}</span>
        </div>

        <div className="text-right text-gray-700">{node.totalCount} / {formatGas(node.totalGas)}</div>

        <div className="text-right">
          {node.failedCount > 0 ? (
            <span className="text-red-600">{node.failedCount} / {formatGas(node.failedGas)}</span>
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
              className="grid grid-cols-[1fr_260px_260px] px-10 py-2 text-sm border-b bg-gray-50 hover:bg-gray-100 transition"
            >
              <a
                href={`/?page=address&address=${addr}`}
                className="text-blue-600 hover:underline font-mono truncate"
              >
                {addr}
              </a>
              <div className="text-right text-gray-700">{creator.count} / {formatGas(creator.gas)}</div>
              <div className="text-right text-gray-400">– / –</div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

function TxRow({ row }: { row: any }) {
  const [showError, setShowError] = useState(false)
  const isFailed = row.status === 'Failed' && row.errorLog

  return (
      <tr
        className="border-t"
        onMouseLeave={() => setShowError(false)}
      >
        <td className="px-4 py-3 font-mono truncate">{row.msgType}</td>

        {isFailed && showError ? (
          <td colSpan={4} className="px-4 py-3">
            <div className="flex gap-3">
              <div className="w-1 bg-red-500/70 rounded-sm" />
              <pre className="text-xs text-red-600 font-mono whitespace-pre-wrap break-all leading-relaxed">Error: {row.errorLog}</pre>
            </div>
          </td>
          ) : (
            <>
              <td className="px-4 py-3 whitespace-nowrap">
                {row.status === 'Success' && (
                  <span className="inline-flex items-center gap-2 text-green-600 font-medium">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs">✓</span>
                    Success
                  </span>)}
                {row.status === 'Failed' && (
                  <span 
                    className="inline-flex items-center gap-2 text-red-600 font-medium cursor-help" 
                    onMouseEnter={() => setShowError(true)}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs">✕</span>
                    Failed
                  </span>
                )}
                {row.status === 'Unknown' && (
                  <span className="inline-flex items-center gap-2 text-gray-400 font-medium">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-white text-xs">?</span>
                    Unknown
                  </span>
                )}
              </td>

              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{row.gasUsed} Used<br />{row.gasWanted} Wanted</td>
              <td className="px-4 py-3 font-mono text-blue-600 truncate" title={row.creator}>
                <a
                    href={`/?page=address&address=${row.creator}`}
                    className="text-blue-600 hover:underline font-mono truncate"
                >
                    {row.creator !== '-' ? shortHash(row.creator, 16) : '-'}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-blue-600">
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
  const apiUrl = import.meta.env.VITE_API_URL || '/api'

  const fetchBlockDetail = async (): Promise<BlockDetailResponse> => {
    const response = await fetch(`${apiUrl}/v1/block/${height}`)
    if (!response.ok) throw new Error(`Failed to fetch block detail! status: ${response.status}`)
    return response.json()
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['block', height],
    queryFn: fetchBlockDetail,
    enabled: !!height
  })

  const txRows = useMemo(() => {
    if (!data) return []
  
    const txs = data.data?.txs || []
    const results = data.result?.txs_results || []
  
    return txs.flatMap((tx, txIndex) => {
      const txhash = tx.hash || {}
      const body = tx.body || {}
      const auth = tx.auth_info || {}
      const gasLimit = auth.fee?.gas_limit?.toString?.() ?? '-'
  
      const result = results[txIndex]
      const status = result?.code === 0 ? 'Success' : result?.code != null ? 'Failed': 'Unknown'
      const gasUsed = result?.gas_used ?? '-'
      const gasWanted = result?.gas_wanted ?? gasLimit

      const messages = body?.messages ?? []
  
      return messages.flatMap((anyMsg: any, msgIndex: number) => {
        const creators = extractCreatorsFromAny(anyMsg)
        const creator = 
            creators.length === 1 ? creators[0] : creators.length > 1
            ? `${creators[0]} +${creators.length - 1}` : '-'
        const { isExec, counts } = extractMsgTypeCountsFromAny(anyMsg)
        const prefix = isExec ? 'Exec > ' : ''
            
        return Array.from(counts.entries()).map(([innerType, count], idx) => ({
            key: `${txIndex}-${msgIndex}-${idx}`,
            txhash,
            msgType:
              count > 1 ? `${prefix}${innerType} × ${count}` : `${prefix}${innerType}`,
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
    return <div className="text-sm text-gray-500">Loading block…</div>
  }

  if (error || !data) {
    return <div className="text-sm text-red-600">Failed to load block</div>
  }

  return (
    <div className="space-y-6">
      <div className="px-6 py-4">
        <nav className="flex items-center text-sm text-gray-500 mb-1">
        <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
        </button>

        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{data.header.height}</span>
        </nav>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-6 gap-8">
          <div>
            <div className="text-sm text-gray-500 mb-1">Height</div>
            <div className="text-lg font-mono font-semibold">{data.header.height}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Time</div>
            <div className="text-lg">{formatTime(data.header.time)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_260px_260px] px-4 py-3 text-sm text-gray-500 font-medium border-b">
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

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
                <th className="px-4 py-3 text-left w-[20%]">MSG TYPE</th>
                <th className="px-4 py-3 text-left w-[10%]">STATUS</th>
                <th className="px-4 py-3 text-left w-[15%]">GAS</th>
                <th className="px-4 py-3 text-left w-[25%]">CREATOR</th>
                <th className="px-4 py-3 text-left w-[25%]">TX HASH</th>
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
  )
}
