import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts'  

interface EpochAreaChartProps {
  title: string
  data: any[]
}

interface TokenUsageRow {
  epoch: number
  prompt_token: number
  completion_token: number
}

const COLORS = [ '#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']

function formatTokens(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return value.toString()
}

function safeId(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function stringHash(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function buildStableColorMap(names: string[]) {
  const sorted = [...names].sort((a, b) => stringHash(a) - stringHash(b))
  const map: Record<string, string> = {}
  sorted.forEach((name, index) => {map[name] = COLORS[index]})
  return map
}

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  const sorted = [...payload].sort((a, b) => {
    const va = Number(a.value ?? 0)
    const vb = Number(b.value ?? 0)
    return vb - va
  })

  return (
    <div className="bg-white border border-gray-200 rounded-md p-2.5 sm:p-3 text-xs sm:text-sm shadow max-w-[260px]">
      <div className="font-semibold mb-2">Epoch {label}</div>
      {sorted.map(item => {
        const value = Number(item.value ?? 0)
        const isZero = value === 0

        return (
          <div
            key={item.dataKey}
            className={`flex justify-between gap-3 ${isZero ? 'opacity-50' : ''}`}
            style={{ color: item.color }}
          >
            <span className="truncate max-w-[140px] sm:max-w-[180px]">{item.dataKey}</span>
            <span className="font-mono">{value.toLocaleString()}</span>
          </div>
        )
      })}
    </div>
  )
}

export function EpochAreaChart({ title, data }: EpochAreaChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())
  const [activeEpoch, setActiveEpoch] = useState<number | null>(null)

  if (!data.length) return null

  const keys = Object.keys(data[0]).filter(k => k !== 'epoch')

  const colorMap = useMemo(() => {
    return buildStableColorMap(keys)
  }, [keys])

  const toggleKeys = (key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const getSortedKeys = () => {
    const epoch = activeEpoch ?? data[data.length - 1]?.epoch

    if (epoch == null) return keys
    const row = data.find(d => d.epoch === epoch)
    if (!row) return keys
  
    return [...keys].sort((a, b) => {
      const va = row[a] ?? 0
      const vb = row[b] ?? 0
      return vb - va
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <h3 className="text-sm sm:text-base font-semibold text-gray-700 shrink-0 leading-tight">{title}</h3>

        <div className="flex flex-wrap sm:justify-end gap-x-3 sm:gap-x-4 gap-y-2 w-full sm:w-auto sm:max-w-[70%]">
          {getSortedKeys().map((key) => {
            const hidden = hiddenKeys.has(key)
            const color = colorMap[key]

            return (
              <div
                key={key}
                className={`flex items-center gap-2 cursor-pointer text-xs select-none active:opacity-70 transition-opacity ${
                  hidden ? 'text-gray-400' : 'text-gray-800'
                }`}
                onClick={() => toggleKeys(key)}
              >
                <span
                  className="inline-block w-3 h-3 rounded"
                  style={{backgroundColor: hidden ? '#D1D5DB' : color,}}
                />
                <span className="truncate max-w-[120px] sm:max-w-[180px]">{key}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-72 sm:h-80 overflow-x-auto">
        <div className="h-full min-w-[640px] sm:min-w-0">
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onMouseMove={(state) => {
              if (state?.activeLabel != null) {
                setActiveEpoch(Number(state.activeLabel))
              }
            }}
            onMouseLeave={() => setActiveEpoch(null)}
          >
            <defs>
                {keys.map(key => {
                  const gid = safeId(key)
                  return (
                    <linearGradient key={gid} id={`gradient-${gid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colorMap[key]} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={colorMap[key]} stopOpacity={0.05}/>
                    </linearGradient>
                  )
                })}
              </defs>

              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} tickMargin={8} />
              <YAxis
                domain={[0, 'dataMax * 1.1']}
                tickFormatter={formatTokens}
                tick={{ fontSize: 11 }}
                width={48}
              />


              <Tooltip
                content={<AreaTooltip />}
                cursor={{ strokeOpacity: 0.25 }}
                labelFormatter={(label) => label}
              />

              {keys.map((key) => {
                if (hiddenKeys.has(key)) return null
                const gid = safeId(key)

                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colorMap[key]}
                    strokeWidth={2}
                    fill={`url(#gradient-${gid})`}
                    isAnimationActive={false}
                  />
                )
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
    <div className="rounded-md shadow-md border border-gray-200 bg-white overflow-hidden min-w-[160px] sm:min-w-[180px] max-w-[240px]">
      <div className="bg-black text-white text-[10px] sm:text-[11px] font-medium px-2 py-1">{label}</div>

      <div className="px-2 py-2 text-[11px] sm:text-[12px] space-y-1">
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

      <div className="border-t border-gray-200 px-2 py-1.5 flex justify-between text-[11px] sm:text-[12px] font-semibold">
        <span>Total</span>
        <span>{formatTokens(total)}</span>
      </div>
    </div>
  )
}

export function ModelTokenUsageChart({ data }: { data: TokenUsageRow[] }) {
  return (
    <div className="bg-white relative z-0">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Recent Activity</h3>
      <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 leading-relaxed">Token usage per epoch</p>

      <div className="h-64 sm:h-72 overflow-x-auto">
        <div className="h-full min-w-[640px] sm:min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} tickMargin={8} />
              <YAxis tickFormatter={formatTokens} tick={{ fontSize: 11 }} width={48} />
              <Tooltip content={<TokenUsageTooltip />} cursor={{ fillOpacity: 0.08 }} />
              <Bar dataKey="prompt_token" stackId="tokens" fill="#3b82f6" name="Prompt tokens"/>
              <Bar dataKey="completion_token" stackId="tokens" fill="#10b981" name="Completion tokens"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}