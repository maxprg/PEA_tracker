'use client'

import { useState, useMemo } from 'react'
import { HoldingMetrics, formatEur, formatPct } from '@/lib/finance'
import { TrendingUp, TrendingDown, ShoppingCart, ArrowUpFromLine, Info } from 'lucide-react'

type Props = {
  holdings: HoldingMetrics[]
  totalValue: number
  onBuyMore: (holding: HoldingMetrics) => void
  onSell: (holding: HoldingMetrics) => void
  onDetails: (holding: HoldingMetrics) => void
  onChart: (holding: HoldingMetrics) => void
}

export function PortfolioTable({ holdings, totalValue, onBuyMore, onSell, onDetails, onChart }: Props) {
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'lineValue', dir: 'desc' })

  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const av = (a as any)[sort.col] ?? 0
      const bv = (b as any)[sort.col] ?? 0
      return sort.dir === 'asc' ? av - bv : bv - av
    })
  }, [holdings, sort])

  function toggleSort(col: string) {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' })
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="text-gray-400 text-sm">
          Votre portefeuille est vide.
          <br />
          Utilisez la barre de recherche pour ajouter votre premier actif.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actif
              </th>
              <th
                className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('shares')}
              >
                Parts {sort.col === 'shares' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th
                className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('pru')}
              >
                PRU {sort.col === 'pru' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th
                className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('currentPrice')}
              >
                Cours {sort.col === 'currentPrice' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th
                className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('lineValue')}
              >
                Valeur {sort.col === 'lineValue' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th
                className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('weight')}
              >
                Poids {sort.col === 'weight' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th
                className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('latentGainPct')}
              >
                Plus-Value {sort.col === 'latentGainPct' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((h) => {
              const isPositive = h.latentGainEur >= 0
              const dayPositive = h.changePercent >= 0

              return (
                <tr key={h.assetId} className="hover:bg-gray-50/50 transition">
                  {/* Actif */}
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onChart(h)}
                      className="text-left group"
                      title="Voir le graphique"
                    >
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition leading-tight underline-offset-2 group-hover:underline">
                        {h.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 group-hover:text-blue-400 transition font-mono">{h.ticker}</span>
                        <span
                          className={`text-xs font-medium ${
                            dayPositive ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        >
                          {dayPositive ? '+' : ''}
                          {h.changePercent.toFixed(2)}% auj.
                        </span>
                      </div>
                    </button>
                  </td>

                  {/* Parts */}
                  <td className="px-4 py-4 text-right font-mono text-gray-700">
                    {h.shares.toFixed(4)}
                  </td>

                  {/* PRU */}
                  <td className="px-4 py-4 text-right text-gray-700">{formatEur(h.pru)}</td>

                  {/* Cours */}
                  <td className="px-4 py-4 text-right font-semibold text-gray-900">
                    {h.currentPrice > 0 ? formatEur(h.currentPrice) : '—'}
                  </td>

                  {/* Valeur ligne */}
                  <td className="px-4 py-4 text-right font-semibold text-gray-900">
                    {formatEur(h.lineValue)}
                  </td>

                  {/* Poids */}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(h.weight, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-600 text-xs w-10 text-right">
                        {h.weight.toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  {/* Plus-Value */}
                  <td className="px-4 py-4 text-right">
                    <div
                      className={`flex items-center justify-end gap-1 font-semibold ${
                        isPositive ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <div>
                        <div>{isPositive ? '+' : ''}{formatEur(h.latentGainEur)}</div>
                        <div className="text-xs font-normal">
                          {formatPct(h.latentGainPct)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onDetails(h)}
                        title="Détails"
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <Info size={12} />
                        Détails
                      </button>
                      <button
                        onClick={() => onBuyMore(h)}
                        title="Acheter plus"
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <ShoppingCart size={12} />
                        Acheter
                      </button>
                      <button
                        onClick={() => onSell(h)}
                        title="Vendre"
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <ArrowUpFromLine size={12} />
                        Vendre
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Footer total */}
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-100">
              <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                Total titres
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">
                {formatEur(holdings.reduce((acc, h) => acc + h.lineValue, 0))}
              </td>
              <td className="px-4 py-3 text-right text-xs text-gray-400">100%</td>
              <td className="px-4 py-3 text-right font-bold">
                {(() => {
                  const total = holdings.reduce((acc, h) => acc + h.latentGainEur, 0)
                  return (
                    <span className={total >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                      {total >= 0 ? '+' : ''}{formatEur(total)}
                    </span>
                  )
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
