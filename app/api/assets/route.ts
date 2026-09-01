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

    const db = getDb()

    // Upsert : si le ticker existe déjà, on retourne l'existant
    const existing = db.prepare('SELECT * FROM assets WHERE ticker = ?').get(ticker) as any
    if (existing) return NextResponse.json(existing)

    const id = randomUUID()
    db.prepare(
      'INSERT INTO assets (id, ticker, name, isin, category) VALUES (?, ?, ?, ?, ?)'
    ).run(id, ticker, name, isin ?? null, category ?? 'Action/ETF')

    const created = db.prepare('SELECT * FROM assets WHERE id = ?').get(id)
    return NextResponse.json(created)
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

    const db = getDb()
    db.prepare('UPDATE assets SET notes = ? WHERE id = ?').run(notes ?? null, id)

    const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(id)
    if (!updated) return NextResponse.json({ error: 'Actif introuvable' }, { status: 404 })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[/api/assets PATCH]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
