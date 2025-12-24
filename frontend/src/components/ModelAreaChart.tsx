import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useState } from 'react'


interface ModelAreaChartProps {
  title: string
  data: any[]
}

const COLORS = [ '#22C55E', '#3B82F6', '#8B5CF6', '#06B6D4', '#EF4444']

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

  const CustomTooltip = ({ active, payload, label }: any) => {
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
              tickFormatter={(v) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : v
              }
            />


            <Tooltip
              content={<CustomTooltip />}
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