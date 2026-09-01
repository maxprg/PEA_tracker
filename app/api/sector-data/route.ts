import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { tickers } = await request.json()
    if (!tickers?.length) return NextResponse.json({})

    const { default: YF } = await import('yahoo-finance2') as any
    const yf = new YF({ suppressNotices: ['yahooSurvey'] })

    const results = await Promise.allSettled(
      tickers.map(async (ticker: string) => {
        try {
          const summary = await yf.quoteSummary(ticker, { modules: ['assetProfile', 'summaryDetail'] })
          const profile = summary?.assetProfile
          return {
            ticker,
            sector: profile?.sector ?? 'Autre',
            industry: profile?.industry ?? 'Autre',
            country: profile?.country ?? 'Inconnu',
          }
        } catch {
          return { ticker, sector: 'Autre', industry: 'Autre', country: 'Inconnu' }
        }
      })
    )

    const data: Record<string, { sector: string; industry: string; country: string }> = {}
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        data[r.value.ticker] = { sector: r.value.sector, industry: r.value.industry, country: r.value.country }
      }
    })

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[/api/sector-data]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
