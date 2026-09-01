-- =============================================
-- PEA Tracker & Cashflow Hub — Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Table des actifs (ETF / Actions)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,        -- ex: "ESE.PA", "PAASI.PA", "MC.PA"
  name TEXT NOT NULL,                 -- ex: "BNP Paribas Easy S&P 500"
  isin TEXT,                          -- ex: "FR0011550185"
  category TEXT DEFAULT 'Action/ETF', -- "US", "Europe", "Émergents", etc.
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
  shares_count NUMERIC(12, 4) NOT NULL, -- Supporte les fractions si besoin
  unit_price NUMERIC(12, 4) NOT NULL,
  fee NUMERIC(12, 2) DEFAULT 0.00,      -- Frais de courtage (ex: 0.50%)
  total_cost NUMERIC(12, 2) NOT NULL,   -- (shares * price) + fee pour BUY, (shares * price) - fee pour SELL
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Indexes pour les performances
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_cash_flows_type ON cash_flows(type);
CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON cash_flows(date);

