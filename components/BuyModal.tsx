'use client'

import { useState, useEffect } from 'react'
import { computeSharesFromBudget, computeCostFromShares, formatEur } from '@/lib/finance'
import { upsertAsset, insertTransaction } from '@/lib/db'
import { Loader2, X } from 'lucide-react'

type SearchResult = {
  ticker: string
  name: string
  exchange: string
  quoteType: string
}

// Infos sur la position existante (si "Acheter plus")
type ExistingHolding = {
  shares: number
  pru: number
}

type Props = {
  asset: SearchResult | null
  cashBalance: number
  existingHolding?: ExistingHolding | null
  onClose: () => void
  onSuccess: () => void
}

type InputMode = 'budget' | 'shares'

export function BuyModal({ asset, cashBalance, existingHolding, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<InputMode>('budget')
  const [budgetInput, setBudgetInput] = useState('')
  const [sharesInput, setSharesInput] = useState('')
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [changePercent, setChangePercent] = useState<number>(0)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])

  const FEE_RATE = 0.005 // 0.50%

  useEffect(() => {
    if (!asset) return
    setLoadingPrice(true)
    setCustomPriceInput('')
    setBudgetInput('')
    setSharesInput('')
    fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers: [asset.ticker] }),
    })
      .then((r) => r.json())
      .then((data) => {
        const q = data[asset.ticker]
        if (q) {
          setCurrentPrice(q.price)
          setChangePercent(q.changePercent)
          setCustomPriceInput(q.price > 0 ? String(q.price) : '')
        }
      })
      .finally(() => setLoadingPrice(false))
  }, [asset])

  if (!asset) return null

  const price = parseFloat(customPriceInput) || 0
  const isCustomPrice = currentPrice !== null && Math.abs(price - currentPrice) > 0.001
  const isRising = changePercent >= 0

  let shares = 0
  let fee = 0
  let totalCost = 0
  let remaining = cashBalance

  if (price > 0) {
    if (mode === 'budget') {
      const budget = parseFloat(budgetInput) || 0
      const calc = computeSharesFromBudget(budget, price, FEE_RATE)
      shares = calc.shares
      fee = calc.fee
      totalCost = calc.totalCost
      remaining = cashBalance - totalCost
    } else {
      const s = parseFloat(sharesInput) || 0
      shares = Math.floor(s)
      const calc = computeCostFromShares(shares, price, FEE_RATE)
      fee = calc.fee
      totalCost = calc.totalCost
      remaining = cashBalance - totalCost
    }
  }

  // ── Nouveau PRU pondéré si "Acheter plus" ──────────────────
  // PRU = (costBasis existant + coût du nouvel achat) / (parts existantes + nouvelles parts)
  let newPRU: number | null = null
  let newTotalShares: number | null = null
  if (existingHolding && shares > 0 && price > 0) {
    const existingCostBasis = existingHolding.pru * existingHolding.shares
    const newCostBasis = existingCostBasis + totalCost
    newTotalShares = existingHolding.shares + shares
    newPRU = newCostBasis / newTotalShares
  }

  const isValid = shares > 0 && totalCost > 0 && price > 0
  const isOverdraft = totalCost > cashBalance

  async function handleSubmit() {
    if (!isValid || !asset) return
    setSubmitting(true)
    setError(null)
    try {
      const savedAsset = await upsertAsset({
        ticker: asset.ticker,
        name: asset.name,
        isin: null,
        category: asset.quoteType === 'ETF' ? 'ETF' : 'Action',
      })

      await insertTransaction({
        asset_id: savedAsset.id,
        type: 'BUY',
        shares_count: shares,
        unit_price: price,
        fee,
        total_cost: totalCost,
        date,
      })

      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {existingHolding ? 'Acheter plus' : 'Enregistrer un achat'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{asset.name}</p>
            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {asset.ticker} · {asset.exchange}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* Position existante (si "Acheter plus") */}
        {existingHolding && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-blue-400">Parts actuelles</div>
              <div className="font-semibold text-blue-900">{existingHolding.shares.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-blue-400">PRU actuel</div>
              <div className="font-semibold text-blue-900">{formatEur(existingHolding.pru)}</div>
            </div>
          </div>
        )}

        {/* Prix d'achat — éditable */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Prix d&apos;achat (€)</span>
              {isCustomPrice && (
                <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                  Prix modifié
                </span>
              )}
            </div>
            {currentPrice !== null && !loadingPrice && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  Live&nbsp;:&nbsp;
                  <span className={`font-semibold ${isRising ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatEur(currentPrice)}
                  </span>
                  &nbsp;
                  <span className={isRising ? 'text-emerald-600' : 'text-red-600'}>
                    ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                  </span>
                </span>
                {isCustomPrice && (
                  <button
                    onClick={() => setCustomPriceInput(String(currentPrice))}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            )}
            {loadingPrice && <Loader2 size={14} className="animate-spin text-blue-500" />}
          </div>
          <div className="flex items-center border border-gray-200 bg-white rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="number"
              min="0"
              step="0.01"
              value={customPriceInput}
              onChange={(e) => setCustomPriceInput(e.target.value)}
              placeholder="ex: 142.50"
              className="flex-1 outline-none text-base font-bold text-gray-900"
            />
            <span className="text-sm text-gray-400 font-medium ml-2">€ / part</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
          <button
            onClick={() => setMode('budget')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === 'budget' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            Par montant (€)
          </button>
          <button
            onClick={() => setMode('shares')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === 'shares' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            Par nombre de parts
          </button>
        </div>

        {/* Input */}
        {mode === 'budget' ? (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Budget à investir (€)
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
              <input
                type="number"
                min="0"
                step="10"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="ex: 300"
                className="flex-1 outline-none text-sm text-gray-900"
              />
              <span className="text-sm text-gray-400 font-medium">€</span>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Nombre de parts
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
              <input
                type="number"
                min="0"
                step="1"
                value={sharesInput}
                onChange={(e) => setSharesInput(e.target.value)}
                placeholder="ex: 5"
                className="flex-1 outline-none text-sm text-gray-900"
              />
              <span className="text-sm text-gray-400 font-medium">parts</span>
            </div>
          </div>
        )}

        {/* Date */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Date de l&apos;ordre
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Calcul détaillé */}
        {price > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Parts achetées</span>
              <span className="font-semibold text-gray-900">+{shares}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Prix unitaire</span>
              <span className="font-semibold text-gray-900">{formatEur(price)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Frais (0,50%)</span>
              <span className="font-semibold text-gray-900">{formatEur(fee)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900">
              <span>Total déduit</span>
              <span>−{formatEur(totalCost)}</span>
            </div>
            <div
              className={`flex justify-between text-xs font-medium pt-1 ${
                isOverdraft ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              <span>Solde espèces restant</span>
              <span>{formatEur(remaining)}</span>
            </div>

            {/* Nouveau PRU si "Acheter plus" */}
            {newPRU !== null && newTotalShares !== null && (
              <div className="border-t border-blue-100 pt-2 mt-1 space-y-1.5 bg-blue-50 -mx-4 -mb-4 px-4 pb-3 rounded-b-xl">
                <div className="flex justify-between text-xs text-blue-600">
                  <span>Nouveau total de parts</span>
                  <span className="font-semibold">{newTotalShares.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-700 font-semibold">
                  <span>Nouveau PRU pondéré</span>
                  <span>{formatEur(newPRU)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-500">
                  <span>Écart vs PRU actuel</span>
                  <span>
                    {newPRU > existingHolding!.pru ? '+' : ''}
                    {formatEur(newPRU - existingHolding!.pru)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Avertissement solde insuffisant */}
        {isOverdraft && isValid && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>
              Solde espèces insuffisant ({formatEur(cashBalance)} disponible).
              L&apos;achat sera quand même enregistré.
            </span>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Actions */}
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
              !isValid || submitting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isOverdraft
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Confirmer l&apos;achat
          </button>
        </div>
      </div>
    </div>
  )
}
