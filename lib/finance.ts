import { CashFlow, Transaction } from './db'

// ============================================================
// Types
// ============================================================

export type QuoteMap = Record<string, { price: number; changePercent: number; currency: string }>

export type HoldingMetrics = {
  assetId: string
  ticker: string
  name: string
  category: string
  custom_sector?: string | null
  custom_region?: string | null
  shares: number
  pru: number            // Prix de revient unitaire (weighted avg cost)
  currentPrice: number
  lineValue: number      // shares * currentPrice
  latentGainEur: number  // (currentPrice - pru) * shares
  latentGainPct: number  // (currentPrice - pru) / pru * 100
  changePercent: number  // journalier %
  weight: number         // % of total portfolio (filled by caller)
}

// ============================================================
// Solde Espèces
// ============================================================

/**
 * Calcule le solde espèces disponible.
 * = (Total Dépôts - Total Retraits) - Σ(BUY total_cost) + Σ(SELL total_cost) + Σ(DIVIDEND total_cost)
 */
export function computeCashBalance(cashFlows: CashFlow[], transactions: Transaction[]): number {
  const flowBalance = cashFlows.reduce((acc, cf) => {
    return cf.type === 'DEPOSIT' ? acc + cf.amount : acc - cf.amount
  }, 0)

  const txBalance = transactions.reduce((acc, tx) => {
    if (tx.type === 'BUY') return acc - tx.total_cost
    if (tx.type === 'SELL') return acc + tx.total_cost
    if (tx.type === 'DIVIDEND') return acc + tx.total_cost
    return acc
  }, 0)

  return flowBalance + txBalance
}

/**
 * Total injecté de la poche (virements entrants bruts).
 * Les flux marqués __CORRECTION__ sont exclus du calcul de la plus-value.
 */
export function computeTotalDeposited(cashFlows: CashFlow[]): number {
  return cashFlows
    .filter((cf) => cf.type === 'DEPOSIT' && !cf.notes?.includes('__CORRECTION__'))
    .reduce((acc, cf) => acc + cf.amount, 0)
}

// ============================================================
// Holdings & PRU
// ============================================================

export type AssetHolding = {
  assetId: string
  ticker: string
  name: string
  category: string
  custom_sector?: string | null
  custom_region?: string | null
  shares: number
  totalCostBasis: number // Σ(shares_count * unit_price + fee) for BUY positions
}

/**
 * Calcule les positions ouvertes par actif (solde de parts & coût moyen).
 */
export function computeHoldings(
  transactions: Transaction[],
  assetMap: Record<string, { ticker: string; name: string; category?: string; custom_sector?: string | null; custom_region?: string | null }>
): AssetHolding[] {
  const holdingsMap: Record<string, { shares: number; costBasis: number }> = {}

  for (const tx of transactions) {
    if (!holdingsMap[tx.asset_id]) {
      holdingsMap[tx.asset_id] = { shares: 0, costBasis: 0 }
    }
    const h = holdingsMap[tx.asset_id]

    if (tx.type === 'BUY') {
      h.costBasis += tx.shares_count * tx.unit_price + tx.fee
      h.shares += tx.shares_count
    } else if (tx.type === 'SELL') {
      const pru = h.shares > 0 ? h.costBasis / h.shares : 0
      h.costBasis -= pru * tx.shares_count
      h.shares -= tx.shares_count
    }
  }

  return Object.entries(holdingsMap)
    .filter(([, h]) => h.shares > 0.0001)
    .map(([assetId, h]) => ({
      assetId,
      ticker: assetMap[assetId]?.ticker ?? assetId,
      name: assetMap[assetId]?.name ?? assetId,
      category: assetMap[assetId]?.category ?? 'Action/ETF',
      custom_sector: assetMap[assetId]?.custom_sector,
      custom_region: assetMap[assetId]?.custom_region,
      shares: h.shares,
      totalCostBasis: h.costBasis,
    }))
}

/**
 * PRU = totalCostBasis / shares
 */
export function computePRU(holding: AssetHolding): number {
  if (holding.shares <= 0) return 0
  return holding.totalCostBasis / holding.shares
}

// ============================================================
// Métriques de portefeuille
// ============================================================

/**
 * Calcule les métriques pour chaque ligne (avec cours en direct).
 */
