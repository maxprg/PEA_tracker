import { NextResponse } from 'next/server'
import { getDb } from '@/lib/sqlite'
import { randomUUID } from 'crypto'

// POST /api/assets — upsert un actif (par ticker)
export async function POST(request: Request) {
  try {
    const { ticker, name, isin, category } = await request.json()
    if (!ticker || !name) {
      return NextResponse.json({ error: 'ticker et name sont requis' }, { status: 400 })
    }

    const db = await getDb()

    // Upsert : si le ticker existe déjà, on retourne l'existant
    const existingResult = await db.execute({
      sql: 'SELECT * FROM assets WHERE ticker = ?',
      args: [ticker]
    });
    const existing = existingResult.rows[0];
    if (existing) return NextResponse.json(existing)

    const id = randomUUID()
    await db.execute({
      sql: 'INSERT INTO assets (id, ticker, name, isin, category) VALUES (?, ?, ?, ?, ?)',
      args: [id, ticker, name, isin ?? null, category ?? 'Action/ETF']
    });

    const createdResult = await db.execute({
      sql: 'SELECT * FROM assets WHERE id = ?',
      args: [id]
    });
    return NextResponse.json(createdResult.rows[0])
  } catch (err: any) {
    console.error('[/api/assets POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/assets — met à jour les notes d'un actif
export async function PATCH(request: Request) {
  try {
    const { id, notes } = await request.json()
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const db = await getDb()
    await db.execute({
      sql: 'UPDATE assets SET notes = ? WHERE id = ?',
      args: [notes ?? null, id]
    });

    const updatedResult = await db.execute({
      sql: 'SELECT * FROM assets WHERE id = ?',
      args: [id]
    });
    const updated = updatedResult.rows[0];
    if (!updated) return NextResponse.json({ error: 'Actif introuvable' }, { status: 404 })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[/api/assets PATCH]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
