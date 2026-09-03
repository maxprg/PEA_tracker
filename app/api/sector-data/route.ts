import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { tickers } = await request.json()
    if (!tickers?.length) return NextResponse.json({})

    const { default: YF } = await import('yahoo-finance2') as any
    const yf = new YF({ suppressNotices: ['yahooSurvey'] })

    const SMART_MAP: Record<string, { sector: string; country: string }> = {
      'CW8.PA': { sector: 'Monde', country: 'Monde' },
      'EWLD.PA': { sector: 'Monde', country: 'Monde' },
      'PE500.PA': { sector: 'S&P 500', country: 'États-Unis' },
      'ESE.PA': { sector: 'S&P 500', country: 'États-Unis' },
      'PSP5.PA': { sector: 'S&P 500', country: 'États-Unis' },
      'PAE.PA': { sector: 'Europe', country: 'Europe' },
      'PUST.PA': { sector: 'Tech', country: 'États-Unis' },
      'PAASI.PA': { sector: 'Marchés Émergents', country: 'Émergents' },
    }

    const results = await Promise.allSettled(
      tickers.map(async (ticker: string) => {
        try {
          if (SMART_MAP[ticker]) {
            return {
              ticker,
              sector: SMART_MAP[ticker].sector,
              industry: 'Fonds',
              country: SMART_MAP[ticker].country,
            }
          }

          // On demande assetProfile (actions) ET fundProfile (ETFs) ET price (pour identifier le type)
          const summary = await yf.quoteSummary(ticker, { modules: ['assetProfile', 'fundProfile', 'price'] })
          const quoteType = summary?.price?.quoteType
          const isETF = quoteType === 'ETF' || quoteType === 'MUTUALFUND'
          
          let sector = summary?.assetProfile?.sector
          let country = summary?.assetProfile?.country
          let industry = summary?.assetProfile?.industry

          // Si c'est un ETF ou un fonds, les données sectorielles classiques sont souvent vides
          if (isETF || summary?.fundProfile) {
            sector = summary?.fundProfile?.categoryName || 'ETF / Fonds Diversifié'
            industry = summary?.fundProfile?.familyName || 'Fonds'
            country = summary?.fundProfile?.categoryName?.includes('Europe') ? 'Europe' 
                    : summary?.fundProfile?.categoryName?.includes('US') ? 'États-Unis'
                    : summary?.fundProfile?.categoryName?.includes('World') || summary?.fundProfile?.categoryName?.includes('Global') ? 'Monde'
                    : 'Diversifié'
          }

          return {
            ticker,
            sector: sector || 'Autre',
            industry: industry || 'Autre',
            country: country || 'Inconnu',
          }
        } catch {
          return { ticker, sector: 'Autre', industry: 'Autre', country: 'Inconnu' }
        }
      })
    )

    const data: Record<string, { sector: string; industry: string; country: string }> = {}
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        data[r.value.ticker] = {
          sector: r.value.sector,
          industry: r.value.industry,
          country: r.value.country,
        }
      }
    })

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[/api/sector-data]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
