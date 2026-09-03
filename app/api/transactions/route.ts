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

    const db = await getDb()
    const id = randomUUID()

    await db.execute({
      sql: `INSERT INTO transactions (id, asset_id, type, shares_count, unit_price, fee, total_cost, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, asset_id, type, shares_count, unit_price, fee ?? 0, total_cost, date]
    });

    const createdResult = await db.execute({
      sql: 'SELECT * FROM transactions WHERE id = ?',
      args: [id]
    });
    return NextResponse.json(createdResult.rows[0])
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

    const db = await getDb()
    const result = await db.execute({
      sql: 'DELETE FROM transactions WHERE id = ?',
      args: [id]
    });
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }
    return NextResponse.json({ deleted: id })
  } catch (err: any) {
    console.error('[/api/transactions DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
