'use client'

import { formatEur, formatPct } from '@/lib/finance'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, Plus } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

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
  onDeposit,
}: Props) {
  const { t } = useLanguage()
  const isPositive = globalGainEur >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Valeur Totale PEA */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
          <BarChart3 size={16} />
          {t.metrics.totalValue}
        </div>
        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{formatEur(totalPEAValue)}</div>
      </div>

      {/* Solde Espèces */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            <Wallet size={16} />
            {t.metrics.cashBalance}
          </div>
          <button
            onClick={onDeposit}
            className="flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-1.5 rounded-full transition"
            title="Dépôt / Retrait"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{formatEur(cashBalance)}</div>
      </div>

      {/* Total Injecté */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
          <PiggyBank size={16} />
          {t.metrics.totalInvested}
        </div>
        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{formatEur(totalDeposited)}</div>
      </div>

      {/* Plus-Value Globale */}
      <div
        className={`rounded-2xl border shadow-sm p-5 flex flex-col gap-2 ${
          isPositive
            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
            : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
        }`}
      >
        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'
          }`}
        >
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {t.metrics.globalGain}
        </div>
        <div
          className={`text-lg sm:text-2xl font-bold ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
        >
          {formatEur(globalGainEur)}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}
          >
            {formatPct(globalGainPct)}
          </span>
        </div>
      </div>
    </div>
  )
}
