'use client'

import { formatEur, formatPct } from '@/lib/finance'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, Percent } from 'lucide-react'

type Props = {
  totalPEAValue: number
  cashBalance: number
  totalDeposited: number
  globalGainEur: number
  globalGainPct: number
  irr: number | null
  onDeposit: () => void
}

export function MetricsHeader({
  totalPEAValue,
  cashBalance,
  totalDeposited,
  globalGainEur,
  globalGainPct,
  irr,
  onDeposit,
}: Props) {
  const isPositive = globalGainEur >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Valeur Totale PEA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
          <BarChart3 size={16} />
          Valeur Totale du PEA
        </div>
        <div className="text-2xl font-bold text-gray-900">{formatEur(totalPEAValue)}</div>
        <div className="text-xs text-gray-400">Titres + Espèces</div>
      </div>

      {/* Solde Espèces */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <Wallet size={16} />
            Solde Espèces
          </div>
          <button
            onClick={onDeposit}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-2.5 py-1 rounded-full transition"
          >
            + Déposer
          </button>
        </div>
        <div className="text-2xl font-bold text-gray-900">{formatEur(cashBalance)}</div>
        <div className="text-xs text-gray-400">Disponible pour investir</div>
      </div>

      {/* Total Injecté */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
          <PiggyBank size={16} />
          Total Injecté
        </div>
        <div className="text-2xl font-bold text-gray-900">{formatEur(totalDeposited)}</div>
        <div className="text-xs text-gray-400">Virements depuis votre banque</div>
      </div>

      {/* Plus-Value Globale */}
      <div
        className={`rounded-2xl border shadow-sm p-5 flex flex-col gap-2 ${
          isPositive
            ? 'bg-emerald-50 border-emerald-100'
            : 'bg-red-50 border-red-100'
        }`}
      >
        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            isPositive ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          Plus-Value Globale
        </div>
        <div
          className={`text-2xl font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}
        >
          {formatEur(globalGainEur)}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {formatPct(globalGainPct)}
          </span>
          {irr !== null && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Percent size={12} />
              TRI&nbsp;{irr.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

