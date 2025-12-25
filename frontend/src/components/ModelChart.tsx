import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts'  

interface ModelAreaChartProps {
  title: string
  data: any[]
}

interface TokenUsageRow {
  epoch: number
  prompt_token: number
  completion_token: number
}

function formatTokens(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return value.toString()
}

const COLORS = [ '#22C55E', '#3B82F6', '#8B5CF6', '#06B6D4', '#EF4444']

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  const sorted = [...payload].sort((a, b) => {
    const va = Number(a.value ?? 0)
    const vb = Number(b.value ?? 0)
    return vb - va
  })

  return (
    <div className="bg-white border border-gray-200 rounded-md p-3 text-sm shadow">
      <div className="font-semibold mb-2">{label}</div>
      {sorted.map(item => {
        const value = Number(item.value ?? 0)
        const isZero = value === 0

        return (
          <div
            key={item.dataKey}
            className={`flex justify-between gap-4 ${isZero ? 'opacity-50' : ''}`}
            style={{ color: item.color }}
          >
            <span className="truncate">{item.dataKey}</span>
            <span className="font-mono">{value.toLocaleString()}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ModelAreaChart({ title, data }: ModelAreaChartProps) {
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set())
  const [activeEpoch, setActiveEpoch] = useState<number | null>(null)

  if (!data.length) return null

  const models = Object.keys(data[0]).filter(k => k !== 'epoch')

  const toggleModel = (model: string) => {
    setHiddenModels(prev => {
      const next = new Set(prev)
      if (next.has(model)) {
        next.delete(model)
      } else {
        next.add(model)
      }
      return next
    })
  }

  const getSortedModels = () => {
    const epoch = activeEpoch ?? data[data.length - 1]?.epoch

    if (epoch == null) return models
    const row = data.find(d => d.epoch === epoch)
    if (!row) return models
  
    return [...models].sort((a, b) => {
      const va = row[a] ?? 0
      const vb = row[b] ?? 0
      return vb - va
    })
  }
  
  const colorMap: Record<string, string> = {}
    models.forEach((m, i) => {colorMap[m] = COLORS[i % COLORS.length]})
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 shrink-0">{title}</h3>

        <div className="flex flex-wrap justify-end gap-x-4 gap-y-2 max-w-[70%]">
          {getSortedModels().map((model) => {
            const hidden = hiddenModels.has(model)
            const color = colorMap[model]

            return (
              <div
                key={model}
                className={`flex items-center gap-2 cursor-pointer text-xs select-none ${
                  hidden ? 'text-gray-400' : 'text-gray-800'
                }`}
                onClick={() => toggleModel(model)}
              >
                <span
                  className="inline-block w-3 h-3 rounded"
                  style={{backgroundColor: hidden ? '#D1D5DB' : color,}}
                />
                <span className="truncate max-w-[180px]">{model}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
          <defs>
              {models.map(model => (
                <linearGradient key={model} id={`gradient-${model}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorMap[model]} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={colorMap[model]} stopOpacity={0.05}/>
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="epoch" />
            <YAxis
              domain={[0, 'dataMax * 1.1']}
              tickFormatter={formatTokens}
            />


            <Tooltip
              content={<AreaTooltip />}
              labelFormatter={(label) => {
                setActiveEpoch(label)
                return label
              }}
            />

            {models.map((model) => {
              if (hiddenModels.has(model)) return null

              return (
                <Area
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stroke={colorMap[model]}
                  strokeWidth={2}
                  fill={`url(#gradient-${model})`}
                  isAnimationActive={false}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}

function TokenUsageTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  const prompt = payload.find((p: any) => p.dataKey === 'prompt_token')?.value ?? 0
  const completion = payload.find((p: any) => p.dataKey === 'completion_token')?.value ?? 0
  const total = prompt + completion

  return (
    <div className="rounded-md shadow-md border border-gray-200 bg-white overflow-hidden min-w-[180px]">
      <div className="bg-black text-white text-[11px] font-medium px-2 py-1">{label}</div>

      <div className="px-2 py-2 text-[12px] space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-blue-600">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />Prompt tokens
          </div>
          <div className="font-medium">{formatTokens(prompt)}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-green-600">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600" />Completion tokens
          </div>
          <div className="font-medium">{formatTokens(completion)}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-2 py-1.5 flex justify-between text-[12px] font-semibold">
        <span>Total</span>
        <span>{formatTokens(total)}</span>
      </div>
    </div>
  )
}

export function ModelTokenUsageChart({ data }: { data: TokenUsageRow[] }) {
  return (
    <div className="bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Recent Activity</h3>
      <p className="text-sm text-gray-500 mb-4">Token usage per epoch</p>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="epoch" />
            <YAxis tickFormatter={formatTokens} />
            <Tooltip content={<TokenUsageTooltip />} />
            <Bar dataKey="prompt_token" stackId="tokens" fill="#3b82f6" name="Prompt tokens"/>
            <Bar dataKey="completion_token" stackId="tokens" fill="#10b981" name="Completion tokens"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}