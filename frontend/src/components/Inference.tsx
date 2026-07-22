import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  InferenceStatsResponse, InferenceSeriesPoint, ChartTooltipProps,
} from '../types/inference'
import { apiFetch, formatCompact, formatInt, timeAgo } from '../utils'
import { StatItem } from './common/StatItem'
import { Select, type SelectOption } from './common/Select'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'

const COLORS = ['#3ee5b1', '#60a5fa', '#c084fc', '#fbbf24', '#fb7185', '#38bdf8']

type Breakdown = 'model' | 'gateway'
type Metric = 'tokens' | 'requests'

const BREAKDOWN_OPTIONS: ReadonlyArray<SelectOption<Breakdown>> = [
  { value: 'model', label: 'By model' },
  { value: 'gateway', label: 'By gateway' },
]

const METRIC_OPTIONS: ReadonlyArray<SelectOption<Metric>> = [
  { value: 'tokens', label: 'Tokens' },
  { value: 'requests', label: 'Requests' },
]

function stringHash(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Keep a series the same colour across re-renders and breakdown switches. */
function buildColorMap(names: string[]) {
  const sorted = [...names].sort((a, b) => stringHash(a) - stringHash(b))
  const map: Record<string, string> = {}
  sorted.forEach((name, i) => { map[name] = COLORS[i % COLORS.length] })
  return map
}

/** Pivot the flat [{ts, model, requests, prompt, completion}] stream the API
 *  returns into one row per timestamp with a column per series. */
function pivotSeries(points: InferenceSeriesPoint[], metric: Metric) {
  const byTs = new Map<string, Record<string, number | string>>()
  const names = new Set<string>()

  for (const p of points) {
    names.add(p.model)
    const row = byTs.get(p.ts) ?? { ts: p.ts }
    const value = metric === 'tokens'
      ? Number(p.prompt ?? 0) + Number(p.completion ?? 0)
      : Number(p.requests ?? 0)
    row[p.model] = Number(row[p.model] ?? 0) + value
    byTs.set(p.ts, row)
  }

  const rows = Array.from(byTs.values()).sort(
    (a, b) => String(a.ts).localeCompare(String(b.ts)),
  )
  return { rows, names: Array.from(names) }
}

function shortTs(ts: string) {
  // "2026-07-15 03:00:00" -> "07-15 03:00"
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  return m ? `${m[2]}-${m[3]} ${m[4]}:${m[5]}` : ts
}

const SeriesTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || !payload.length) return null
  const sorted = [...payload]
    .filter(p => Number(p.value ?? 0) > 0)
    .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
  if (!sorted.length) return null

  return (
    <div className="surface-inset px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1.5">{shortTs(String(label))}</div>
      {sorted.map(p => (
        <div key={String(p.dataKey)} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-slate-300 truncate max-w-[180px]">{String(p.dataKey)}</span>
          <span className="ml-auto text-slate-50 font-semibold tabular-nums">
            {formatCompact(Number(p.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

const PassRateTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="surface-inset px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1">Epoch #{String(label)}</div>
      <div className="text-slate-50 font-semibold tabular-nums">
        {Number(payload[0].value ?? 0).toFixed(2)}% passed
      </div>
    </div>
  )
}

export function Inference() {
  const [breakdown, setBreakdown] = useState<Breakdown>('model')
  const [metric, setMetric] = useState<Metric>('tokens')

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery<InferenceStatsResponse>({
    queryKey: ['inference-stats'],
    queryFn: () => apiFetch('/v1/stats/inference'),
    staleTime: 60000,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  })

  const timeseries = breakdown === 'model' ? data?.timeseries_model : data?.timeseries_gateway
  const { rows, names } = useMemo(
    () => pivotSeries(timeseries?.series ?? [], metric),
    [timeseries, metric],
  )
  const colorMap = useMemo(() => buildColorMap(names), [names])

  // Pass rate has 300+ epochs; showing the recent tail keeps the chart legible.
  const passRateRows = useMemo(
    () => (data?.epochs_history ?? []).slice(-120).map(e => ({
      epoch: e.epoch,
      passed_pct: e.passed_pct,
    })),
    [data?.epochs_history],
  )

  if (isLoading && !data) return <LoadingScreen label="Loading inference stats..." />
  if (error && !data) return <ErrorScreen error={error} onRetry={() => refetch()} />
  if (!data) return null

  const day = data.recent?.day
  const hour = data.recent?.hour
  const gateways = data.gateways?.rows ?? []
  const topModels = data.top_models ?? []
  const hasAnyData = Boolean(day || gateways.length || data.epochs_history.length)

  if (!hasAnyData) {
    return (
      <div className="surface p-6 text-center">
        <h2 className="section-title mb-2">Inference</h2>
        <p className="text-sm text-slate-400">
          Inference statistics are not available yet. They populate once the
          backend has polled the upstream data source.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* 24h headline numbers */}
      <section className="surface border-gradient-top p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5 mb-4">
          <StatItem label="Inferences · 24h" subText={hour ? `${formatCompact(hour.count)} last hour` : ''}>
            {formatCompact(day?.count ?? 0)}
          </StatItem>
          <StatItem
            label="Tokens · 24h"
            subText={day ? `${formatCompact(day.prompt_tokens ?? 0)} in · ${formatCompact(day.completion_tokens ?? 0)} out` : ''}
          >
            {formatCompact(day?.tokens ?? 0)}
          </StatItem>
          <StatItem
            label="Executors · 24h"
            subText={day ? `${day.active_models ?? 0} models` : ''}
          >
            {formatInt(day?.active_executors ?? 0)}
          </StatItem>
          <StatItem
            label="Pass rate · all epochs"
            subText={`${formatInt(data.totals.epochs)} epochs`}
            accent
          >
            {data.totals.passed_pct.toFixed(2)}%
          </StatItem>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-[11.5px] text-slate-500">
          <span>
            Data source:{' '}
            <a
              href={data.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-accent-300 hover:text-accent-200 hover:underline"
            >
              {data.source}
            </a>
            {' · cached locally'}
          </span>
          <span>Updated {timeAgo(dataUpdatedAt)}</span>
        </div>
      </section>

      {/* Gateway traffic */}
      {gateways.length > 0 && (
        <section className="surface p-4 sm:p-5 md:p-6">
          <div className="mb-4">
            <h2 className="section-title">Gateway Traffic · 24h</h2>
            <p className="section-subtitle mt-1">Share of network tokens served through each gateway</p>
          </div>

          <div className="space-y-2.5">
            {gateways.map(gw => (
              <div key={gw.address} className="surface-inset p-3 sm:p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2.5">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 text-sm truncate">{gw.name}</div>
                    <div className="font-mono text-[11px] text-slate-500 truncate">
                      {gw.host || gw.address}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-50 tabular-nums">
                      {(gw.token_share * 100).toFixed(2)}%
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {formatCompact(gw.tokens)} tokens · {formatCompact(gw.inferences)} inf
                    </div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-400/70"
                    style={{ width: `${Math.min(100, gw.token_share * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      {rows.length > 0 && (
        <section className="surface p-4 sm:p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="section-title">Inference Timeline</h2>
              <p className="section-subtitle mt-1">
                {timeseries?.bucket ? `Bucketed by ${timeseries.bucket} · UTC` : 'UTC'}
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                value={metric}
                onChange={(v) => setMetric(v as Metric)}
                options={METRIC_OPTIONS}
                className="w-32"
              />
              <Select
                value={breakdown}
                onChange={(v) => setBreakdown(v as Breakdown)}
                options={BREAKDOWN_OPTIONS}
                className="w-36"
              />
            </div>
          </div>

          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {names.map(name => (
                    <linearGradient key={name} id={`inf-${stringHash(name)}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colorMap[name]} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={colorMap[name]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="ts"
                  tickFormatter={shortTs}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<SeriesTooltip />} />
                {names.map(name => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stackId="1"
                    stroke={colorMap[name]}
                    strokeWidth={1.5}
                    fill={`url(#inf-${stringHash(name)})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {names.map(name => (
              <div key={name} className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ background: colorMap[name] }} />
                <span className="truncate max-w-[200px]">{name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Pass rate */}
        {passRateRows.length > 0 && (
          <section className="surface p-4 sm:p-5 md:p-6">
            <div className="mb-4">
              <h2 className="section-title">Pass Rate over time</h2>
              <p className="section-subtitle mt-1">
                validated / (validated + invalidated + missed), per epoch
              </p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={passRateRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="epoch"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<PassRateTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="passed_pct"
                    stroke="#3ee5b1"
                    strokeWidth={1.8}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Top models */}
        {topModels.length > 0 && (
          <section className="surface p-4 sm:p-5 md:p-6">
            <div className="mb-4">
              <h2 className="section-title">Top Models · 24h</h2>
              <p className="section-subtitle mt-1">Ranked by request volume</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="min-w-[420px] w-full">
                <thead className="bg-white/[0.02]">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 text-left text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.14em]">Model</th>
                    <th className="px-4 py-3 text-right text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.14em]">Requests</th>
                    <th className="px-4 py-3 text-right text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.14em]">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {topModels.map(m => (
                    <tr key={m.model} className="border-t border-white/[0.05]">
                      <td className="px-4 py-3.5 text-sm font-mono text-slate-100 break-all">{m.model}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-300 text-right tabular-nums whitespace-nowrap">
                        {formatCompact(m.requests)}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-50 text-right tabular-nums whitespace-nowrap">
                        {formatCompact(Number(m.prompt_tokens ?? 0) + Number(m.completion_tokens ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
