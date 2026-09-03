export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/sqlite'

// GET /api/data — retourne assets, cash_flows, transactions
export async function GET() {
  try {
    const db = await getDb()
    const assets = (await db.execute('SELECT * FROM assets ORDER BY created_at DESC')).rows
    const cashFlows = (await db.execute('SELECT * FROM cash_flows ORDER BY date DESC')).rows
    const transactions = (await db.execute('SELECT * FROM transactions ORDER BY date DESC')).rows
    return NextResponse.json({ assets, cashFlows, transactions })
  } catch (err: any) {
    console.error('[/api/data GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
