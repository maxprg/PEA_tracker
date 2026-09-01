import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, '..', 'data', 'pea.db'))

// 1. Supprimer toutes les corrections précédentes
const del = db.prepare("DELETE FROM cash_flows WHERE notes LIKE '%__CORRECTION__%'").run()
console.log(`🗑  Supprimé ${del.changes} correction(s) erronée(s)`)

// 2. Lire l'état réel
const buys = db.prepare("SELECT COALESCE(SUM(total_cost),0) as t FROM transactions WHERE type='BUY'").get().t
const realDeps = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM cash_flows WHERE type='DEPOSIT'").get().t
const withs = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM cash_flows WHERE type='WITHDRAWAL'").get().t

console.log(`\nAchats enregistrés  : ${buys.toFixed(2)} €`)
console.log(`Dépôts réels        : ${realDeps.toFixed(2)} €`)
console.log(`Solde actuel        : ${(realDeps - withs - buys).toFixed(2)} €`)

// 3. Correction pour atteindre exactement 27.76€
const TARGET = 27.76
const correction = TARGET - (realDeps - withs - buys)
console.log(`Correction nécessaire : ${correction.toFixed(4)} €`)

// 4. Insérer la correction
if (Math.abs(correction) > 0.001) {
  const type = correction >= 0 ? 'DEPOSIT' : 'WITHDRAWAL'
  const amount = Math.abs(correction)
  db.prepare("INSERT INTO cash_flows (id, type, amount, date, notes) VALUES (?, ?, ?, '2024-01-01', '__CORRECTION__ Ajustement historique')").run(randomUUID(), type, amount)
  console.log(`✅ ${type} de ${amount.toFixed(2)} € inséré`)
}

// 5. Vérification finale
const allDeps = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM cash_flows WHERE type='DEPOSIT'").get().t
const allWith = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM cash_flows WHERE type='WITHDRAWAL'").get().t
const finalBalance = allDeps - allWith - buys

console.log(`\n=== Résultat ===`)
console.log(`Total déposé (affiché) : ${realDeps.toFixed(2)} € (hors correction)`)
console.log(`Solde espèces          : ${finalBalance.toFixed(2)} €`)
console.log(Math.abs(finalBalance - TARGET) < 0.01 ? '✅ Correct !' : `❌ Écart: ${(finalBalance - TARGET).toFixed(4)}`)

db.close()

