import { NextResponse } from 'next/server'

const PERIODS: Record<string, { days: number; interval: string }> = {
  '1M':  { days: 30,   interval: '1d' },
  '3M':  { days: 90,   interval: '1d' },
  '6M':  { days: 180,  interval: '1d' },
  '1Y':  { days: 365,  interval: '1d' },
  '3Y':  { days: 1095, interval: '1wk' },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')
  const period = searchParams.get('period') ?? '1Y'

  if (!ticker) return NextResponse.json({ error: 'ticker requis' }, { status: 400 })

  const cfg = PERIODS[period] ?? PERIODS['1Y']
  const period1 = new Date(Date.now() - cfg.days * 24 * 60 * 60 * 1000)

  try {
    const { default: YF } = await import('yahoo-finance2') as any
    const yf = new YF({ suppressNotices: ['yahooSurvey'] })

    const chart = await yf.chart(ticker, {
      period1,
      interval: cfg.interval,
    })

    const quotes = (chart.quotes ?? [])
      .filter((q: any) => q.close != null)
      .map((q: any) => ({
        date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
        close: Math.round(q.close * 100) / 100,
      }))

    return NextResponse.json({ quotes, currency: chart.meta?.currency ?? 'EUR' })
  } catch (err) {
    console.error('[/api/history]', err)
    return NextResponse.json({ error: 'Erreur historique de prix' }, { status: 500 })
  }
}

