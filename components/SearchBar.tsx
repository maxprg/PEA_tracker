'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

type SearchResult = {
  ticker: string
  name: string
  exchange: string
  quoteType: string
}

type Props = {
  onSelect: (result: SearchResult) => void
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function SearchBar({ onSelect }: Props) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 350)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setResults(data)
        setOpen(data.length > 0)
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResults(debouncedQuery)
  }, [debouncedQuery, fetchResults])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(result: SearchResult) {
    setQuery('')
    setResults([])
    setOpen(false)
    onSelect(result)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
        {loading ? (
          <Loader2 size={18} className="text-blue-500 animate-spin shrink-0" />
        ) : (
          <Search size={18} className="text-gray-400 shrink-0" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.watchlist.searchPlaceholder}
          className="flex-1 outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50">
          {results.map((r) => (
            <li key={r.ticker}>
              <button
                className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-800 transition flex items-center gap-3"
                onClick={() => handleSelect(r)}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {r.ticker} · {r.exchange} · {r.quoteType}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
