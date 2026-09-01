# PEA Tracker 📈

**PEA Tracker** is a modern, full-stack web application designed to help French investors track, analyze, and manage their **PEA (Plan d'Épargne en Actions)** portfolio. It provides real-time stock quotes, cash flow management, automated transaction logging, sector allocation breakdowns, and portfolio simulation capabilities.

---

## ✨ Features

- **📊 Comprehensive Portfolio Dashboard**
  - Live total portfolio value, capital invested, unrealized gains/losses, and performance percentages.
  - Interactive portfolio holdings table with real-time price updates.
  - Breakdown by asset category, geography, and industry sector.

- **💼 Cash Flow & Capital Management**
  - Track cash deposits, withdrawals, and available cash balance within your PEA account.
  - Automatic calculation of net invested capital vs. cash balance.

- **🔄 Transaction Tracking**
  - Record Buy and Sell transactions easily with fee calculations and automated average cost price (PRU) tracking.
  - Full history log for past transactions and cash movements.

- **📈 Price Charts & Asset Details**
  - View historical price charts and detailed metrics for individual assets.
  - Integrated search bar for stock and ETF lookup.

- **🎯 Watchlist & Portfolio Simulations**
  - Maintain a custom watchlist for potential investment opportunities.
  - Run simulations to forecast portfolio performance or prospective buys before committing capital.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database / Backend:** [Supabase](https://supabase.com/) (PostgreSQL) / SQLite (`better-sqlite3` for local storage)
- **Financial Data:** Custom API routes fetching financial market data and live quotes.

---

## 📁 Project Structure

```text
PEA_tracker/
├── app/                      # Next.js App Router pages and API routes
│   ├── api/                  # Backend endpoints
│   │   ├── assets/           # Portfolio holdings & asset details
│   │   ├── cashflows/        # Cash deposits and withdrawals
│   │   ├── history/          # Historical portfolio performance
│   │   ├── quotes/           # Live stock/ETF quotes
│   │   ├── search/           # Asset ticker lookup
│   │   ├── sector-data/      # Sector allocation metrics
│   │   ├── transactions/     # Buy / Sell records
│   │   └── watchlist/        # Watchlist management
│   ├── globals.css           # Global Tailwind CSS styles
│   ├── layout.tsx            # Main layout wrapper
│   └── page.tsx              # Main dashboard view
├── components/               # React UI components
│   ├── BuyModal.tsx          # Buy order modal
│   ├── CashFlowModal.tsx     # Deposit/Withdrawal modal
│   ├── GestionSuivi.tsx      # Portfolio tracking & management view
│   ├── MetricsHeader.tsx     # Portfolio summary metrics banner
│   ├── PortfolioTable.tsx    # Holdings table component
│   ├── PositionDetailsModal.tsx # Detailed view per position
│   ├── PriceChartModal.tsx   # Interactive price chart modal
│   ├── SearchBar.tsx         # Stock/ETF search component
│   ├── SellModal.tsx         # Sell order modal
│   ├── SimulationModal.tsx   # Investment simulation tools
│   └── WatchlistTab.tsx      # Watchlist tab view
├── lib/                      # Core backend utilities & database logic
│   ├── db.ts                 # Database abstraction layer
│   ├── finance.ts            # Financial calculation utilities (PRU, gains, percentages)
│   ├── sqlite.ts             # SQLite connection helper
│   └── supabase.ts           # Supabase client setup
├── scripts/                  # Utility scripts
│   ├── fix-capital.mjs       # Script to recalculate capital metrics
│   └── init-capital.mjs      # Database seed / initialization script
├── supabase/
│   └── schema.sql            # PostgreSQL database schema for Supabase
├── .env.local.example        # Sample environment variables configuration
├── next.config.ts            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript compiler settings
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your system:
- **Node.js** (v18.x or higher)
- **npm**, **pnpm**, or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/PEA_tracker.git
   cd PEA_tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and fill in your Supabase or database credentials:
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` and configure your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup:**
   - If using **Supabase**, run the SQL commands in `supabase/schema.sql` inside your Supabase SQL Editor.
   - If using **SQLite**, initialize the local database using the initialization script:
     ```bash
     node scripts/init-capital.mjs
     ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## 📜 Available Scripts

- `npm run dev` – Starts the development server.
- `npm run build` – Builds the production application.
- `npm run start` – Starts the production server after building.
- `npm run lint` – Runs Next.js linter checks.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).