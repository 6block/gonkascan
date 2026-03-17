import { useState } from 'react'
import ReactJson from 'react-json-view'

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

export function JsonSection({ data }: { data: any }) {
  const [copied, setCopied] = useState(false)
  const jsonString = JSON.stringify(data, null, 2)

  return (
    <section className="bg-white rounded-lg border p-4 sm:p-6">
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

      <div className="bg-gray-900 rounded overflow-auto max-h-[420px] sm:max-h-[600px]">
        <JsonViewer data={data} />
      </div>
    </section>
  )
}
