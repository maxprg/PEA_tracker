'use client'

import { useState } from 'react'
import { HoldingMetrics, formatEur } from '@/lib/finance'
import { insertTransaction } from '@/lib/db'
import { Loader2, X, TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  holding: HoldingMetrics | null
  assetId: string
  onClose: () => void
  onSuccess: () => void
}

export function SellModal({ holding, assetId, onClose, onSuccess }: Props) {
  const [sharesInput, setSharesInput] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!holding) return null

  const FEE_RATE = 0.005
  const sharesToSell = Math.min(Math.max(parseFloat(sharesInput) || 0, 0), holding.shares)
  const price = holding.currentPrice
  const fee = Math.round(sharesToSell * price * FEE_RATE * 100) / 100
  const proceeds = Math.round((sharesToSell * price - fee) * 100) / 100
  const gainEur = (price - holding.pru) * sharesToSell
  const isPositive = gainEur >= 0
  const isValid = sharesToSell > 0 && sharesToSell <= holding.shares && price > 0

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      await insertTransaction({
        asset_id: assetId,
        type: 'SELL',
        shares_count: sharesToSell,
        unit_price: price,
        fee,
        total_cost: proceeds, // For SELL, total_cost represents proceeds credited to cash
        date,
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Enregistrer une vente</h2>
            <p className="text-sm text-gray-500 mt-0.5">{holding.name}</p>
            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {holding.ticker}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        {/* Info position */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-500">Parts détenues</div>
            <div className="font-semibold text-gray-900">{holding.shares.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">PRU</div>
            <div className="font-semibold text-gray-900">{formatEur(holding.pru)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Cours actuel</div>
            <div className="font-semibold text-gray-900">{formatEur(price)}</div>
          </div>
        </div>

        {/* Input parts */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Nombre de parts à vendre
          </label>
          <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-red-500 bg-white">
            <input
              type="number"
              min="0"
              max={holding.shares}
              step="1"
              value={sharesInput}
              onChange={(e) => setSharesInput(e.target.value)}
              placeholder={`max ${holding.shares.toFixed(0)}`}
              className="flex-1 outline-none text-sm text-gray-900"
            />
            <button
              onClick={() => setSharesInput(Math.floor(holding.shares).toString())}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium ml-2"
            >
              Tout vendre
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Date de la vente</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Calcul */}
        {sharesToSell > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Parts vendues</span>
              <span className="font-semibold text-gray-900">{sharesToSell}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Frais (0,50%)</span>
              <span className="font-semibold text-gray-900">{formatEur(fee)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900">
              <span>Produit net crédité</span>
              <span className="text-emerald-600">{formatEur(proceeds)}</span>
            </div>
            <div
              className={`flex justify-between text-xs font-medium pt-1 ${
                isPositive ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>Plus-value réalisée</span>
              <span>
                {isPositive ? '+' : ''}
                {formatEur(gainEur)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition flex items-center justify-center gap-2 ${
              isValid && !submitting
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Confirmer la vente
          </button>
        </div>
      </div>
    </div>
  )
}

