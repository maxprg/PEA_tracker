// lib/db.ts — client-side wrappers around the SQLite API routes

export type Asset = {
  id: string
  ticker: string
  name: string
  isin: string | null
  category: string
  notes?: string | null
  custom_sector?: string | null
  custom_region?: string | null
  created_at: string
}

export type CashFlow = {
  id: string
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export type Transaction = {
  id: string
  asset_id: string
  type: 'BUY' | 'SELL' | 'DIVIDEND'
  shares_count: number
  unit_price: number
  fee: number
  total_cost: number
  date: string
  created_at: string
}

export type WatchlistItem = {
  id: string
  ticker: string
  name: string
  target_price: number | null
  notes: string | null
  created_at: string
}

// ============================================================
// Chargement global
// ============================================================

export async function getAllData(): Promise<{
  assets: Asset[]
  cashFlows: CashFlow[]
  transactions: Transaction[]
}> {
  const res = await fetch('/api/data', { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return {
    assets: data.assets ?? [],
    cashFlows: data.cashFlows ?? [],
    transactions: data.transactions ?? [],
  }
}

export async function getAssets(): Promise<Asset[]> {
  return (await getAllData()).assets
}

export async function getCashFlows(): Promise<CashFlow[]> {
  return (await getAllData()).cashFlows
}

export async function getTransactions(): Promise<Transaction[]> {
  return (await getAllData()).transactions
}

// ============================================================
// Assets
// ============================================================

export async function upsertAsset(
  asset: Omit<Asset, 'id' | 'created_at'>
): Promise<Asset> {
  const res = await fetch('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
  const res = await fetch('/api/assets', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ============================================================
// Cash Flows
// ============================================================

export async function insertCashFlow(
  flow: Omit<CashFlow, 'id' | 'created_at'>
): Promise<CashFlow> {
  const res = await fetch('/api/cashflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flow),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ============================================================
// Transactions
// ============================================================

export async function insertTransaction(
  tx: Omit<Transaction, 'id' | 'created_at'>
): Promise<Transaction> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ============================================================
// Watchlist
// ============================================================

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch('/api/watchlist', { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function addToWatchlist(
  item: Omit<WatchlistItem, 'id' | 'created_at'>
): Promise<WatchlistItem> {
  const res = await fetch('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeFromWatchlist(id: string): Promise<void> {
  const res = await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

