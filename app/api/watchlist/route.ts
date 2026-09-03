import { NextResponse } from 'next/server'
import { getDb } from '@/lib/sqlite'
import { randomUUID } from 'crypto'

// GET /api/watchlist
export async function GET() {
  try {
    const db = await getDb()
    const items = (await db.execute('SELECT * FROM watchlist ORDER BY created_at DESC')).rows
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
    
    const db = await getDb()
    const id = randomUUID()
    
    await db.execute({
      sql: 'INSERT OR REPLACE INTO watchlist (id, ticker, name, target_price, notes) VALUES (?, ?, ?, ?, ?)',
      args: [id, ticker.toUpperCase(), name, target_price ?? null, notes ?? null]
    });
    
    const createdResult = await db.execute({
      sql: 'SELECT * FROM watchlist WHERE id = ?',
      args: [id]
    });
    return NextResponse.json(createdResult.rows[0])
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
    
    const db = await getDb()
    await db.execute({
      sql: 'DELETE FROM watchlist WHERE id = ?',
      args: [id]
    });
    
    return NextResponse.json({ deleted: id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
