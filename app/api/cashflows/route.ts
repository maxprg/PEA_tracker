import { NextResponse } from 'next/server'
import { getDb } from '@/lib/sqlite'
import { randomUUID } from 'crypto'

// POST /api/cashflows — insère un dépôt ou retrait
export async function POST(request: Request) {
  try {
    const { type, amount, date, notes } = await request.json()

    if (!type || amount == null || !date) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const db = await getDb()
    const id = randomUUID()

    await db.execute({
      sql: `INSERT INTO cash_flows (id, type, amount, date, notes) VALUES (?, ?, ?, ?, ?)`,
      args: [id, type, amount, date, notes ?? null]
    });

    const createdResult = await db.execute({
      sql: 'SELECT * FROM cash_flows WHERE id = ?',
      args: [id]
    });
    return NextResponse.json(createdResult.rows[0])
  } catch (err: any) {
    console.error('[/api/cashflows POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/cashflows?id=xxx
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const db = await getDb()
    const result = await db.execute({
      sql: 'DELETE FROM cash_flows WHERE id = ?',
      args: [id]
    });
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Flux introuvable' }, { status: 404 })
    }
    return NextResponse.json({ deleted: id })
  } catch (err: any) {
    console.error('[/api/cashflows DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
