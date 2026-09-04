'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { HoldingMetrics, formatEur } from '@/lib/finance'
import { Transaction } from '@/lib/db'
import { useLanguage } from './LanguageProvider'
import { Dictionary } from '@/lib/i18n/dictionaries'

type PricePoint = {
  date: string
  close: number
  benchmarkNorm?: number   // normalized to 100 at period start
  assetNorm?: number
  buyPrice?: number
  sellPrice?: number
}

type Props = {
  holding: HoldingMetrics | null
  transactions: Transaction[]
  onClose: () => void
}

const PERIODS = ['1M', '3M', '6M', '1Y', '3Y'] as const
type Period = (typeof PERIODS)[number]

const BENCHMARKS: Record<string, string> = {
  none: 'Aucun',
  '^FCHI': 'CAC 40',
  '^GSPC': 'S&P 500',
  'IWDA.AS': 'MSCI World',
}

function ChartTooltip({ active, payload, label, showBenchmark, t }: { active?: boolean; payload?: any; label?: string; showBenchmark?: boolean; t: Dictionary }) {
  if (!active || !payload?.length) return null
  const close = payload.find((p: any) => p.dataKey === 'close')?.value
  const assetN = payload.find((p: any) => p.dataKey === 'assetNorm')?.value
  const benchN = payload.find((p: any) => p.dataKey === 'benchmarkNorm')?.value
  const buy = payload.find((p: any) => p.dataKey === 'buyPrice')?.value
  const sell = payload.find((p: any) => p.dataKey === 'sellPrice')?.value

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-1">
      <div className="font-semibold text-gray-500 dark:text-gray-400">
        {new Date(label || '').toLocaleDateString(t === require('@/lib/i18n/dictionaries').en ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
      {close != null && !showBenchmark && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span className="text-gray-700 dark:text-gray-300">{t.priceChart.close} :</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">{formatEur(close)}</span>
        </div>
      )}
      {showBenchmark && assetN != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span className="font-bold text-gray-900 dark:text-gray-100">{assetN >= 100 ? '+' : ''}{(assetN - 100).toFixed(2)}%</span>
        </div>
      )}
      {showBenchmark && benchN != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
          <span className="font-bold text-purple-700 dark:text-purple-400">{benchN >= 100 ? '+' : ''}{(benchN - 100).toFixed(2)}%</span>
        </div>
      )}
      {buy != null && (
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{t.positionModal.buy} : {formatEur(buy)}</span>
        </div>
      )}
      {sell != null && (
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span className="text-red-600 dark:text-red-400 font-semibold">{t.positionModal.sell} : {formatEur(sell)}</span>
        </div>
      )}
    </div>
  )
}

function BuyDot(props: any) {
  const { cx, cy, value } = props
  if (value == null || cx == null || cy == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#10b981" stroke="white" strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">B</text>
    </g>
  )
}

function SellDot(props: any) {
  const { cx, cy, value } = props
  if (value == null || cx == null || cy == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#ef4444" stroke="white" strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">S</text>
    </g>
  )
}

