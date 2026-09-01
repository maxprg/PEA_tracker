'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllData, Asset, Transaction } from '@/lib/db'
import {
  computeCashBalance,
  computeTotalDeposited,
  computeHoldings,
  computeHoldingMetrics,
  computeTotalPEAValue,
  computeGlobalGainEur,
  computeIRR,
  HoldingMetrics,
  QuoteMap,
} from '@/lib/finance'
import { MetricsHeader } from '@/components/MetricsHeader'
import { SearchBar } from '@/components/SearchBar'
import { BuyModal } from '@/components/BuyModal'
import { SellModal } from '@/components/SellModal'
import { CashFlowModal } from '@/components/CashFlowModal'
import { PortfolioTable } from '@/components/PortfolioTable'
import { PositionDetailsModal } from '@/components/PositionDetailsModal'
import { PriceChartModal } from '@/components/PriceChartModal'
import { GestionSuivi } from '@/components/GestionSuivi'
import { RefreshCw } from 'lucide-react'

type SearchResult = {
  ticker: string
  name: string
  exchange: string
  quoteType: string
}

type Tab = 'portefeuille' | 'gestion'

const QUOTES_REFRESH_INTERVAL = 30_000

export default function HomePage() {
  // ─── Navigation ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('portefeuille')

  // ─── Data state ───────────────────────────────────────────
  const [assets, setAssets] = useState<Asset[]>([])
  const [cashFlows, setCashFlows] = useState<import('@/lib/db').CashFlow[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [quotes, setQuotes] = useState<QuoteMap>({})
  const [loadingData, setLoadingData] = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ─── Modal state ──────────────────────────────────────────
  const [buyAsset, setBuyAsset] = useState<SearchResult | null>(null)
  const [buyExistingHolding, setBuyExistingHolding] = useState<{ shares: number; pru: number } | null>(null)
  const [sellHolding, setSellHolding] = useState<{ holding: HoldingMetrics; assetId: string } | null>(null)
  const [cashFlowOpen, setCashFlowOpen] = useState(false)
  const [detailsHolding, setDetailsHolding] = useState<HoldingMetrics | null>(null)
  const [chartHolding, setChartHolding] = useState<HoldingMetrics | null>(null)

  // ─── Load DB data ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const { assets: a, cashFlows: cf, transactions: tx } = await getAllData()
      setAssets(a)
      setCashFlows(cf)
      setTransactions(tx)
    } catch (err) {
      console.error('Erreur chargement données:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Fetch live quotes ────────────────────────────────────
  const fetchQuotes = useCallback(async (tickers: string[]) => {
    if (!tickers.length) return
    setLoadingQuotes(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      })
      const data = await res.json()
      setQuotes(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Erreur quotes:', err)
    } finally {
      setLoadingQuotes(false)
    }
  }, [])

  useEffect(() => {
    if (assets.length === 0) return
    const tickers = assets.map((a) => a.ticker)
    fetchQuotes(tickers)
    const interval = setInterval(() => fetchQuotes(tickers), QUOTES_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [assets, fetchQuotes])

  // ─── Derived metrics ──────────────────────────────────────
  const assetMap = Object.fromEntries(assets.map((a) => [a.id, { ticker: a.ticker, name: a.name }]))
  const holdings = computeHoldings(transactions, assetMap)
  const holdingMetrics = computeHoldingMetrics(holdings, quotes)
  const cashBalance = computeCashBalance(cashFlows, transactions)
  const totalDeposited = computeTotalDeposited(cashFlows)
  const totalPEAValue = computeTotalPEAValue(holdingMetrics, cashBalance)
  const globalGainEur = computeGlobalGainEur(totalPEAValue, totalDeposited)
  const globalGainPct = totalDeposited > 0 ? (globalGainEur / totalDeposited) * 100 : 0
  const irr = computeIRR(cashFlows, totalPEAValue)

  // ─── Handlers ─────────────────────────────────────────────
  function handleSearchSelect(result: SearchResult) {
    setBuyExistingHolding(null)
    setBuyAsset(result)
  }

  function handleBuyMore(holding: HoldingMetrics) {
    const asset = assets.find((a) => a.id === holding.assetId)
    if (asset) {
      setBuyExistingHolding({ shares: holding.shares, pru: holding.pru })
      setBuyAsset({
        ticker: asset.ticker,
        name: asset.name,
        exchange: '',
        quoteType: asset.category === 'ETF' ? 'ETF' : 'EQUITY',
      })
    }
  }

  function handleSell(holding: HoldingMetrics) {
    setSellHolding({ holding, assetId: holding.assetId })
  }

  function handleDetails(holding: HoldingMetrics) {
    setDetailsHolding(holding)
  }

  function handleChart(holding: HoldingMetrics) {
    setChartHolding(holding)
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <RefreshCw size={32} className="animate-spin" />
          <span className="text-sm">Chargement du portefeuille…</span>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">📈 PEA Tracker</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('portefeuille')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'portefeuille'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Portefeuille
            </button>
            <button
              onClick={() => setActiveTab('gestion')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'gestion'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Gestion & Suivi
            </button>
          </nav>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            {loadingQuotes && <RefreshCw size={12} className="animate-spin" />}
            {lastUpdated && (
              <span>
                Mis à jour{' '}
                {lastUpdated.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Métriques (toujours visibles) ── */}
        <MetricsHeader
          totalPEAValue={totalPEAValue}
          cashBalance={cashBalance}
          totalDeposited={totalDeposited}
          globalGainEur={globalGainEur}
          globalGainPct={globalGainPct}
          irr={irr}
          onDeposit={() => setCashFlowOpen(true)}
        />

        {/* ── Tab: Portefeuille ── */}
        {activeTab === 'portefeuille' && (
          <>
            {/* Barre de recherche */}
            <section>
              <div className="flex items-center gap-4 flex-wrap">
                <SearchBar onSelect={handleSearchSelect} />
                <p className="text-sm text-gray-400 hidden sm:block">
                  Cherchez un ETF ou une action, cliquez pour enregistrer un achat
                </p>
              </div>
            </section>

            {/* Tableau */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Lignes détenues{' '}
                  <span className="text-gray-400 font-normal text-sm">({holdingMetrics.length})</span>
                </h2>
                <button
                  onClick={() => fetchQuotes(assets.map((a) => a.ticker))}
                  disabled={loadingQuotes}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
                >
                  <RefreshCw size={13} className={loadingQuotes ? 'animate-spin' : ''} />
                  Actualiser les cours
                </button>
              </div>
              <PortfolioTable
                holdings={holdingMetrics}
                totalValue={totalPEAValue}
                onBuyMore={handleBuyMore}
                onSell={handleSell}
                onDetails={handleDetails}
                onChart={handleChart}
              />
            </section>
          </>
        )}

        {/* ── Tab: Gestion & Suivi ── */}
        {activeTab === 'gestion' && (
          <GestionSuivi
            cashFlows={cashFlows}
            transactions={transactions}
            assets={assets}
            totalDeposited={totalDeposited}
            cashBalance={cashBalance}
            onRefresh={loadData}
          />
        )}
      </div>

      {/* ── Modals ── */}
      <BuyModal
        asset={buyAsset}
        cashBalance={cashBalance}
        existingHolding={buyExistingHolding}
        onClose={() => { setBuyAsset(null); setBuyExistingHolding(null) }}
        onSuccess={loadData}
      />
      <SellModal
        holding={sellHolding?.holding ?? null}
        assetId={sellHolding?.assetId ?? ''}
        onClose={() => setSellHolding(null)}
        onSuccess={loadData}
      />
      <CashFlowModal
        open={cashFlowOpen}
        onClose={() => setCashFlowOpen(false)}
        onSuccess={loadData}
      />
      <PositionDetailsModal
        holding={detailsHolding}
        transactions={transactions}
        onClose={() => setDetailsHolding(null)}
      />
      <PriceChartModal
        holding={chartHolding}
        transactions={transactions}
        onClose={() => setChartHolding(null)}
      />
    </main>
  )
}
