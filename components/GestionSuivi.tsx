'use client'

import { useState } from 'react'
import { Trash2, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { CashFlow, Transaction, Asset } from '@/lib/db'
import { formatEur } from '@/lib/finance'

// ─── Constants ─────────────────────────────────────────────────
const PEA_CEILING = 150_000

const TX_META: Record<string, { label: string; color: string; bg: string }> = {
  BUY:      { label: 'Achat',     color: 'text-blue-700',    bg: 'bg-blue-100' },
  SELL:     { label: 'Vente',     color: 'text-red-600',     bg: 'bg-red-100' },
  DIVIDEND: { label: 'Dividende', color: 'text-emerald-700', bg: 'bg-emerald-100' },
}

const CF_META: Record<string, { label: string; color: string; bg: string }> = {
  DEPOSIT:    { label: 'Dépôt',    color: 'text-emerald-700', bg: 'bg-emerald-100' },
  WITHDRAWAL: { label: 'Retrait',  color: 'text-red-600',     bg: 'bg-red-100' },
}

// ─── Types ─────────────────────────────────────────────────────
type Props = {
  cashFlows: CashFlow[]
  transactions: Transaction[]
  assets: Asset[]
  totalDeposited: number
  cashBalance: number
  onRefresh: () => void
}

// ─── Delete helpers ─────────────────────────────────────────────
async function deleteCashFlow(id: string): Promise<void> {
  const res = await fetch(`/api/cashflows?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ─── Sub-components ─────────────────────────────────────────────

function ConfirmDeleteButton({
  onConfirm,
  label,
}: {
  onConfirm: () => void
  label: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-red-600 font-medium">Supprimer ?</span>
        <button
          onClick={onConfirm}
          className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-md hover:bg-red-700 transition font-semibold"
        >
          Oui
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded-md transition"
        >
          Non
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Supprimer ${label}`}
      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
    >
      <Trash2 size={14} />
    </button>
  )
}

// ─── Main Component ─────────────────────────────────────────────