export function PriceChartModal({ holding, transactions, onClose }: Props) {
  const { t } = useLanguage()
  const [period, setPeriod] = useState<Period>('1Y')
  const [benchmark, setBenchmark] = useState<string>('none')
  const [priceHistory, setPriceHistory] = useState<{ date: string; close: number }[]>([])
  const [benchHistory, setBenchHistory] = useState<{ date: string; close: number }[]>([])
  const [currency, setCurrency] = useState('EUR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!holding) return
    setLoading(true)
    setError(null)
    try {
      const [assetRes, benchRes] = await Promise.all([
        fetch(`/api/history?ticker=${holding.ticker}&period=${period}`),
        benchmark !== 'none'
          ? fetch(`/api/history?ticker=${encodeURIComponent(benchmark)}&period=${period}`)
          : Promise.resolve(null),
      ])
      const assetData = await assetRes.json()
      if (assetData.error) throw new Error(assetData.error)
      setPriceHistory(assetData.quotes ?? [])
      setCurrency(assetData.currency ?? 'EUR')
      if (benchRes) {
        const bd = await benchRes.json()
        setBenchHistory(bd.quotes ?? [])
      } else {
        setBenchHistory([])
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [holding, period, benchmark])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  if (!holding) return null

  const assetTxs = transactions.filter((t) => t.asset_id === holding.assetId)
  const showBenchmark = benchmark !== 'none' && benchHistory.length > 0

  // Normalize both series to 100 at start (for comparison mode)
  const assetBase = priceHistory[0]?.close || 1
  const benchBase = benchHistory[0]?.close || 1

  // Build a date-indexed map for benchmark
  const benchMap = Object.fromEntries(benchHistory.map((h) => [h.date, h.close]))

  const chartData: PricePoint[] = priceHistory.map((h) => {
    const point: PricePoint = {
      date: h.date,
      close: h.close,
      assetNorm: (h.close / assetBase) * 100,
    }
    const bClose = benchMap[h.date]
    if (bClose) point.benchmarkNorm = (bClose / benchBase) * 100

    const buys = assetTxs.filter(
      (tx) => tx.type === 'BUY' && Math.abs(new Date(tx.date).getTime() - new Date(h.date).getTime()) < 4 * 86400_000
    )
    const sells = assetTxs.filter(
      (tx) => tx.type === 'SELL' && Math.abs(new Date(tx.date).getTime() - new Date(h.date).getTime()) < 4 * 86400_000
    )
    if (buys.length > 0) point.buyPrice = showBenchmark ? (buys[0].unit_price / assetBase) * 100 : buys[0].unit_price
    if (sells.length > 0) point.sellPrice = showBenchmark ? (sells[0].unit_price / assetBase) * 100 : sells[0].unit_price

    return point
  })

  const prices = priceHistory.map((h) => h.close)
  const latestClose = prices[prices.length - 1] ?? holding.currentPrice
  const firstClose = prices[0] ?? 0
  const periodGain = firstClose > 0 ? ((latestClose - firstClose) / firstClose) * 100 : 0
  const isPositivePeriod = periodGain >= 0

  const formatXTick = (dateStr: string) => {
    const d = new Date(dateStr)
    const locale = t === require('@/lib/i18n/dictionaries').en ? 'en-US' : 'fr-FR'
    if (period === '1M') return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
    if (period === '3M' || period === '6M') return d.toLocaleDateString(locale, { month: 'short', day: '2-digit' })
    return d.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
  }

  const allValues = chartData.flatMap((d) => [d.close, d.benchmarkNorm ? d.close : null].filter(Boolean) as number[])
  const yMin = showBenchmark
    ? Math.min(...chartData.flatMap((d) => [d.assetNorm ?? 100, d.benchmarkNorm ?? 100])) * 0.97
    : (Math.min(...prices) * 0.97)
  const yMax = showBenchmark
    ? Math.max(...chartData.flatMap((d) => [d.assetNorm ?? 100, d.benchmarkNorm ?? 100])) * 1.03
    : (Math.max(...prices) * 1.03)

  const gradientId = `grad-${holding.ticker}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{holding.name}</h2>
              <span className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full font-mono border border-gray-200 dark:border-gray-700">{holding.ticker}</span>
              <span className="text-sm text-gray-400 dark:text-gray-500">{currency}</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatEur(latestClose)}</span>
              {priceHistory.length > 1 && (
                <div className={`flex items-center gap-1 text-sm font-semibold ${isPositivePeriod ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {isPositivePeriod ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {isPositivePeriod ? '+' : ''}{periodGain.toFixed(2)}% {t.priceChart.over} {period}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1"><X size={22} /></button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex-wrap">
          {/* Period */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${period === p ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}>
                {p}
              </button>
            ))}
          </div>

          {/* Benchmark */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t.priceChart.compare} :</span>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:text-gray-100"
            >
              {Object.entries(BENCHMARKS).map(([v, l]) => (
                <option key={v} value={v}>{v === 'none' ? t.priceChart.none : l}</option>
              ))}
            </select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold" style={{ fontSize: 8 }}>B</span>{t.positionModal.buy}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white font-bold" style={{ fontSize: 8 }}>S</span>{t.positionModal.sell}
            </span>
            {!showBenchmark && (
              <span className="flex items-center gap-1.5">
                <span className="w-8 border-t-2 border-dashed border-orange-400 inline-block" />PRU {formatEur(holding.pru)}
              </span>
            )}
            {showBenchmark && (
              <span className="flex items-center gap-1.5">
                <span className="w-8 border-t-2 border-purple-400 inline-block" />{BENCHMARKS[benchmark]}
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 p-4 min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">{t.gestion.loadingSectors}</span>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-500 text-sm">{error}</div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">{t.gestion.emptyTx}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositivePeriod ? '#3b82f6' : '#ef4444'} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={isPositivePeriod ? '#3b82f6' : '#ef4444'} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatXTick} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={60} />
                <YAxis
                  domain={[yMin, yMax]}
                  tickFormatter={showBenchmark
                    ? (v) => `${(v - 100).toFixed(0)}%`
                    : (v) => `${v.toFixed(0)}${currency === 'USD' ? '$' : '€'}`}
                  tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={65}
                />
                <Tooltip content={<ChartTooltip showBenchmark={showBenchmark} t={t} />} />

                {!showBenchmark && (
                  <ReferenceLine y={holding.pru} stroke="#f97316" strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: `PRU ${formatEur(holding.pru)}`, position: 'insideTopRight', fontSize: 10, fill: '#f97316', fontWeight: 600 }}
                  />
                )}

                {/* Main asset area */}
                <Area type="monotone"
                  dataKey={showBenchmark ? 'assetNorm' : 'close'}
                  stroke={isPositivePeriod ? '#3b82f6' : '#ef4444'}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />

                {/* Benchmark line */}
                {showBenchmark && (
                  <Line type="monotone" dataKey="benchmarkNorm" stroke="#a855f7" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                )}

                {/* Buy / Sell markers */}
                <Line type="monotone" dataKey="buyPrice" stroke="transparent" strokeWidth={0} dot={<BuyDot />} activeDot={false} connectNulls={false} legendType="none" />
                <Line type="monotone" dataKey="sellPrice" stroke="transparent" strokeWidth={0} dot={<SellDot />} activeDot={false} connectNulls={false} legendType="none" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer stats */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.positionModal.sharesHeld}</div><div className="font-semibold text-gray-900 dark:text-gray-100">{holding.shares.toFixed(4)}</div></div>
          <div><div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.positionModal.avgPRU}</div><div className="font-semibold text-gray-900 dark:text-gray-100">{formatEur(holding.pru)}</div></div>
          <div><div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.positionModal.currentValue}</div><div className="font-semibold text-gray-900 dark:text-gray-100">{formatEur(holding.lineValue)}</div></div>
          <div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.positionModal.unrealizedGain}</div>
            <div className={`font-bold ${holding.latentGainEur >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {holding.latentGainEur >= 0 ? '+' : ''}{formatEur(holding.latentGainEur)}{' '}
              <span className="font-normal text-xs">({holding.latentGainPct >= 0 ? '+' : ''}{holding.latentGainPct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
