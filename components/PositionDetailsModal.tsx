'use client'

import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { HoldingMetrics, formatEur } from '@/lib/finance'
import { Transaction } from '@/lib/db'
import { useLanguage } from './LanguageProvider'
import { Dictionary } from '@/lib/i18n/dictionaries'

type Props = {
  holding: HoldingMetrics | null
  transactions: Transaction[]
  onClose: () => void
}

export function PositionDetailsModal({ holding, transactions, onClose }: Props) {
  const { t } = useLanguage()
  
  if (!holding) return null

  const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    BUY: { label: t.positionModal.buy, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    SELL: { label: t.positionModal.sell, color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
    DIVIDEND: { label: t.positionModal.dividend, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  }

  // Transactions de cet actif, triées par date décroissante
  const assetTxs = [...transactions]
    .filter((t) => t.asset_id === holding.assetId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const buyTxs = assetTxs.filter((t) => t.type === 'BUY')
  const totalInvested = buyTxs.reduce((acc, t) => acc + t.total_cost, 0)
  const isPositive = holding.latentGainEur >= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{holding.name}</h2>
            <span className="inline-block mt-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
              {holding.ticker}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X size={20} />
          </button>
        </div>

        {/* Résumé de position */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-transparent dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.positionModal.sharesHeld}</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{holding.shares.toFixed(4)}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-transparent dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.positionModal.avgPRU}</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{formatEur(holding.pru)}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-transparent dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.positionModal.currentPrice}</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">
              {holding.currentPrice > 0 ? formatEur(holding.currentPrice) : '—'}
            </div>
          </div>
          <div
            className={`rounded-xl p-3 border border-transparent ${
              isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900/50' : 'bg-red-50 dark:bg-red-900/20 dark:border-red-900/50'
            }`}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.positionModal.unrealizedGain}</div>
            <div
              className={`font-bold flex items-center gap-1 ${
                isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isPositive ? '+' : ''}{formatEur(holding.latentGainEur)}
            </div>
            <div className={`text-xs ${isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{holding.latentGainPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Barre de synthèse */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {t.positionModal.totalInvested} : <span className="font-semibold text-gray-900 dark:text-gray-100">{formatEur(totalInvested)}</span>
          </span>
          <span>
            {t.positionModal.currentValue} : <span className="font-semibold text-gray-900 dark:text-gray-100">{formatEur(holding.lineValue)}</span>
          </span>
          <span>
            {assetTxs.length} {t.positionModal.transactions}
          </span>
        </div>

        {/* Liste des transactions */}
        <div className="overflow-y-auto flex-1 p-6 space-y-2">
          {assetTxs.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">{t.gestion.emptyTx}</p>
          ) : (
            assetTxs.map((tx) => {
              const meta = TYPE_LABELS[tx.type] ?? { label: tx.type, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' }
              const isBuy = tx.type === 'BUY'
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl px-4 py-3 transition border border-transparent dark:border-gray-800"
                >
                  {/* Date */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">
                    {new Date(tx.date).toLocaleDateString(t === require('@/lib/i18n/dictionaries').en ? 'en-US' : 'fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>

                  {/* Badge type */}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${meta.color}`}>
                    {meta.label}
                  </span>

                  {/* Détails */}
                  <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{t.common.shares}</div>
                      <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {isBuy ? '+' : '-'}{tx.shares_count.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{t.common.price}</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{formatEur(tx.unit_price)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{t.common.fees}</div>
                      <div className="text-gray-600 dark:text-gray-400">{formatEur(tx.fee)}</div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400 dark:text-gray-500">{t.common.total}</div>
                    <div
                      className={`font-bold ${
                        isBuy ? 'text-gray-900 dark:text-gray-100' : 'text-emerald-600 dark:text-emerald-500'
                      }`}
                    >
                      {isBuy ? '-' : '+'}{formatEur(tx.total_cost)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  )
}
