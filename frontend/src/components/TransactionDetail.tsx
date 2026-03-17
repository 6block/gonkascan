import { useQuery } from '@tanstack/react-query'
import { timeAgo, apiFetch } from '../utils'
import { TransactionDetailResponse } from '../types/inference'
import { useEffect, useMemo, useState } from 'react'
import ReactJson from 'react-json-view'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'


function isPrimitive(v: any) {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v)
}

function displayPrimitive(v: any) {
  if (v === null) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

function keyLabel(k: string) {
  if (!k) return k
  if (k === '@type') return '@Type'
  return k.replace(/[_-]+/g, ' ').split(' ')
    .map((word) => word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join(' ')
}

function VerticalTable({ data, level }: { data: Record<string, any>, level: number }) {
  return (
    <div className="rounded-md">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="grid grid-cols-1 md:grid-cols-[minmax(150px,max-content)_1fr] border-b last:border-b-0">
          <div className="px-3 md:px-4 py-2 text-gray-500 flex items-center bg-gray-50 md:bg-transparent">
            <span className="break-words whitespace-normal leading-snug">{keyLabel(key)}</span>
          </div>
          <div className="px-3 md:px-4 py-2 min-w-0">
            <StructRenderer data={value} level={level + 1} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TabbedObject({ data, level, }: { data: Record<string, any>, level: number }) {
  const keys = useMemo(() => Object.keys(data), [data])
  const [activeKey, setActiveKey] = useState<string>(() => keys[0] ?? '')

  useEffect(() => {
    if (!activeKey || !keys.includes(activeKey)) {
      setActiveKey(keys[0] ?? '')
    }
  }, [keys.join('|')])

  if (keys.length === 0) {
    return <span className="text-gray-400">{'{}'}</span>
  }

  const activeValue = data[activeKey]

  return (
    <div>
      <div className="pt-3">
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-1 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {keys.map((k) => {
            const isActive = k === activeKey
            return (
              <button key={k} type="button" onClick={() => setActiveKey(k)}
                className={[
                  'text-sm whitespace-nowrap shrink-0 text-gray-500 font-normal pb-1',
                  isActive
                    ? 'border-b-2 border-gray-400'
                    : 'border-b-2 border-transparent hover:border-gray-300',
                ].join(' ')}
              >
                {keyLabel(k)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="py-2 overflow-x-hidden">
        <div className="space-y-4">
          {isPrimitive(activeValue) ? (
            <div className="text-sm break-all text-gray-500">{displayPrimitive(activeValue)}</div>
          ) : (
            <StructRenderer data={activeValue} level={level + 1} />
          )}
        </div>
      </div>
    </div>
  )
}

export function StringArray({data, collapseCount = 30}: {
  data: string[]
  collapseCount?: number
}) {
  const [expanded, setExpanded] = useState(false)

  if (data.length === 0) {
    return <span className="text-gray-500">[]</span>
  }

  const visible = expanded ? data : data.slice(0, collapseCount)
  const hiddenCount = data.length - visible.length

  return (
    <div className="font-mono text-sm text-gray-600">
      <span>[</span>

      <div className="flex flex-wrap gap-x-3 gap-y-1 pl-2 md:pl-4">
        {visible.map((v, i) => (
          <span key={i} className="break-all">
            "{v}"
            {i < visible.length - 1 || hiddenCount > 0 ? ',' : ''}
          </span>
        ))}

        {!expanded && hiddenCount > 0 && (
          <span className="text-gray-400 italic whitespace-nowrap"> … {hiddenCount} more</span>
        )}
      </div>

      <span>]</span>

      {data.length > collapseCount && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

function StructArray({ data, level }: { data: any[], level: number }) {
  if (data.length === 0) {
    return <span className="text-gray-500">[]</span>
  }

  const first = data[0]

  if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
    const columns = Object.keys(first)

    return (
      <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
        <table className="min-w-[640px] w-max md:min-w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 md:px-4 py-2 text-left whitespace-nowrap text-gray-500 font-normal">{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t align-top">
                {columns.map((col) => (
                  <td key={col} className="px-3 md:px-4 py-2 break-all align-middle">
                    {(() => {
                      let value = row[col]
                      if (row?.denom === 'ngonka') {
                        if (col === 'amount') {
                          value = row.amount + " ( " + (Number(row.amount) / 1e9).toString() + " gonka )"
                        }
                      }
                      return <StructRenderer data={value} level={level + 1} />
                    })()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="border rounded-md">
      {data.map((v, i) => (
        <div key={i} className="border-b last:border-b-0 px-3 md:px-4 py-2">
          <StructRenderer data={v} level={level + 1} />
        </div>
      ))}
    </div>
  )
}

function StructRenderer({ data, level }: { data: any, level: number }) {
  if (data === null || typeof data !== 'object') {
    return (<span className="break-all font-normal text-sm leading-relaxed text-gray-500">{String(data)}</span>)
  }
  if (Array.isArray(data)) {
    if (data.every(v => typeof v === 'string')) {
      return <StringArray data={data} />
    }
    return (<StructArray data={data} level={level} />)
  }
  if (level % 2 === 1) {
    return <VerticalTable data={data} level={level} />
  }
  return <TabbedObject data={data} level={level} />
}

export function MessageBlock({ msg }: { msg: any }) {
  return (
    <div className="border rounded-lg mb-4 md:mb-6 overflow-hidden">
      <div className="bg-gray-100 px-3 md:px-4 py-2 font-mono text-xs flex flex-wrap gap-2">
        <span className="text-gray-500">@Type</span>
        <span className="font-normal text-gray-500">{msg['@type']}</span>
      </div>

      <div className="p-3 md:p-4">
        <StructRenderer data={msg} level={1} />
      </div>
    </div>
  )
}

export function JsonViewer({ data }: { data: any }) {
  return (
    <ReactJson
      src={data}
      name={false}
      collapsed={1}
      enableClipboard={false}
      displayDataTypes={false}
      displayObjectSize={false}
      theme="monokai"
      style={{
        fontSize: '12px',
        padding: '12px',
        borderRadius: '6px',
        backgroundColor: '#111827',
      }}
    />
  )
}

export function TransactionDetail({ txHash }: {txHash: string }) {
  const [copied, setCopied] = useState(false)

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
        .map((a) => `${Number(a.amount) / 1e9} ${a.denom.replace(/^n/, '')}`)
        .join(', ')
      : '-'

  const jsonString = JSON.stringify(data, null, 2)

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
      <div className="rounded-lg shadow-sm">
        <div className="px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <nav className="flex flex-wrap sm:flex-nowrap items-center gap-y-1 text-sm text-gray-500 mb-1 min-w-0">
            <button
              onClick={() => window.history.back()}
              className="shrink-0 flex items-center gap-1 text-gray-500 hover:text-gray-900 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="mx-2 shrink-0">/</span>
            <span className="block sm:inline min-w-0 text-gray-900 font-medium break-all sm:break-normal">{data.txhash}</span>
          </nav>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">Tx Hash</h3>
                <p className="font-mono text-sm break-all leading-relaxed text-gray-700">{data.txhash}</p>
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
                  {new Date(data.timestamp).toLocaleString('en-CA', {
                    hour12: false,
                    timeZone: 'UTC',
                  })}{' '}
                  <span className="text-xs text-gray-500">
                    ({timeAgo(data.timestamp)})
                  </span>
                </p>
              </div>


              <div>
                <p className="text-gray-500 font-medium">Gas</p>
                <p className="break-all leading-relaxed">
                  {data.gas_used} / {data.gas_wanted}
                </p>
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

          <section className="bg-white rounded-lg border p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h4 className="font-semibold">JSON</h4>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(jsonString)
                    setCopied(true)
                  }}
                  onMouseLeave={() => setCopied(false)}
                  className={[
                    'text-xs hover:underline transition-colors',
                    copied ? 'text-green-600' : 'text-blue-600',
                  ].join(' ')}
                >
                  {copied ? '✓ copied' : 'copy'}
                </button>
              </div>
            </div>

            <div className="bg-gray-900 rounded overflow-auto max-h-[420px] md:max-h-[600px]">
              <JsonViewer data={data} />
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
