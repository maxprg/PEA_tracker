import { NextResponse } from 'next/server'
import { getDb } from '@/lib/sqlite'
import { randomUUID } from 'crypto'

// POST /api/transactions — insère une transaction BUY / SELL / DIVIDEND
export async function POST(request: Request) {
  try {
    const { asset_id, type, shares_count, unit_price, fee, total_cost, date } =
      await request.json()

    if (!asset_id || !type || shares_count == null || unit_price == null || total_cost == null) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const db = getDb()
    const id = randomUUID()

    db.prepare(
      `INSERT INTO transactions (id, asset_id, type, shares_count, unit_price, fee, total_cost, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, asset_id, type, shares_count, unit_price, fee ?? 0, total_cost, date)

    const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id)
    return NextResponse.json(created)
  } catch (err: any) {
    console.error('[/api/transactions POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/transactions?id=xxx
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const db = getDb()
    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }
    return NextResponse.json({ deleted: id })
  } catch (err: any) {
    console.error('[/api/transactions DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
