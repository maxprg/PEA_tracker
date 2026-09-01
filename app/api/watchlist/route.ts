import { NextResponse } from 'next/server'
import { getDb } from '@/lib/sqlite'
import { randomUUID } from 'crypto'

// GET /api/watchlist
export async function GET() {
  try {
    const db = getDb()
    const items = db.prepare('SELECT * FROM watchlist ORDER BY created_at DESC').all()
    return NextResponse.json(items)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/watchlist
export async function POST(request: Request) {
  try {
    const { ticker, name, target_price, notes } = await request.json()
    if (!ticker || !name) return NextResponse.json({ error: 'ticker et name requis' }, { status: 400 })
    const db = getDb()
    const id = randomUUID()
    db.prepare(`INSERT OR REPLACE INTO watchlist (id, ticker, name, target_price, notes) VALUES (?, ?, ?, ?, ?)`)
      .run(id, ticker.toUpperCase(), name, target_price ?? null, notes ?? null)
    const created = db.prepare('SELECT * FROM watchlist WHERE id = ?').get(id)
    return NextResponse.json(created)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/watchlist?id=xxx
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    const db = getDb()
    db.prepare('DELETE FROM watchlist WHERE id = ?').run(id)
    return NextResponse.json({ deleted: id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
