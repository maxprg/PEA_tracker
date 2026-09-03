'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, TrendingDown, TrendingUp, AlertTriangle, Download, PieChart as PieIcon, Loader2 } from 'lucide-react'
import { CashFlow, Transaction, Asset } from '@/lib/db'
import { formatEur } from '@/lib/finance'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLanguage } from './LanguageProvider'
import { Dictionary } from '@/lib/i18n/dictionaries'

const PEA_CEILING = 150_000

const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#e11d48','#0ea5e9']

type Props = {
  cashFlows: CashFlow[]
  transactions: Transaction[]
  assets: Asset[]
  totalDeposited: number
  cashBalance: number
  onRefresh: () => void
}

type SectorData = Record<string, { sector: string; industry: string; country: string }>

function ConfirmDeleteButton({ onConfirm, t }: { onConfirm: () => void; t: Dictionary }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-red-600 dark:text-red-400 font-medium">{t.common.deleteConfirm}</span>
        <button onClick={onConfirm} className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-md hover:bg-red-700 transition font-semibold">{t.common.confirm}</button>
        <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-1.5 py-0.5 rounded-md transition">{t.common.decline}</button>
      </div>
    )
  }
  return (
    <button onClick={() => setConfirming(true)} title={t.common.delete} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition">
      <Trash2 size={14} />
    </button>
  )
}

// ── CSV Export ────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Pie Tooltip ───────────────────────────────────────────────
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="font-semibold text-gray-900 dark:text-gray-100">{d.name}</div>
      <div className="text-gray-600 dark:text-gray-400">{d.value.toFixed(1)}%</div>
    </div>
  )
}

