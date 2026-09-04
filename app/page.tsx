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
import { SimulationModal } from '@/components/SimulationModal'
import { WatchlistTab } from '@/components/WatchlistTab'
import { RefreshCw, TrendingUp, Briefcase, PieChart, Bookmark } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { ThemeLanguageToggle } from '@/components/ThemeLanguageToggle'

type SearchResult = {
  ticker: string
  name: string
  exchange: string
  quoteType: string
}

type Tab = 'portefeuille' | 'gestion' | 'watchlist'

const QUOTES_REFRESH_INTERVAL = 30_000

export default function HomePage() {
  const { t } = useLanguage()

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
  const [simulationOpen, setSimulationOpen] = useState(false)

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

  useEffect(() => { loadData() }, [loadData])

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
      setQuotes(await res.json())
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
      setBuyAsset({ ticker: asset.ticker, name: asset.name, exchange: '', quoteType: asset.category === 'ETF' ? 'ETF' : 'EQUITY' })
    }
  }

  function handleSell(holding: HoldingMetrics) { setSellHolding({ holding, assetId: holding.assetId }) }
  function handleDetails(holding: HoldingMetrics) { setDetailsHolding(holding) }
  function handleChart(holding: HoldingMetrics) { setChartHolding(holding) }

  function handleWatchlistBuy(item: { ticker: string; name: string; exchange: string; quoteType: string }) {
    setBuyExistingHolding(null)
    setBuyAsset(item)
    setActiveTab('portefeuille')
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <RefreshCw size={32} className="animate-spin" />
          <span className="text-sm">{t.common.loading}</span>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      {/* ── Header ── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-0 min-h-[4rem] flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-between">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <span className="text-xl font-bold shrink-0">📈 {t.header.title}</span>
            {/* Toggles & Simulation (Mobile) */}
            <div className="flex sm:hidden items-center gap-3 shrink-0">
              <ThemeLanguageToggle />
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex w-full sm:w-auto items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-2xl mx-auto backdrop-blur-md">
            {([
              { key: 'portefeuille', label: t.header.portfolio, icon: Briefcase },
              { key: 'gestion', label: t.header.management, icon: PieChart },
              { key: 'watchlist', label: t.header.watchlist, icon: Bookmark },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  activeTab === key 
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon size={16} className={activeTab === key ? 'text-blue-600 dark:text-blue-400' : 'opacity-70'} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden text-xs">{label.split(' & ')[0]}</span>
              </button>
            ))}
          </nav>

          {/* Toggles & Simulation (Desktop) */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <ThemeLanguageToggle />
            
            <button
              onClick={() => setSimulationOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-xl transition"
            >
              <TrendingUp size={14} /> {t.header.simulation}
            </button>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              {loadingQuotes && <RefreshCw size={12} className="animate-spin" />}
              {lastUpdated && (
                <span className="hidden lg:block">
                  {lastUpdated.toLocaleTimeString(t === require('@/lib/i18n/dictionaries').en ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Métriques ── */}
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
            <section>
              <div className="flex items-center gap-4 flex-wrap">
                <SearchBar onSelect={handleSearchSelect} />
                <p className="text-sm text-gray-400 hidden sm:block">
                  {t.portfolio.searchPlaceholder}
                </p>
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">
                  {t.portfolio.holdings} <span className="text-gray-400 font-normal text-sm">({holdingMetrics.length})</span>
                </h2>
                <button
                  onClick={() => fetchQuotes(assets.map((a) => a.ticker))}
                  disabled={loadingQuotes}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition"
                >
                  <RefreshCw size={13} className={loadingQuotes ? 'animate-spin' : ''} />
                  {t.header.refresh}
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

        {/* ── Tab: Watchlist ── */}
        {activeTab === 'watchlist' && (
          <WatchlistTab onBuy={handleWatchlistBuy} />
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
        onUpdate={loadData}
      />
      <PriceChartModal
        holding={chartHolding}
        transactions={transactions}
        onClose={() => setChartHolding(null)}
      />
      <SimulationModal
        open={simulationOpen}
        currentPortfolioValue={totalPEAValue}
        onClose={() => setSimulationOpen(false)}
      />
    </main>
  )
}
