'use client'

import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { HoldingMetrics, formatEur } from '@/lib/finance'
import { Transaction } from '@/lib/db'

type Props = {
  holding: HoldingMetrics | null
  transactions: Transaction[]
  onClose: () => void
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  BUY: { label: 'Achat', color: 'bg-blue-100 text-blue-700' },
  SELL: { label: 'Vente', color: 'bg-red-100 text-red-600' },
  DIVIDEND: { label: 'Dividende', color: 'bg-emerald-100 text-emerald-700' },
}

export function PositionDetailsModal({ holding, transactions, onClose }: Props) {
  if (!holding) return null

  // Transactions de cet actif, triées par date décroissante
  const assetTxs = [...transactions]
    .filter((t) => t.asset_id === holding.assetId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const buyTxs = assetTxs.filter((t) => t.type === 'BUY')
  const totalShares = buyTxs.reduce((acc, t) => acc + t.shares_count, 0)
  const totalInvested = buyTxs.reduce((acc, t) => acc + t.total_cost, 0)
  const isPositive = holding.latentGainEur >= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{holding.name}</h2>
            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {holding.ticker}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        {/* Résumé de position */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Parts détenues</div>
            <div className="font-bold text-gray-900">{holding.shares.toFixed(4)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">PRU moyen</div>
            <div className="font-bold text-gray-900">{formatEur(holding.pru)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Cours actuel</div>
            <div className="font-bold text-gray-900">
              {holding.currentPrice > 0 ? formatEur(holding.currentPrice) : '—'}
            </div>
          </div>
          <div
            className={`rounded-xl p-3 ${
              isPositive ? 'bg-emerald-50' : 'bg-red-50'
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">Plus-value latente</div>
            <div
              className={`font-bold flex items-center gap-1 ${
                isPositive ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isPositive ? '+' : ''}{formatEur(holding.latentGainEur)}
            </div>
            <div className={`text-xs ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{holding.latentGainPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Barre de synthèse */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between text-sm text-gray-600">
          <span>
            Total investi : <span className="font-semibold text-gray-900">{formatEur(totalInvested)}</span>
          </span>
          <span>
            Valeur actuelle : <span className="font-semibold text-gray-900">{formatEur(holding.lineValue)}</span>
          </span>
          <span>
            {assetTxs.length} transaction{assetTxs.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Liste des transactions */}
        <div className="overflow-y-auto flex-1 p-6 space-y-2">
          {assetTxs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Aucune transaction enregistrée.</p>
          ) : (
            assetTxs.map((tx) => {
              const meta = TYPE_LABELS[tx.type] ?? { label: tx.type, color: 'bg-gray-100 text-gray-600' }
              const isBuy = tx.type === 'BUY'
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 transition"
                >
                  {/* Date */}
                  <div className="text-xs text-gray-500 w-20 shrink-0">
                    {new Date(tx.date).toLocaleDateString('fr-FR', {
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
                      <div className="text-xs text-gray-400">Parts</div>
                      <div className="font-mono font-semibold text-gray-900">
                        {isBuy ? '+' : '-'}{tx.shares_count.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Prix unitaire</div>
                      <div className="font-semibold text-gray-900">{formatEur(tx.unit_price)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Frais</div>
                      <div className="text-gray-600">{formatEur(tx.fee)}</div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">Total</div>
                    <div
                      className={`font-bold ${
                        isBuy ? 'text-gray-900' : 'text-emerald-600'
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
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