export function GestionSuivi({ cashFlows, transactions, assets, totalDeposited, cashBalance, onRefresh }: Props) {
  const { t } = useLanguage()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'mouvements' | 'transactions' | 'repartition'>('mouvements')
  const [sectorData, setSectorData] = useState<SectorData>({})
  const [loadingSectors, setLoadingSectors] = useState(false)

  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]))

  const TX_META: Record<string, { label: string; color: string; bg: string }> = {
    BUY:      { label: 'Achat',     color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
    SELL:     { label: 'Vente',     color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-100 dark:bg-red-900/30' },
    DIVIDEND: { label: 'Dividende', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  }
  
  const CF_META: Record<string, { label: string; color: string; bg: string }> = {
    DEPOSIT:    { label: t.metrics.deposit,   color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    WITHDRAWAL: { label: t.metrics.withdraw, color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-100 dark:bg-red-900/30' },
  }

  // PEA ceiling
  const pctUsed = Math.min((totalDeposited / PEA_CEILING) * 100, 100)
  const remaining = PEA_CEILING - totalDeposited
  const isNearCeiling = pctUsed >= 80
  const isCritical = pctUsed >= 95

  // Visible cash flows (exclude __CORRECTION__)
  const visibleFlows = [...cashFlows]
    .filter((cf) => !cf.notes?.includes('__CORRECTION__'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const sortedTx = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Fetch sector data when tab is shown
  const fetchSectors = useCallback(async () => {
    if (assets.length === 0) return
    setLoadingSectors(true)
    try {
      const res = await fetch('/api/sector-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: assets.map((a) => a.ticker) }),
      })
      setSectorData(await res.json())
    } finally {
      setLoadingSectors(false)
    }
  }, [assets])

  useEffect(() => {
    if (activeTab === 'repartition' && Object.keys(sectorData).length === 0) {
      fetchSectors()
    }
  }, [activeTab, fetchSectors, sectorData])

  // Compute sector & country allocation from transactions
  const buysByAsset = Object.fromEntries(
    assets.map((a) => {
      const total = transactions.filter((t) => t.asset_id === a.id && t.type === 'BUY').reduce((acc, t) => acc + t.total_cost, 0)
      return [a.id, total]
    })
  )
  const totalBuys = Object.values(buysByAsset).reduce((a, b) => a + b, 0)

  function buildPieData(keyFn: (a: Asset) => string) {
    const map: Record<string, number> = {}
    assets.forEach((a) => {
      const key = keyFn(a) || 'Autre'
      const pct = totalBuys > 0 ? ((buysByAsset[a.id] || 0) / totalBuys) * 100 : 0
      map[key] = (map[key] ?? 0) + pct
    })
    return Object.entries(map)
      .filter(([, v]) => v > 0.1)
      .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
      .sort((a, b) => b.value - a.value)
  }

  const sectorPieData = buildPieData((a) => a.custom_sector || sectorData[a.ticker]?.sector || 'Autre')
  const countryPieData = buildPieData((a) => a.custom_region || sectorData[a.ticker]?.country || 'Autre')
  const strategyPieData = buildPieData((a) => a.category || 'Action/ETF')

  // Handlers
  async function handleDeleteFlow(id: string) {
    setDeletingId(id)
    try { await fetch(`/api/cashflows?id=${id}`, { method: 'DELETE' }); onRefresh() } catch (e) { console.error(e) }
    finally { setDeletingId(null) }
  }

  async function handleDeleteTx(id: string) {
    setDeletingId(id)
    try { await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' }); onRefresh() } catch (e) { console.error(e) }
    finally { setDeletingId(null) }
  }

  function exportMovementsCSV() {
    downloadCSV('mouvements_pea.csv', visibleFlows.map((cf) => [
      cf.date, cf.type === 'DEPOSIT' ? t.metrics.deposit : t.metrics.withdraw, String(cf.amount), cf.notes ?? '',
    ]), [t.common.date, 'Type', 'Montant (€)', 'Notes'])
  }

  function exportTransactionsCSV() {
    downloadCSV('transactions_pea.csv', sortedTx.map((tx) => {
      const a = assetMap[tx.asset_id]
      return [tx.date, tx.type, a?.name ?? '', a?.ticker ?? '', String(tx.shares_count), String(tx.unit_price), String(tx.fee), String(tx.total_cost)]
    }), [t.common.date, 'Type', 'Nom', 'Ticker', t.common.shares, 'Prix unitaire', t.common.fees, 'Total (€)'])
  }

  return (
    <div className="space-y-6">

      {/* ── Plafond PEA ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.gestion.ceilingTitle}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.gestion.ceilingDesc}</p>
          </div>
          {isCritical && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-full text-xs font-semibold">
              <AlertTriangle size={13} /> {t.gestion.ceilingReached}
            </div>
          )}
          {isNearCeiling && !isCritical && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-full text-xs font-semibold">
              <AlertTriangle size={13} /> {t.gestion.ceilingAlmostReached}
            </div>
          )}
        </div>
        <div className="relative h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isCritical ? 'bg-red-500' : isNearCeiling ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${pctUsed}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.gestion.invested}</div><div className="font-bold text-gray-900 dark:text-gray-100">{formatEur(totalDeposited)}</div></div>
          <div><div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.gestion.available}</div><div className={`font-bold ${remaining < 10_000 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-500'}`}>{formatEur(remaining)}</div></div>
          <div><div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.gestion.legalLimit}</div><div className="font-bold text-gray-500 dark:text-gray-400">{formatEur(PEA_CEILING)}</div></div>
        </div>
        <div className="mt-3 text-right text-xs text-gray-400 dark:text-gray-500">{pctUsed.toFixed(1)}% {t.gestion.used}</div>
      </div>

      {/* ── Onglets ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {([
            { key: 'mouvements', label: t.gestion.tabCash, count: visibleFlows.length },
            { key: 'transactions', label: t.gestion.tabTx, count: sortedTx.length },
            { key: 'repartition', label: t.gestion.tabAlloc, count: null },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3.5 text-sm font-semibold transition ${activeTab === key ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              {label}
              {count !== null && <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">({count})</span>}
            </button>
          ))}
        </div>

        {/* ── Mouvements ── */}
        {activeTab === 'mouvements' && (
          <div>
            <div className="grid grid-cols-4 gap-0 border-b border-gray-100 dark:border-gray-800 text-sm">
              <div className="px-5 py-3 border-r border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.gestion.totalDeposit}</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-500">{formatEur(visibleFlows.filter(f => f.type === 'DEPOSIT').reduce((a, f) => a + f.amount, 0))}</div>
              </div>
              <div className="px-5 py-3 border-r border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.gestion.totalWithdraw}</div>
                <div className="font-bold text-red-500 dark:text-red-400">{formatEur(visibleFlows.filter(f => f.type === 'WITHDRAWAL').reduce((a, f) => a + f.amount, 0))}</div>
              </div>
              <div className="px-5 py-3 border-r border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.metrics.cashBalance}</div>
                <div className={`font-bold ${cashBalance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>{formatEur(cashBalance)}</div>
              </div>
              <div className="px-5 py-3 flex items-center justify-end">
                <button onClick={exportMovementsCSV} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition">
                  <Download size={13} /> CSV
                </button>
              </div>
            </div>
            {visibleFlows.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">{t.gestion.emptyCash}</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {visibleFlows.map((cf) => {
                  const meta = CF_META[cf.type] ?? { label: cf.type, color: 'text-gray-600', bg: 'bg-gray-100' }
                  return (
                    <div key={cf.id} className={`flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/50 transition ${deletingId === cf.id ? 'opacity-40' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.bg} shrink-0`}>
                        {cf.type === 'DEPOSIT' ? <TrendingUp size={14} className={meta.color} /> : <TrendingDown size={14} className={meta.color} />}
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(cf.date).toLocaleDateString(t === require('@/lib/i18n/dictionaries').en ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      </div>
                      <div className="flex-1 text-sm text-gray-500 dark:text-gray-400 truncate">{cf.notes || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}</div>
                      <div className={`text-base font-bold shrink-0 ${cf.type === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`}>
                        {cf.type === 'DEPOSIT' ? '+' : '-'}{formatEur(cf.amount)}
                      </div>
                      <ConfirmDeleteButton t={t} onConfirm={() => handleDeleteFlow(cf.id)} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Transactions ── */}
        {activeTab === 'transactions' && (
          <div>
            <div className="grid grid-cols-4 gap-0 border-b border-gray-100 dark:border-gray-800 text-sm">
              <div className="px-5 py-3 border-r border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.gestion.totalBuy}</div>
                <div className="font-bold text-gray-900 dark:text-gray-100">{formatEur(sortedTx.filter(tx => tx.type === 'BUY').reduce((a, tx) => a + tx.total_cost, 0))}</div>
              </div>
              <div className="px-5 py-3 border-r border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.gestion.totalSell}</div>
                <div className="font-bold text-gray-900 dark:text-gray-100">{formatEur(sortedTx.filter(tx => tx.type === 'SELL').reduce((a, tx) => a + tx.total_cost, 0))}</div>
              </div>
              <div className="px-5 py-3 border-r border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.gestion.dividends}</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-500">{formatEur(sortedTx.filter(tx => tx.type === 'DIVIDEND').reduce((a, tx) => a + tx.total_cost, 0))}</div>
              </div>
              <div className="px-5 py-3 flex items-center justify-end">
                <button onClick={exportTransactionsCSV} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition">
                  <Download size={13} /> CSV
                </button>
              </div>
            </div>
            {sortedTx.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">{t.gestion.emptyTx}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 uppercase tracking-wide">
                      <th className="px-5 py-2.5 text-left">{t.common.date}</th>
                      <th className="px-3 py-2.5 text-left">Type</th>
                      <th className="px-3 py-2.5 text-left">{t.portfolio.asset}</th>
                      <th className="px-3 py-2.5 text-right">{t.common.shares}</th>
                      <th className="px-3 py-2.5 text-right">{t.common.price}</th>
                      <th className="px-3 py-2.5 text-right">{t.common.fees}</th>
                      <th className="px-3 py-2.5 text-right">{t.common.total}</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {sortedTx.map((tx) => {
                      const meta = TX_META[tx.type] ?? { label: tx.type, color: 'text-gray-600', bg: 'bg-gray-100' }
                      const asset = assetMap[tx.asset_id]
                      return (
                        <tr key={tx.id} className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/50 transition ${deletingId === tx.id ? 'opacity-40' : ''}`}>
                          <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString(t === require('@/lib/i18n/dictionaries').en ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{asset?.name ?? '—'}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{asset?.ticker ?? tx.asset_id.slice(0, 8)}</div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                            {tx.type === 'BUY' ? '+' : '-'}{tx.shares_count.toFixed(4)}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{formatEur(tx.unit_price)}</td>
                          <td className="px-3 py-3 text-right text-gray-500 dark:text-gray-400">{formatEur(tx.fee)}</td>
                          <td className={`px-3 py-3 text-right font-bold ${tx.type === 'BUY' ? 'text-gray-900 dark:text-gray-100' : 'text-emerald-600 dark:text-emerald-500'}`}>
                            {tx.type === 'BUY' ? '-' : '+'}{formatEur(tx.total_cost)}
                          </td>
                          <td className="px-3 py-3">
                            <ConfirmDeleteButton t={t} onConfirm={() => handleDeleteTx(tx.id)} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Répartition ── */}
        {activeTab === 'repartition' && (
          <div className="p-6">
            {loadingSectors ? (
              <div className="flex items-center justify-center gap-3 py-20 text-gray-400 dark:text-gray-500">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-sm">{t.gestion.loadingSectors}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stratégie */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center justify-center gap-2">
                    <PieIcon size={15} /> Stratégie (Actions vs ETF)
                  </h4>
                  {strategyPieData.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-gray-500 text-sm">Données non disponibles.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={strategyPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2} stroke="none">
                          {strategyPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend formatter={(v) => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Secteur */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center justify-center gap-2">
                    <PieIcon size={15} /> {t.gestion.bySector}
                  </h4>
                  {sectorPieData.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-gray-500 text-sm">{t.gestion.noSectorData}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={sectorPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2} stroke="none">
                          {sectorPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend formatter={(v) => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Pays */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center justify-center gap-2">
                    <PieIcon size={15} /> {t.gestion.byCountry}
                  </h4>
                  {countryPieData.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-gray-500 text-sm">{t.gestion.noCountryData}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={countryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2} stroke="none">
                          {countryPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 5) % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend formatter={(v) => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

