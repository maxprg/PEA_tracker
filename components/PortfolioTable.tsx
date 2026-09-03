'use client'

import { useState, useMemo } from 'react'
import { HoldingMetrics, formatEur, formatPct } from '@/lib/finance'
import { TrendingUp, TrendingDown, ShoppingCart, ArrowUpFromLine, Info, ChevronUp, ChevronDown } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

type SortCol = 'shares' | 'pru' | 'currentPrice' | 'lineValue' | 'weight' | 'latentGainPct' | 'changePercent'

type Props = {
  holdings: HoldingMetrics[]
  totalValue: number
  onBuyMore: (holding: HoldingMetrics) => void
  onSell: (holding: HoldingMetrics) => void
  onDetails: (holding: HoldingMetrics) => void
  onChart: (holding: HoldingMetrics) => void
}

function SortIcon({ col, sort }: { col: string; sort: { col: string; dir: 'asc' | 'desc' } }) {
  if (sort.col !== col) return <span className="opacity-20 text-xs">↕</span>
  return sort.dir === 'asc' ? <ChevronUp size={13} className="text-blue-500" /> : <ChevronDown size={13} className="text-blue-500" />
}

export function PortfolioTable({ holdings, totalValue, onBuyMore, onSell, onDetails, onChart }: Props) {
  const { t } = useLanguage()
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'lineValue', dir: 'desc' })

  function toggleSort(col: SortCol) {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' })
  }

  const sorted = useMemo(() =>
    [...holdings].sort((a, b) => {
      const av = (a as any)[sort.col] ?? 0
      const bv = (b as any)[sort.col] ?? 0
      return sort.dir === 'asc' ? av - bv : bv - av
    }),
    [holdings, sort]
  )

  function th(label: string, col: SortCol) {
    return (
      <th
        className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 select-none"
        onClick={() => toggleSort(col)}
      >
        <span className="inline-flex items-center gap-1 justify-end">
          {label} <SortIcon col={col} sort={sort} />
        </span>
      </th>
    )
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-10 text-center">
        <div className="text-gray-400 dark:text-gray-500 text-sm">
          {t.portfolio.empty}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t.portfolio.asset}
              </th>
              {th(t.common.shares, 'shares')}
              {th(t.portfolio.pru, 'pru')}
              {th(t.portfolio.quote, 'currentPrice')}
              {th(t.portfolio.value, 'lineValue')}
              {th(t.portfolio.weight, 'weight')}
              {th(t.portfolio.latentGain, 'latentGainPct')}
              <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t.common.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {sorted.map((h) => {
              const isPositive = h.latentGainEur >= 0
              const dayPositive = h.changePercent >= 0

              return (
                <tr key={h.assetId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onChart(h)}
                      className="text-left group"
                      title={t.modals.chartTitle}
                    >
                      <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-tight underline-offset-2 group-hover:underline">
                        {h.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-blue-400 dark:group-hover:text-blue-300 transition font-mono">{h.ticker}</span>
                        <span className={`text-xs font-medium ${dayPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`}>
                          {dayPositive ? '+' : ''}{h.changePercent.toFixed(2)}% {t.portfolio.today}
                        </span>
                      </div>
                    </button>
                  </td>

                  <td className="px-4 py-4 text-right font-mono text-gray-700 dark:text-gray-300">
                    {h.shares.toFixed(4)}
                  </td>

                  <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">{formatEur(h.pru)}</td>

                  <td className="px-4 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {h.currentPrice > 0 ? formatEur(h.currentPrice) : '—'}
                  </td>

                  <td className="px-4 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {formatEur(h.lineValue)}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(h.weight, 100)}%` }} />
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs w-10 text-right">{h.weight.toFixed(1)}%</span>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`}>
                      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <div>
                        <div>{isPositive ? '+' : ''}{formatEur(h.latentGainEur)}</div>
                        <div className="text-xs font-normal opacity-80">{formatPct(h.latentGainPct)}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => onDetails(h)} title={t.common.details} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition">
                        <Info size={12} /> <span className="hidden lg:inline">{t.common.details}</span>
                      </button>
                      <button onClick={() => onBuyMore(h)} title={t.portfolio.buyMore} className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1.5 rounded-lg transition">
                        <ShoppingCart size={12} /> <span className="hidden lg:inline">{t.common.buy}</span>
                      </button>
                      <button onClick={() => onSell(h)} title={t.common.sell} className="flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 px-2.5 py-1.5 rounded-lg transition">
                        <ArrowUpFromLine size={12} /> <span className="hidden lg:inline">{t.common.sell}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t.portfolio.totalHoldings}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">
                {formatEur(holdings.reduce((acc, h) => acc + h.lineValue, 0))}
              </td>
              <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500">100%</td>
              <td className="px-4 py-3 text-right font-bold">
                {(() => {
                  const total = holdings.reduce((acc, h) => acc + h.latentGainEur, 0)
                  return <span className={total >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}>{total >= 0 ? '+' : ''}{formatEur(total)}</span>
                })()}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
