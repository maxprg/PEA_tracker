'use client'

import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatEur } from '@/lib/finance'

type Props = {
  open: boolean
  currentPortfolioValue: number
  onClose: () => void
}

function simulate(monthly: number, years: number, annualRate: number, startCapital: number) {
  const monthlyRate = annualRate / 100 / 12
  const points = []
  let value = startCapital
  for (let m = 0; m <= years * 12; m++) {
    if (m > 0) value = value * (1 + monthlyRate) + monthly
    const invested = startCapital + monthly * m
    points.push({
      month: m,
      year: Math.round(m / 12),
      label: `An ${Math.round(m / 12)}`,
      value: Math.round(value),
      invested: Math.round(invested),
    })
  }
  return points.filter(p => p.month % 12 === 0)
}

function SimTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const v = payload.find((p: any) => p.dataKey === 'value')?.value ?? 0
  const i = payload.find((p: any) => p.dataKey === 'invested')?.value ?? 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1">
      <div className="font-semibold text-gray-700">{label}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
        Portefeuille : <span className="font-bold text-gray-900">{formatEur(v)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
        Investi : <span className="font-semibold text-gray-700">{formatEur(i)}</span>
      </div>
      <div className="text-emerald-600 font-semibold">Gains : +{formatEur(v - i)}</div>
    </div>
  )
}

export function SimulationModal({ open, currentPortfolioValue, onClose }: Props) {
  const [monthly, setMonthly] = useState(300)
  const [years, setYears] = useState(20)
  const [rate, setRate] = useState(7)
  const [startCapital, setStartCapital] = useState(Math.round(currentPortfolioValue))

  const data = useMemo(() => simulate(monthly, years, rate, startCapital), [monthly, years, rate, startCapital])
  const last = data[data.length - 1]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📈 Simulation d&apos;apport mensuel</h2>
            <p className="text-sm text-gray-400 mt-0.5">Projection avec intérêts composés</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b border-gray-100">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Apport mensuel</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={3000}
                step={50}
                value={monthly}
                onChange={e => setMonthly(+e.target.value)}
                className="flex-1 accent-blue-600"
              />
              <div className="flex items-center border border-gray-200 rounded-lg px-2 py-1 w-24">
                <input
                  type="number"
                  value={monthly}
                  onChange={e => setMonthly(Math.max(0, +e.target.value))}
                  className="w-full outline-none text-sm font-bold text-right"
                />
                <span className="text-gray-400 text-xs ml-1">€</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Rendement annuel</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={rate}
                onChange={e => setRate(+e.target.value)}
                className="flex-1 accent-emerald-600"
              />
              <div className="flex items-center border border-gray-200 rounded-lg px-2 py-1 w-20">
                <input
                  type="number"
                  value={rate}
                  onChange={e => setRate(Math.max(0.1, +e.target.value))}
                  className="w-full outline-none text-sm font-bold text-right"
                />
                <span className="text-gray-400 text-xs ml-1">%</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Durée</label>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 15, 20, 25, 30].map(y => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    years === y ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {y} ans
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Capital de départ</label>
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2">
              <input
                type="number"
                value={startCapital}
                onChange={e => setStartCapital(Math.max(0, +e.target.value))}
                className="w-full outline-none text-sm font-bold"
              />
              <span className="text-gray-400 text-xs">€</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 px-6 py-4" style={{ minHeight: 220 }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip content={<SimTooltip />} />
              <Area
                type="monotone"
                dataKey="invested"
                stroke="#d1d5db"
                strokeWidth={1.5}
                fill="#f3f4f6"
                name="Capital investi"
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#simGrad)"
                name="Valeur estimée"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats footer */}
        <div className="px-6 pb-6 grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="text-xs text-blue-400 mb-1">Valeur finale</div>
            <div className="font-bold text-blue-900 text-lg">{formatEur(last?.value ?? 0)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">Total investi</div>
            <div className="font-bold text-gray-900">{formatEur(last?.invested ?? 0)}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <div className="text-xs text-emerald-400 mb-1">Gains estimés</div>
            <div className="font-bold text-emerald-700">{formatEur((last?.value ?? 0) - (last?.invested ?? 0))}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <div className="text-xs text-emerald-400 mb-1">× multiplicateur</div>
            <div className="font-bold text-emerald-700">
              {last && last.invested > 0 ? (last.value / last.invested).toFixed(2) : '—'}×
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
