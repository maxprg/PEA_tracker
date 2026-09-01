'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Trash2, Plus, Search, TrendingUp, TrendingDown, Loader2, X, ShoppingCart } from 'lucide-react'
import { WatchlistItem } from '@/lib/db'
import { formatEur } from '@/lib/finance'

type QuoteData = { price: number; changePercent: number; currency: string }

type Props = {
  onBuy: (item: { ticker: string; name: string; exchange: string; quoteType: string }) => void
}

type SearchResult = { ticker: string; name: string; exchange: string; quoteType: string }

export function WatchlistTab({ onBuy }: Props) {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({})
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/watchlist')
    const data = await res.json()
    setItems(data)
    setLoading(false)
    // Fetch quotes
    if (data.length > 0) {
      const qRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: data.map((i: WatchlistItem) => i.ticker) }),
      })
      setQuotes(await qRes.json())
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(await r.json())
      } finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function addItem(result: SearchResult) {
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: result.ticker, name: result.name }),
    })
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    await loadItems()
  }

  async function removeItem(id: string) {
    setDeletingId(id)
    await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' })
    setDeletingId(null)
    await loadItems()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Watchlist <span className="text-gray-400 font-normal text-sm">({items.length})</span>
        </h3>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
        >
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {/* Search to add */}
      {showSearch && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
            {searching
              ? <Loader2 size={16} className="animate-spin text-gray-400" />
              : <Search size={16} className="text-gray-400" />
            }
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un ETF ou une action..."
              className="flex-1 outline-none text-sm"
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}>
              <X size={16} className="text-gray-400" />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 divide-y divide-gray-50">
              {searchResults.map(r => (
                <button
                  key={r.ticker}
                  onClick={() => addItem(r)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-gray-50 rounded-lg transition text-left"
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.ticker} · {r.exchange}</div>
                  </div>
                  <Plus size={16} className="text-blue-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">
          <Loader2 size={24} className="animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
          <Bell size={32} className="mx-auto mb-3 opacity-40" />
          Votre watchlist est vide.<br />Ajoutez des actifs à surveiller.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Actif</th>
                <th className="px-4 py-3 text-right">Cours</th>
                <th className="px-4 py-3 text-right">Variation</th>
                <th className="px-4 py-3 text-right">Prix cible</th>
                <th className="px-4 py-3 text-right">Distance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const q = quotes[item.ticker]
                const price = q?.price ?? 0
                const change = q?.changePercent ?? 0
                const isUp = change >= 0
                const distPct = item.target_price && price > 0
                  ? ((item.target_price - price) / price * 100)
                  : null
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50/50 transition ${deletingId === item.id ? 'opacity-40' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{item.ticker}</div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900">
                      {price > 0 ? formatEur(price) : '—'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`flex items-center justify-end gap-1 font-semibold text-sm ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {isUp ? '+' : ''}{change.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600">
                      {item.target_price
                        ? formatEur(item.target_price)
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-4 text-right">
                      {distPct !== null ? (
                        <span className={`text-xs font-semibold ${distPct > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {distPct > 0 ? '+' : ''}{distPct.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => onBuy({ ticker: item.ticker, name: item.name, exchange: '', quoteType: 'EQUITY' })}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <ShoppingCart size={12} /> Acheter
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
