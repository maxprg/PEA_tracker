'use client'

import { useState } from 'react'
import { insertCashFlow } from '@/lib/db'
import { Loader2, X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CashFlowModal({ open, onClose, onSuccess }: Props) {
  const { t } = useLanguage()
  const [type, setType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const amountVal = parseFloat(amount) || 0
  const isValid = amountVal > 0

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      await insertCashFlow({
        type,
        amount: amountVal,
        date,
        notes: notes.trim() || null,
      })
      // Reset form
      setAmount('')
      setNotes('')
      setDate(new Date().toISOString().split('T')[0])
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t.cashModal.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X size={20} />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-4">
          <button
            onClick={() => setType('DEPOSIT')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition flex items-center justify-center gap-2 ${
              type === 'DEPOSIT' ? 'bg-white dark:bg-gray-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <ArrowDownCircle size={15} />
            {t.cashModal.deposit}
          </button>
          <button
            onClick={() => setType('WITHDRAWAL')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition flex items-center justify-center gap-2 ${
              type === 'WITHDRAWAL' ? 'bg-white dark:bg-gray-700 shadow text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <ArrowUpCircle size={15} />
            {t.cashModal.withdraw}
          </button>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t.cashModal.amount}</label>
          <div
            className={`flex items-center border rounded-xl px-4 py-3 bg-white dark:bg-gray-900 focus-within:ring-2 ${
              type === 'DEPOSIT' ? 'border-emerald-300 dark:border-emerald-500/30 focus-within:ring-emerald-500' : 'border-red-300 dark:border-red-500/30 focus-within:ring-red-500'
            }`}
          >
            <input
              type="number"
              min="0"
              step="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ex: 1000"
              className="flex-1 outline-none text-sm text-gray-900 dark:text-gray-100 bg-transparent"
            />
            <span className="text-sm text-gray-400 font-medium">€</span>
          </div>
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t.common.date}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Notes <span className="text-gray-400 dark:text-gray-500">({t.cashModal.optional})</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: virement mensuel"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition flex items-center justify-center gap-2 ${
              isValid && !submitting
                ? type === 'DEPOSIT'
                  ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700'
                  : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {type === 'DEPOSIT' ? t.cashModal.saveDeposit : t.cashModal.saveWithdraw}
          </button>
        </div>
      </div>
    </div>
  )
}