export function computeHoldingMetrics(
  holdings: AssetHolding[],
  quotes: QuoteMap
): HoldingMetrics[] {
  const totalValue = holdings.reduce((acc, h) => {
    const price = quotes[h.ticker]?.price ?? 0
    return acc + h.shares * price
  }, 0)

  return holdings.map((h) => {
    const quote = quotes[h.ticker]
    const currentPrice = quote?.price ?? 0
    const pru = computePRU(h)
    const lineValue = h.shares * currentPrice
    const latentGainEur = (currentPrice - pru) * h.shares
    const latentGainPct = pru > 0 ? ((currentPrice - pru) / pru) * 100 : 0
    const weight = totalValue > 0 ? (lineValue / totalValue) * 100 : 0

    return {
      assetId: h.assetId,
      ticker: h.ticker,
      name: h.name,
      category: h.category,
      custom_sector: h.custom_sector,
      custom_region: h.custom_region,
      shares: h.shares,
      pru,
      currentPrice,
      lineValue,
      latentGainEur,
      latentGainPct,
      changePercent: quote?.changePercent ?? 0,
      weight,
    }
  })
}

/**
 * Valeur totale du PEA = Valeur des titres + Solde espèces.
 */
export function computeTotalPEAValue(holdingMetrics: HoldingMetrics[], cashBalance: number): number {
  const titresValue = holdingMetrics.reduce((acc, h) => acc + h.lineValue, 0)
  return titresValue + cashBalance
}

/**
 * Plus-value globale en € (valeur totale PEA - total déposé).
 */
export function computeGlobalGainEur(totalPEAValue: number, totalDeposited: number): number {
  return totalPEAValue - totalDeposited
}

// ============================================================
// TRI (Taux de Rendement Interne) — Newton-Raphson IRR
// ============================================================

/**
 * Calcule le TRI annualisé à partir des cash flows datés et de la valeur actuelle du portefeuille.
 * Les dépôts sont des sorties de trésorerie (négatifs), les retraits + valeur finale sont positifs.
 */
export function computeIRR(cashFlows: CashFlow[], currentPortfolioValue: number): number | null {
  if (cashFlows.length === 0) return null

  // Trier par date croissante
  const sorted = [...cashFlows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const today = new Date()

  // Construire les flux: dépôts = sorties (-), retraits = entrées (+)
  // + valeur résiduelle du portefeuille aujourd'hui (+)
  const flows: { date: Date; amount: number }[] = sorted.map((cf) => ({
    date: new Date(cf.date),
    amount: cf.type === 'DEPOSIT' ? -cf.amount : cf.amount,
  }))
  flows.push({ date: today, amount: currentPortfolioValue })

  const t0 = flows[0].date.getTime()

  // NPV en fonction du taux r (annualisé)
  function npv(r: number): number {
    return flows.reduce((acc, f) => {
      const years = (f.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000)
      return acc + f.amount / Math.pow(1 + r, years)
    }, 0)
  }

  // Dérivée de NPV
  function dnpv(r: number): number {
    return flows.reduce((acc, f) => {
      const years = (f.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000)
      return acc - (years * f.amount) / Math.pow(1 + r, years + 1)
    }, 0)
  }

  // Newton-Raphson
  let r = 0.1 // initial guess: 10%
  for (let i = 0; i < 200; i++) {
    const n = npv(r)
    const d = dnpv(r)
    if (Math.abs(d) < 1e-12) break
    const r2 = r - n / d
    if (Math.abs(r2 - r) < 1e-8) {
      return r2 * 100 // retourne en %
    }
    r = r2
    if (r < -0.999) r = -0.999
  }

  return null
}

// ============================================================
// Achat par montant brut
// ============================================================

/**
 * Calcule les parts achetables avec un budget donné.
 * Parts = floor((budget - fee) / price) where fee = budget * feeRate / (1 + feeRate)
 * Le résultat est exact: total_cost = parts * price + fee ne dépasse jamais le budget.
 */
export function computeSharesFromBudget(
  budget: number,
  price: number,
  feeRate: number = 0.005 // 0.50%
): { shares: number; fee: number; totalCost: number; remaining: number } {
  if (price <= 0) return { shares: 0, fee: 0, totalCost: 0, remaining: budget }

  // On calcule les parts max telles que parts * price + parts * price * feeRate <= budget
  // => parts <= budget / (price * (1 + feeRate))
  const shares = Math.floor(budget / (price * (1 + feeRate)))
  const fee = Math.round(shares * price * feeRate * 100) / 100
  const totalCost = Math.round((shares * price + fee) * 100) / 100
  const remaining = Math.round((budget - totalCost) * 100) / 100

  return { shares, fee, totalCost, remaining }
}

/**
 * Calcule le coût total pour un nombre de parts donné.
 */
export function computeCostFromShares(
  shares: number,
  price: number,
  feeRate: number = 0.005
): { fee: number; totalCost: number } {
  const fee = Math.round(shares * price * feeRate * 100) / 100
  const totalCost = Math.round((shares * price + fee) * 100) / 100
  return { fee, totalCost }
}

// ============================================================
// Formatage
// ============================================================

export function formatEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

export function formatPct(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)} %`
}

