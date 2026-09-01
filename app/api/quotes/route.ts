import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const tickers: string[] = body.tickers ?? []
    if (!tickers.length) return NextResponse.json({})

    const { default: YF } = await import('yahoo-finance2') as any
    const yf = new YF({ suppressNotices: ['yahooSurvey'] })

    const results = await Promise.allSettled(
      tickers.map(async (sym: string) => {
        const q = await yf.quote(sym)
        return {
          ticker: sym,
          price: q.regularMarketPrice ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          currency: q.currency ?? 'EUR',
        }
      })
    )

    const quotesMap: Record<string, { price: number; changePercent: number; currency: string }> = {}
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        quotesMap[tickers[i]] = result.value
      } else {
        console.warn(`[/api/quotes] Échec ${tickers[i]}:`, result.reason)
        quotesMap[tickers[i]] = { price: 0, changePercent: 0, currency: 'EUR' }
      }
    })

    return NextResponse.json(quotesMap)
  } catch (err) {
    console.error('[/api/quotes]', err)
    return NextResponse.json({ error: 'Erreur cours boursiers' }, { status: 500 })
  }
}
