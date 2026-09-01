// Script d'initialisation du capital historique
// Usage: node --input-type=module < scripts/init-capital.mjs

import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'pea.db')

const db = new Database(DB_PATH)

// ── 1. Lire l'état actuel ─────────────────────────────────────
const buys = db.prepare(`SELECT SUM(total_cost) as total FROM transactions WHERE type = 'BUY'`).get()
const sells = db.prepare(`SELECT SUM(total_cost) as total FROM transactions WHERE type = 'SELL'`).get()
const existingDeposits = db.prepare(`SELECT SUM(amount) as total FROM cash_flows WHERE type = 'DEPOSIT'`).get()
const existingWithdrawals = db.prepare(`SELECT SUM(amount) as total FROM cash_flows WHERE type = 'WITHDRAWAL'`).get()

const totalBuys = buys.total ?? 0
const totalSells = sells.total ?? 0
const totalDeps = existingDeposits.total ?? 0
const totalWith = existingWithdrawals.total ?? 0

console.log('=== État actuel ===')
console.log(`Total BUY    : ${totalBuys.toFixed(2)} €`)
console.log(`Total SELL   : ${totalSells.toFixed(2)} €`)
console.log(`Dépôts existants : ${totalDeps.toFixed(2)} €`)
console.log(`Solde actuel (avant ajout) : ${(totalDeps - totalWith - totalBuys + totalSells).toFixed(2)} €`)

// ── 2. Paramètres cibles ──────────────────────────────────────
const TARGET_DEPOSITED = 3500        // Total versé dans le PEA
const TARGET_CASH_BALANCE = 27.76   // Solde espèces souhaité

// ── 3. Calculer le dépôt principal ───────────────────────────
// cashBalance = dépôts - retraits - buys + sells
// → On veut: (dépôts + TARGET_DEPOSITED) - retraits - buys + sells = TARGET_CASH_BALANCE
// → Correction = TARGET_CASH_BALANCE - (totalDeps - totalWith - totalBuys + totalSells)

const currentBalance = totalDeps - totalWith - totalBuys + totalSells
const correctionNeeded = TARGET_CASH_BALANCE - currentBalance - TARGET_DEPOSITED

console.log('\n=== Calcul ===')
console.log(`Après dépôt de ${TARGET_DEPOSITED} €, solde = ${(currentBalance + TARGET_DEPOSITED).toFixed(2)} €`)
console.log(`Correction nécessaire : ${correctionNeeded.toFixed(2)} €`)

// ── 4. Insérer le dépôt historique ───────────────────────────
const depositId = randomUUID()
db.prepare(`
  INSERT INTO cash_flows (id, type, amount, date, notes)
  VALUES (?, 'DEPOSIT', ?, '2024-01-01', 'Capital initial — versement historique PEA')
`).run(depositId, TARGET_DEPOSITED)
console.log(`\n✅ Dépôt de ${TARGET_DEPOSITED} € inséré (id: ${depositId})`)

// ── 5. Correction si nécessaire ───────────────────────────────
if (Math.abs(correctionNeeded) > 0.005) {
  const corrType = correctionNeeded > 0 ? 'DEPOSIT' : 'WITHDRAWAL'
  const corrAmount = Math.abs(correctionNeeded)
  const corrId = randomUUID()
  db.prepare(`
    INSERT INTO cash_flows (id, type, amount, date, notes)
    VALUES (?, ?, ?, '2024-01-01', 'Ajustement de solde (arrondis / frais historiques)')
  `).run(corrId, corrType, corrAmount)
  console.log(`✅ ${corrType} de correction de ${corrAmount.toFixed(2)} € inséré`)
}

// ── 6. Vérification finale ────────────────────────────────────
const finalDeps = db.prepare(`SELECT SUM(amount) as t FROM cash_flows WHERE type = 'DEPOSIT'`).get()
const finalWith = db.prepare(`SELECT SUM(amount) as t FROM cash_flows WHERE type = 'WITHDRAWAL'`).get()
const finalBalance = (finalDeps.t ?? 0) - (finalWith.t ?? 0) - totalBuys + totalSells

console.log('\n=== Résultat final ===')
console.log(`Total déposé : ${(finalDeps.t ?? 0).toFixed(2)} €`)
console.log(`Solde espèces : ${finalBalance.toFixed(2)} € (cible : ${TARGET_CASH_BALANCE} €)`)
console.log('\n✅ Terminé ! Rechargez l\'app.')

db.close()

