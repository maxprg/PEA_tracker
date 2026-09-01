# 🚀 Spec & Plan d'Implémentation : PEA Tracker & Cashflow Hub

Application web Next.js permettant de suivre en direct un portefeuille PEA avec gestion du compte espèces, recherche dynamique d'actifs/ETF via API, passage d'ordres avec déduction automatique du cash, et calcul des métriques financières en temps réel.

---

## 🛠 1. Stack Technique
- **Framework :** Next.js 15 (App Router, TypeScript)
- **UI & Style :** Tailwind CSS, Lucide React, Shadcn/ui (Cards, Dialogs, Tables, Inputs, Command/Combobox)
- **Base de données :** Supabase (PostgreSQL)
- **API Bourse :** Yahoo Finance (`yahoo-finance2`) pour la recherche de tickers Euronext (`.PA`) et les cours en direct.

---

## 🗄 2. Schéma de Base de Données (Supabase SQL)

Exécuter ce script dans l'éditeur SQL de Supabase :

\`\`\`sql
-- 1. Table des actifs (ETF / Actions)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,       -- ex: "ESE.PA", "PAASI.PA", "MC.PA"
  name TEXT NOT NULL,                -- ex: "BNP Paribas Easy S&P 500"
  isin TEXT,                         -- ex: "FR0011550185"
  category TEXT DEFAULT 'Action/ETF',-- "US", "Europe", "Émergents", etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Table des mouvements d'espèces (Apports / Retraits bancaires)
CREATE TABLE IF NOT EXISTS cash_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Table des transactions boursières (Ordres d'achat / vente / dividendes)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
  shares_count NUMERIC(12, 4) NOT NULL, -- Supporte les décimales si besoin
  unit_price NUMERIC(12, 4) NOT NULL,
  fee NUMERIC(12, 2) DEFAULT 0.00,      -- Frais de courtage (ex: 0.50%)
  total_cost NUMERIC(12, 2) NOT NULL,   -- (shares * price) + fee
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
\`\`\`

---

## 📐 3. Logique Métier & Calculs Automatiques

1. **Calcul du Solde Espèces Disponible :**
   \`\`\`text
   Solde Espèces = (Total Dépôts - Total Retraits) 
                 - Somme(total_cost des achats BUY) 
                 + Somme(net_gain des ventes SELL) 
                 + Somme(dividendes)
   \`\`\`

2. **Achat par Montant Brut (ex: "J'ai acheté pour 300 €") :**
   - L'utilisateur entre soit le nombre de parts, soit le budget alloué (ex: 300 €).
   - L'app calcule : $\text{Parts} = \lfloor \frac{\text{Budget} - \text{Frais}}{\text{Cours actuel}} \rfloor$.
   - Déduction immédiate du compte espèces : $\text{Total Déduit} = (\text{Parts} \times \text{Prix unitaire}) + \text{Frais}$.
   - Le reliquat non dépensé reste automatiquement sur le compte espèces.
   - **Garde-fou :** Impossible de valider l'achat si $\text{Total Déduit} > \text{Solde Espèces}$.

3. **Prix de Revient Unitaire (PRU) par Ligne :**
   $$\text{PRU} = \frac{\sum (\text{Parts achetées} \times \text{Prix d'achat} + \text{Frais})}{\sum \text{Parts détenues}}$$

4. **Plus-Value Latente :**
   $$\text{PV (€)} = (\text{Cours actuel} - \text{PRU}) \times \text{Parts détenues}$$
   $$\text{PV (\%)} = \frac{\text{Cours actuel} - \text{PRU}}{\text{PRU}} \times 100$$

---

## 💻 4. Endpoints API (Next.js Route Handlers)

### A. `/api/search` (Recherche d'actions/ETF en direct)
\`\`\`typescript
// app/api/search/route.ts
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  if (!query) return NextResponse.json([]);

  try {
    const results = await yahooFinance.search(query);
    const filtered = results.quotes
      .filter((q: any) => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
      .map((q: any) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange,
      }));
    return NextResponse.json(filtered);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur recherche ticker' }, { status: 500 });
  }
}
\`\`\`

### B. `/api/quotes` (Récupération des cours en direct)
\`\`\`typescript
// app/api/quotes/route.ts
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function POST(request: Request) {
  try {
    const { tickers } = await request.json(); // Array de strings: ["ESE.PA", "ETZ.PA"]
    if (!tickers || !tickers.length) return NextResponse.json({});

    const quotes = await Promise.all(
      tickers.map(async (sym: string) => {
        const q = await yahooFinance.quote(sym);
        return {
          ticker: sym,
          price: q.regularMarketPrice,
          changePercent: q.regularMarketChangePercent,
          currency: q.currency,
        };
      })
    );
    return NextResponse.json(quotes);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur cours boursiers' }, { status: 500 });
  }
}
\`\`\`

---

## 🎨 5. Structure de l'Interface Utilisateur (UI)

1. **Header & Métriques Globales (4 cartes) :**
   - **Valeur Totale du PEA :** Valeur des titres + Solde espèces.
   - **Solde Espèces Disponible :** Avec bouton rapide « Déposer des fonds » (+).
   - **Total Injecté de ta poche :** Somme brute des virements externes.
   - **Plus-Value Globale :** Montant en € et % (vert/rouge) + TRI calculé.

2. **Barre d'Action Principale :**
   - **Combobox de Recherche Active :** Input avec autocomplétion pour chercher n'importe quel ETF/Action (ex: "S&P 500", "ESE", "LVMH").
   - Cliquer sur un résultat ouvre une modale pré-remplie : **« Enregistrer un achat »**.

3. **Modale d'Achat Intelligente :**
   - Saisie du montant en euros (ex: 300 €) OU du nombre de parts.
   - Calcul en direct des frais de courtage (0,50 % max).
   - Affichage de l'impact : *"Il restera X € sur votre solde espèces"*.
   - Bouton de confirmation désactivé si le solde espèces est insuffisant.

4. **Tableau des Lignes Détenues :**
   - Colonnes : Actif | Parts | PRU | Cours Actuel | Valeur Ligne | Poids (%) | Plus-Value (€ / %) | Actions (Acheter / Vendre).