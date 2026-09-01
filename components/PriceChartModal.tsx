'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { HoldingMetrics, formatEur } from '@/lib/finance'
import { Transaction } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────

type PricePoint = {
  date: string
  close: number
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

// ─── Custom Tooltip ───────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const close = payload.find((p: any) => p.dataKey === 'close')?.value
  const buy = payload.find((p: any) => p.dataKey === 'buyPrice')?.value
  const sell = payload.find((p: any) => p.dataKey === 'sellPrice')?.value

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <div className="font-semibold text-gray-500 mb-1">
        {new Date(label).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
      {close != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span className="text-gray-700">Clôture :</span>
          <span className="font-bold text-gray-900">{formatEur(close)}</span>
        </div>
      )}
      {buy != null && (
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-emerald-700 font-semibold">Achat : {formatEur(buy)}</span>
        </div>
      )}
      {sell != null && (
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span className="text-red-600 font-semibold">Vente : {formatEur(sell)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Custom Buy/Sell Dots ─────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────

export function PriceChartModal({ holding, transactions, onClose }: Props) {
  const [period, setPeriod] = useState<Period>('1Y')
  const [priceHistory, setPriceHistory] = useState<{ date: string; close: number }[]>([])
  const [currency, setCurrency] = useState('EUR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!holding) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/history?ticker=${holding.ticker}&period=${period}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPriceHistory(data.quotes ?? [])
      setCurrency(data.currency ?? 'EUR')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [holding, period])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (!holding) return null

  // ── Merge transactions into price data ───────────────────────
  const assetTxs = transactions.filter((t) => t.asset_id === holding.assetId)

  const chartData: PricePoint[] = priceHistory.map((h) => {
    const point: PricePoint = { date: h.date, close: h.close }

    // Find buys/sells on the same date (or within 1 day for weekly data)
    const buys = assetTxs.filter(
      (t) => t.type === 'BUY' && Math.abs(new Date(t.date).getTime() - new Date(h.date).getTime()) < 4 * 86400_000
    )
    const sells = assetTxs.filter(
      (t) => t.type === 'SELL' && Math.abs(new Date(t.date).getTime() - new Date(h.date).getTime()) < 4 * 86400_000
    )

    if (buys.length > 0) {
      // Use the actual transaction price (not the market close price)
      point.buyPrice = buys[0].unit_price
    }
    if (sells.length > 0) {
      point.sellPrice = sells[0].unit_price
    }

    return point
  })

  // ── Chart metadata ────────────────────────────────────────────
  const prices = priceHistory.map((h) => h.close)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const maxPrice = prices.length ? Math.max(...prices) : 0
  const latestClose = prices[prices.length - 1] ?? holding.currentPrice
  const firstClose = prices[0] ?? 0
  const periodGain = firstClose > 0 ? ((latestClose - firstClose) / firstClose) * 100 : 0
  const isPositivePeriod = periodGain >= 0

  // Tick formatter for X axis
  const formatXTick = (dateStr: string) => {
    const d = new Date(dateStr)
    if (period === '1M') return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    if (period === '3M' || period === '6M') return d.toLocaleDateString('fr-FR', { month: 'short', day: '2-digit' })
    return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
  }

  // Y axis padding
  const yPadding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.05
  const yDomain = [Math.max(0, minPrice - yPadding), maxPrice + yPadding]

  const gradientId = `gradient-${holding.ticker}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{holding.name}</h2>
              <span className="text-sm bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-mono">
                {holding.ticker}
              </span>
              <span className="text-sm text-gray-400">{currency}</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatEur(latestClose)}
              </span>
              {priceHistory.length > 1 && (
                <div className={`flex items-center gap-1 text-sm font-semibold ${
                  isPositivePeriod ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {isPositivePeriod ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {isPositivePeriod ? '+' : ''}{periodGain.toFixed(2)}% sur {period}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <X size={22} />
          </button>
        </div>

        {/* ── Period Selector ── */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-100">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}

          {/* Légende */}
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-white font-bold" style={{ fontSize: 8 }}>B</span>
              </div>
              Achat
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white font-bold" style={{ fontSize: 8 }}>S</span>
              </div>
              Vente
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 border-t-2 border-dashed border-orange-400" />
              PRU {formatEur(holding.pru)}
            </div>
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="flex-1 p-4 min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Chargement de l&apos;historique…</span>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-500 text-sm">{error}</div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Aucune donnée disponible pour cette période.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositivePeriod ? '#3b82f6' : '#ef4444'} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={isPositivePeriod ? '#3b82f6' : '#ef4444'} stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

                <XAxis
                  dataKey="date"
                  tickFormatter={formatXTick}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={60}
                />

                <YAxis
                  domain={yDomain}
                  tickFormatter={(v) => `${v.toFixed(0)}${currency === 'USD' ? '$' : '€'}`}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={65}
                />

                <Tooltip content={<ChartTooltip />} />

                {/* Ligne PRU */}
                <ReferenceLine
                  y={holding.pru}
                  stroke="#f97316"
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  label={{
                    value: `PRU ${formatEur(holding.pru)}`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#f97316',
                    fontWeight: 600,
                  }}
                />

                {/* Courbe de prix */}
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isPositivePeriod ? '#3b82f6' : '#ef4444'}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />

                {/* Points d'achat — ligne invisible avec dots personnalisés */}
                <Line
                  type="monotone"
                  dataKey="buyPrice"
                  stroke="transparent"
                  strokeWidth={0}
                  dot={<BuyDot />}
                  activeDot={false}
                  connectNulls={false}
                  legendType="none"
                />

                {/* Points de vente */}
                <Line
                  type="monotone"
                  dataKey="sellPrice"
                  stroke="transparent"
                  strokeWidth={0}
                  dot={<SellDot />}
                  activeDot={false}
                  connectNulls={false}
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Footer stats ── */}
        <div className="px-6 py-4 border-t border-gray-100 grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Parts détenues</div>
            <div className="font-semibold text-gray-900">{holding.shares.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">PRU</div>
            <div className="font-semibold text-gray-900">{formatEur(holding.pru)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Valeur de ligne</div>
            <div className="font-semibold text-gray-900">{formatEur(holding.lineValue)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Plus-value latente</div>
            <div className={`font-bold ${holding.latentGainEur >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {holding.latentGainEur >= 0 ? '+' : ''}{formatEur(holding.latentGainEur)}{' '}
              <span className="font-normal text-xs">
                ({holding.latentGainPct >= 0 ? '+' : ''}{holding.latentGainPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