export function GestionSuivi({ cashFlows, transactions, assets, totalDeposited, cashBalance, onRefresh }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'mouvements' | 'transactions'>('mouvements')

  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]))

  // ── PEA ceiling ──────────────────────────────────────────────
  const pctUsed = Math.min((totalDeposited / PEA_CEILING) * 100, 100)
  const remaining = PEA_CEILING - totalDeposited
  const isNearCeiling = pctUsed >= 80
  const isCritical = pctUsed >= 95

  // ── Cash flows — visible ones only (exclude __CORRECTION__) ──
  const visibleFlows = [...cashFlows]
    .filter((cf) => !cf.notes?.includes('__CORRECTION__'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ── Transactions sorted by date desc ────────────────────────
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // ── Handlers ────────────────────────────────────────────────
  async function handleDeleteFlow(id: string) {
    setDeletingId(id)
    try { await deleteCashFlow(id); onRefresh() } catch (e) { console.error(e) }
    finally { setDeletingId(null) }
  }

  async function handleDeleteTx(id: string) {
    setDeletingId(id)
    try { await deleteTransaction(id); onRefresh() } catch (e) { console.error(e) }
    finally { setDeletingId(null) }
  }

  return (
    <div className="space-y-6">

      {/* ── Plafond PEA ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Plafond PEA</h3>
            <p className="text-xs text-gray-400 mt-0.5">Versements cumulés sur le plan</p>
          </div>
          {isCritical && (
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-xs font-semibold">
              <AlertTriangle size={13} />
              Plafond presque atteint
            </div>
          )}
          {isNearCeiling && !isCritical && (
            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-xs font-semibold">
              <AlertTriangle size={13} />
              Attention : 80% atteint
            </div>
          )}
        </div>

        {/* Barre de progression */}
        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isCritical ? 'bg-red-500' : isNearCeiling ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${pctUsed}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Versé</div>
            <div className="font-bold text-gray-900">{formatEur(totalDeposited)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Disponible</div>
            <div className={`font-bold ${remaining < 10_000 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatEur(remaining)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Plafond légal</div>
            <div className="font-bold text-gray-500">{formatEur(PEA_CEILING)}</div>
          </div>
        </div>

        <div className="mt-3 text-right text-xs text-gray-400">
          {pctUsed.toFixed(1)}% utilisé
        </div>
      </div>

      {/* ── Onglets Mouvements / Transactions ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('mouvements')}
            className={`flex-1 py-3.5 text-sm font-semibold transition ${
              activeTab === 'mouvements'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            💰 Mouvements espèces
            <span className="ml-2 text-xs font-normal text-gray-400">({visibleFlows.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-3.5 text-sm font-semibold transition ${
              activeTab === 'transactions'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📋 Transactions titres
            <span className="ml-2 text-xs font-normal text-gray-400">({sortedTx.length})</span>
          </button>
        </div>

        {/* ── Mouvements espèces ── */}
        {activeTab === 'mouvements' && (
          <div>
            {/* Résumé */}
            <div className="grid grid-cols-3 gap-0 border-b border-gray-100 text-sm">
              <div className="px-5 py-3 border-r border-gray-100">
                <div className="text-xs text-gray-400 mb-0.5">Total déposé</div>
                <div className="font-bold text-emerald-600">
                  {formatEur(visibleFlows.filter(f => f.type === 'DEPOSIT').reduce((a, f) => a + f.amount, 0))}
                </div>
              </div>
              <div className="px-5 py-3 border-r border-gray-100">
                <div className="text-xs text-gray-400 mb-0.5">Total retiré</div>
                <div className="font-bold text-red-500">
                  {formatEur(visibleFlows.filter(f => f.type === 'WITHDRAWAL').reduce((a, f) => a + f.amount, 0))}
                </div>
              </div>
              <div className="px-5 py-3">
                <div className="text-xs text-gray-400 mb-0.5">Solde espèces</div>
                <div className={`font-bold ${cashBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatEur(cashBalance)}
                </div>
              </div>
            </div>

            {/* Table */}
            {visibleFlows.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Aucun mouvement enregistré.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {visibleFlows.map((cf) => {
                  const meta = CF_META[cf.type] ?? { label: cf.type, color: 'text-gray-600', bg: 'bg-gray-100' }
                  return (
                    <div
                      key={cf.id}
                      className={`flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/60 transition ${
                        deletingId === cf.id ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.bg} shrink-0`}>
                        {cf.type === 'DEPOSIT'
                          ? <TrendingUp size={14} className={meta.color} />
                          : <TrendingDown size={14} className={meta.color} />}
                      </div>

                      {/* Date + type */}
                      <div className="w-32 shrink-0">
                        <div className="text-xs text-gray-400">
                          {new Date(cf.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      </div>

                      {/* Notes */}
                      <div className="flex-1 text-sm text-gray-500 truncate">
                        {cf.notes || <span className="text-gray-300 italic">—</span>}
                      </div>

                      {/* Amount */}
                      <div className={`text-base font-bold shrink-0 ${
                        cf.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {cf.type === 'DEPOSIT' ? '+' : '-'}{formatEur(cf.amount)}
                      </div>

                      {/* Delete */}
                      <ConfirmDeleteButton
                        label="ce mouvement"
                        onConfirm={() => handleDeleteFlow(cf.id)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Transactions titres ── */}
        {activeTab === 'transactions' && (
          <div>
            {/* Résumé */}
            <div className="grid grid-cols-3 gap-0 border-b border-gray-100 text-sm">
              <div className="px-5 py-3 border-r border-gray-100">
                <div className="text-xs text-gray-400 mb-0.5">Total investi (BUY)</div>
                <div className="font-bold text-gray-900">
                  {formatEur(sortedTx.filter(t => t.type === 'BUY').reduce((a, t) => a + t.total_cost, 0))}
                </div>
              </div>
              <div className="px-5 py-3 border-r border-gray-100">
                <div className="text-xs text-gray-400 mb-0.5">Total cédé (SELL)</div>
                <div className="font-bold text-gray-900">
                  {formatEur(sortedTx.filter(t => t.type === 'SELL').reduce((a, t) => a + t.total_cost, 0))}
                </div>
              </div>
              <div className="px-5 py-3">
                <div className="text-xs text-gray-400 mb-0.5">Dividendes reçus</div>
                <div className="font-bold text-emerald-600">
                  {formatEur(sortedTx.filter(t => t.type === 'DIVIDEND').reduce((a, t) => a + t.total_cost, 0))}
                </div>
              </div>
            </div>

            {/* Table */}
            {sortedTx.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Aucune transaction enregistrée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100 uppercase tracking-wide">
                      <th className="px-5 py-2.5 text-left">Date</th>
                      <th className="px-3 py-2.5 text-left">Type</th>
                      <th className="px-3 py-2.5 text-left">Actif</th>
                      <th className="px-3 py-2.5 text-right">Parts</th>
                      <th className="px-3 py-2.5 text-right">Prix unit.</th>
                      <th className="px-3 py-2.5 text-right">Frais</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedTx.map((tx) => {
                      const meta = TX_META[tx.type] ?? { label: tx.type, color: 'text-gray-600', bg: 'bg-gray-100' }
                      const asset = assetMap[tx.asset_id]
                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-gray-50/60 transition ${deletingId === tx.id ? 'opacity-40' : ''}`}
                        >
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 leading-tight">{asset?.name ?? '—'}</div>
                            <div className="text-xs text-gray-400 font-mono">{asset?.ticker ?? tx.asset_id.slice(0, 8)}</div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-gray-700">
                            {tx.type === 'BUY' ? '+' : '-'}{tx.shares_count.toFixed(4)}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatEur(tx.unit_price)}</td>
                          <td className="px-3 py-3 text-right text-gray-500">{formatEur(tx.fee)}</td>
                          <td className={`px-3 py-3 text-right font-bold ${
                            tx.type === 'BUY' ? 'text-gray-900' : 'text-emerald-600'
                          }`}>
                            {tx.type === 'BUY' ? '-' : '+'}{formatEur(tx.total_cost)}
                          </td>
                          <td className="px-3 py-3">
                            <ConfirmDeleteButton
                              label="cette transaction"
                              onConfirm={() => handleDeleteTx(tx.id)}
                            />
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
      </div>
    </div>
  )
}

