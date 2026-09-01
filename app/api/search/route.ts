import { NextResponse } from 'next/server'
// yahoo-finance2 v4 is a class — use dynamic import to keep it server-only
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  if (!query || query.trim().length < 1) return NextResponse.json([])

  try {
    const { default: YF } = await import('yahoo-finance2') as any
    const yf = new YF({ suppressNotices: ['yahooSurvey'] })

    const results = await yf.search(query, { quotesCount: 10, newsCount: 0 })

    const filtered = (results.quotes ?? [])
      .filter((q: any) => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
      .map((q: any) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange ?? '',
        quoteType: q.quoteType,
      }))

    return NextResponse.json(filtered)
  } catch (err) {
    console.error('[/api/search]', err)
    return NextResponse.json({ error: 'Erreur recherche ticker' }, { status: 500 })
  }
}
