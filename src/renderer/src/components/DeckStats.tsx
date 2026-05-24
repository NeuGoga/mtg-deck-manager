import { useState, useMemo } from 'react'
import { Deck, HydratedCard } from '../types'

interface DeckStatsProps {
  activeDeck: Deck
  hydratedCards: HydratedCard[]
  theme: any
}

const MANA_COLORS = [
  { key: 'W', name: 'White', color: '#fffbd5', icon: '☀️' },
  { key: 'U', name: 'Blue', color: '#aae0fa', icon: '💧' },
  { key: 'B', name: 'Black', color: '#a69f9d', icon: '💀' },
  { key: 'R', name: 'Red', color: '#f9aa8f', icon: '🔥' },
  { key: 'G', name: 'Green', color: '#9bd3ae', icon: '🌳' },
  { key: 'C', name: 'Colorless', color: '#cccccc', icon: '◇' }
]

function getCombinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  k = Math.min(k, n - k)
  let c = 1
  for (let i = 1; i <= k; i++) {
    c = (c * (n - i + 1)) / i
  }
  return c
}

function hypergeometricAtLeast(N: number, K: number, n: number, x: number): number {
  if (x <= 0) return 1
  if (K < x || n < x) return 0
  let probExactly = 0
  for (let i = 0; i < x; i++) {
    probExactly += (getCombinations(K, i) * getCombinations(N - K, n - i)) / getCombinations(N, n)
  }
  return 1 - probExactly
}

const getGroupKeys = (c: HydratedCard, criteria: string): string[] => {
  if (criteria === 'Categories') return [c.section || 'Unknown']
  if (criteria === 'Mana Value') {
    const cmc = Math.floor(c.cmc || 0)
    return [cmc >= 8 ? '8+' : cmc.toString()]
  }
  if (criteria === 'Types') {
    const tl = (c.type_line || '').toLowerCase()
    const res: string[] = []
    if (tl.includes('creature')) res.push('Creature')
    if (tl.includes('land')) res.push('Land')
    if (tl.includes('instant')) res.push('Instant')
    if (tl.includes('sorcery')) res.push('Sorcery')
    if (tl.includes('artifact')) res.push('Artifact')
    if (tl.includes('enchantment')) res.push('Enchantment')
    if (tl.includes('planeswalker')) res.push('Planeswalker')
    if (res.length === 0) res.push('Other')
    return res
  }
  if (criteria === 'Permanent / Non-Permanent') {
    const tl = (c.type_line || '').toLowerCase()
    if (tl.includes('instant') || tl.includes('sorcery')) return ['Non-Permanent']
    return ['Permanent']
  }
  if (criteria === 'Rarity') {
    const r = (c as any).rarity || 'common'
    return [r.charAt(0).toUpperCase() + r.slice(1)]
  }
  if (criteria === 'Power') return [(c as any).power || 'None']
  if (criteria === 'Toughness') return [(c as any).toughness || 'None']
  return ['Unknown']
}

const BarChart = ({
  data,
  color,
  height = '120px'
}: {
  data: number[]
  color: string
  height?: string
}) => {
  const max = Math.max(...data, 1)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        height,
        gap: '4px',
        width: '100%',
        paddingTop: '20px'
      }}
    >
      {data.map((val, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%'
          }}
        >
          <div style={{ flex: 1, position: 'relative', width: '100%' }}>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '10%',
                width: '80%',
                height: `${(val / max) * 100}%`,
                backgroundColor: color,
                borderRadius: '2px 2px 0 0',
                minHeight: val > 0 ? '2px' : '0'
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: `calc(${(val / max) * 100}% + 4px)`,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                color: '#aaa',
                opacity: val > 0 ? 1 : 0
              }}
            >
              {val}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#ccc', marginTop: '4px', fontWeight: 'bold' }}>
            {i === 8 ? '8+' : i}
          </span>
        </div>
      ))}
    </div>
  )
}

const StatManaCurve = ({
  mainboardCards,
  theme: t
}: {
  mainboardCards: HydratedCard[]
  theme: any
}) => {
  const [groupBy, setGroupBy] = useState('Types')
  const options = [
    'Color',
    'Permanent / Non-Permanent',
    'Categories',
    'Types',
    'Rarity',
    'Power',
    'Toughness'
  ]

  const curves = useMemo(() => {
    const overall = Array(9).fill(0)
    const grouped: Record<string, number[]> = {}

    mainboardCards.forEach((c) => {
      if (c.type_line?.toLowerCase().includes('land')) return
      const cmc = Math.min(Math.floor(c.cmc || 0), 8)
      overall[cmc] += c.quantity

      let keys: string[] = []
      if (groupBy === 'Color') {
        let colors = c.colors || []
        if (colors.length === 0) {
          const cost = c.mana_cost || ''
          const extracted = new Set<string>()
          const symbols = cost.match(/\{[^}]+\}/g) || []
          symbols.forEach((sym) => {
            if (sym.includes('W')) extracted.add('W')
            if (sym.includes('U')) extracted.add('U')
            if (sym.includes('B')) extracted.add('B')
            if (sym.includes('R')) extracted.add('R')
            if (sym.includes('G')) extracted.add('G')
          })
          colors = Array.from(extracted)
        }
        keys = colors.length ? colors : ['C']
      } else {
        keys = getGroupKeys(c, groupBy)
      }

      keys.forEach((k) => {
        if (!grouped[k]) grouped[k] = Array(9).fill(0)
        grouped[k][cmc] += c.quantity
      })
    })

    return { overall, grouped }
  }, [mainboardCards, groupBy])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <BarChart data={curves.overall} color="#f97316" height="140px" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: t.text }}>Mana curve by</span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          style={{
            padding: '8px',
            backgroundColor: t.inputBg,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            width: '100%',
            outline: 'none'
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '15px'
        }}
      >
        {groupBy === 'Color'
          ? MANA_COLORS.map((mc) => {
              const data = curves.grouped[mc.key] || Array(9).fill(0)
              const hasCards = data.some((v) => v > 0)
              return (
                <div
                  key={mc.key}
                  style={{
                    backgroundColor: '#1e1e1e',
                    padding: '15px',
                    borderRadius: '6px',
                    border: '1px solid #333',
                    opacity: hasCards ? 1 : 0.4
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px'
                    }}
                  >
                    <span>{mc.icon}</span>
                    <span style={{ color: '#eee', fontSize: '14px', fontWeight: 'bold' }}>
                      {mc.name} Spells
                    </span>
                  </div>
                  <BarChart data={data} color={mc.color} height="100px" />
                </div>
              )
            })
          : Object.keys(curves.grouped)
              .sort()
              .map((key) => (
                <div
                  key={key}
                  style={{
                    backgroundColor: '#1e1e1e',
                    padding: '15px',
                    borderRadius: '6px',
                    border: '1px solid #333'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px'
                    }}
                  >
                    <span style={{ color: '#eee', fontSize: '14px', fontWeight: 'bold' }}>
                      {key}
                    </span>
                  </div>
                  <BarChart data={curves.grouped[key]} color="#aae0fa" height="100px" />
                </div>
              ))}
      </div>
    </div>
  )
}

const StatColorDevotion = ({ mainboardCards }: { mainboardCards: HydratedCard[] }) => {
  const stats = useMemo(() => {
    const res = {
      pips: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, total: 0 },
      cardsP: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
      prod: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, total: 0 },
      cardsProd: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
    }

    mainboardCards.forEach((c) => {
      const q = c.quantity

      const cost = c.mana_cost || ''
      const w = (cost.match(/\{W\}/g) || []).length
      if (w) {
        res.pips.W += w * q
        res.cardsP.W += q
        res.pips.total += w * q
      }
      const u = (cost.match(/\{U\}/g) || []).length
      if (u) {
        res.pips.U += u * q
        res.cardsP.U += q
        res.pips.total += u * q
      }
      const b = (cost.match(/\{B\}/g) || []).length
      if (b) {
        res.pips.B += b * q
        res.cardsP.B += q
        res.pips.total += b * q
      }
      const r = (cost.match(/\{R\}/g) || []).length
      if (r) {
        res.pips.R += r * q
        res.cardsP.R += q
        res.pips.total += r * q
      }
      const g = (cost.match(/\{G\}/g) || []).length
      if (g) {
        res.pips.G += g * q
        res.cardsP.G += q
        res.pips.total += g * q
      }
      const cPip = (cost.match(/\{C\}/g) || []).length
      if (cPip) {
        res.pips.C += cPip * q
        res.cardsP.C += q
        res.pips.total += cPip * q
      }

      let prod = (c as any).produced_mana
      if (!prod || prod.length === 0) {
        prod = []
        const tl = (c.type_line || '').toLowerCase()
        if (tl.includes('plains')) prod.push('W')
        if (tl.includes('island')) prod.push('U')
        if (tl.includes('swamp')) prod.push('B')
        if (tl.includes('mountain')) prod.push('R')
        if (tl.includes('forest')) prod.push('G')

        if (prod.length === 0 && tl.includes('land')) {
          prod = (c as any).color_identity || []
        }

        if (prod.length === 0 && tl.includes('artifact')) {
          const ot = ((c as any).oracle_text || '').toLowerCase()
          if (ot.includes('add {c}')) prod.push('C')
          if (ot.includes('add {w}')) prod.push('W')
          if (ot.includes('add {u}')) prod.push('U')
          if (ot.includes('add {b}')) prod.push('B')
          if (ot.includes('add {r}')) prod.push('R')
          if (ot.includes('add {g}')) prod.push('G')
          if (ot.includes('add one mana of any color')) {
            prod.push('W', 'U', 'B', 'R', 'G')
          }
        }
      }

      if (prod.includes('W')) {
        res.prod.W += q
        res.cardsProd.W += q
        res.prod.total += q
      }
      if (prod.includes('U')) {
        res.prod.U += q
        res.cardsProd.U += q
        res.prod.total += q
      }
      if (prod.includes('B')) {
        res.prod.B += q
        res.cardsProd.B += q
        res.prod.total += q
      }
      if (prod.includes('R')) {
        res.prod.R += q
        res.cardsProd.R += q
        res.prod.total += q
      }
      if (prod.includes('G')) {
        res.prod.G += q
        res.cardsProd.G += q
        res.prod.total += q
      }
      if (prod.includes('C')) {
        res.prod.C += q
        res.cardsProd.C += q
        res.prod.total += q
      }
    })
    return res
  }, [mainboardCards])

  const renderColorBar = (data: Record<string, number>, total: number) => (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '24px',
        gap: '2px',
        backgroundColor: '#333',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {total === 0 ? (
        <div style={{ flex: 1, backgroundColor: '#444' }} />
      ) : (
        MANA_COLORS.map((mc) => {
          const val = data[mc.key]
          if (!val) return null
          const pct = (val / total) * 100
          return (
            <div
              key={mc.key}
              style={{
                width: `${pct}%`,
                backgroundColor: mc.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {pct >= 5 && (
                <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', fontWeight: 'bold' }}>
                  {mc.icon}
                </span>
              )}
            </div>
          )
        })
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ccc', marginBottom: '4px' }}>
          Cost
        </div>
        {renderColorBar(stats.pips, stats.pips.total)}
      </div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ccc', marginBottom: '4px' }}>
          Production
        </div>
        {renderColorBar(stats.prod, stats.prod.total)}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '15px',
          marginTop: '10px'
        }}
      >
        {MANA_COLORS.map((mc) => {
          const pipPct =
            stats.pips.total > 0
              ? Math.round((stats.pips[mc.key as keyof typeof stats.pips] / stats.pips.total) * 100)
              : 0
          const prodPct =
            stats.prod.total > 0
              ? Math.round((stats.prod[mc.key as keyof typeof stats.prod] / stats.prod.total) * 100)
              : 0

          return (
            <div
              key={mc.key}
              style={{
                backgroundColor: '#1e1e1e',
                padding: '20px',
                borderRadius: '6px',
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
              }}
            >
              <div style={{ textAlign: 'center', fontSize: '32px' }}>{mc.icon}</div>

              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#ccc',
                    fontWeight: 'bold',
                    marginBottom: '4px'
                  }}
                >
                  Cost
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '20px',
                      backgroundColor: '#333',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{ width: `${pipPct}%`, height: '100%', backgroundColor: mc.color }}
                    />
                  </div>
                  <span style={{ fontSize: '13px', color: '#fff', width: '35px' }}>{pipPct}%</span>
                </div>
                <div
                  style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginTop: '4px' }}
                >
                  {stats.pips[mc.key as keyof typeof stats.pips]} pips -{' '}
                  {stats.cardsP[mc.key as keyof typeof stats.cardsP]} cards
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#ccc',
                    fontWeight: 'bold',
                    marginBottom: '4px'
                  }}
                >
                  Production
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '20px',
                      backgroundColor: '#333',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{ width: `${prodPct}%`, height: '100%', backgroundColor: mc.color }}
                    />
                  </div>
                  <span style={{ fontSize: '13px', color: '#fff', width: '35px' }}>{prodPct}%</span>
                </div>
                <div
                  style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginTop: '4px' }}
                >
                  {stats.prod[mc.key as keyof typeof stats.prod]} mana -{' '}
                  {stats.cardsProd[mc.key as keyof typeof stats.cardsProd]} cards
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const StatDrawOdds = ({
  mainboardCards,
  theme: t
}: {
  mainboardCards: HydratedCard[]
  theme: any
}) => {
  const [drawn, setDrawn] = useState(7)
  const [target, setTarget] = useState(1)
  const [groupBy, setGroupBy] = useState('Types')

  const totalDeckSize = mainboardCards.reduce((acc, c) => acc + c.quantity, 0)
  const options = ['Categories', 'Types', 'Mana Value']

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    mainboardCards.forEach((c) => {
      const keys = getGroupKeys(c, groupBy)
      keys.forEach((k) => {
        counts[k] = (counts[k] || 0) + c.quantity
      })
    })
    return Object.entries(counts).sort((a, b) => {
      if (groupBy === 'Mana Value') {
        if (a[0] === '8+') return 1
        if (b[0] === '8+') return -1
        return parseInt(a[0]) - parseInt(b[0])
      }
      return a[0].localeCompare(b[0])
    })
  }, [mainboardCards, groupBy])

  return (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        padding: '20px',
        borderRadius: '6px',
        border: '1px solid #333'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          color: '#eee',
          fontSize: '14px'
        }}
      >
        <span>Probability of drawing</span>
        <select
          style={{
            padding: '6px',
            backgroundColor: t.inputBg,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            outline: 'none'
          }}
        >
          <option>At least</option>
        </select>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: '40px',
              padding: '6px',
              border: 'none',
              backgroundColor: t.inputBg,
              color: t.text,
              textAlign: 'center',
              outline: 'none'
            }}
          />
          <button
            onClick={() => setTarget((t) => Math.max(1, t - 1))}
            style={{
              padding: '6px 10px',
              background: '#333',
              color: '#f87171',
              border: 'none',
              borderLeft: `1px solid ${t.border}`,
              cursor: 'pointer'
            }}
          >
            -
          </button>
          <button
            onClick={() => setTarget((t) => t + 1)}
            style={{
              padding: '6px 10px',
              background: '#333',
              color: '#4ade80',
              border: 'none',
              borderLeft: `1px solid ${t.border}`,
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
        <span>card(s) by</span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          style={{
            padding: '6px',
            backgroundColor: t.inputBg,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            outline: 'none'
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span>having drawn</span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <input
            type="number"
            value={drawn}
            onChange={(e) => setDrawn(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: '40px',
              padding: '6px',
              border: 'none',
              backgroundColor: t.inputBg,
              color: t.text,
              textAlign: 'center',
              outline: 'none'
            }}
          />
          <button
            onClick={() => setDrawn((d) => Math.max(1, d - 1))}
            style={{
              padding: '6px 10px',
              background: '#333',
              color: '#f87171',
              border: 'none',
              borderLeft: `1px solid ${t.border}`,
              cursor: 'pointer'
            }}
          >
            -
          </button>
          <button
            onClick={() => setDrawn((d) => d + 1)}
            style={{
              padding: '6px 10px',
              background: '#333',
              color: '#4ade80',
              border: 'none',
              borderLeft: `1px solid ${t.border}`,
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
        <span>card(s)</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #444', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>{groupBy}</th>
            <th style={{ padding: '10px', textAlign: 'right', width: '60px' }}>Qty</th>
            <th style={{ padding: '10px', textAlign: 'right', width: '60px' }}>Odds</th>
          </tr>
        </thead>
        <tbody>
          {categoryCounts.map(([name, count], idx) => {
            const odds = Math.round(
              hypergeometricAtLeast(totalDeckSize, count, drawn, target) * 100
            )
            return (
              <tr
                key={name}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#2a2a2a' : 'transparent',
                  borderBottom: '1px solid #333'
                }}
              >
                <td style={{ padding: '10px' }}>{name}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{count}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{odds}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const StatDistribution = ({
  mainboardCards,
  theme: t
}: {
  mainboardCards: HydratedCard[]
  theme: any
}) => {
  const [groupBy, setGroupBy] = useState('Types')
  const options = ['Categories', 'Types', 'Mana Value']

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    mainboardCards.forEach((c) => {
      const keys = getGroupKeys(c, groupBy)
      keys.forEach((k) => {
        counts[k] = (counts[k] || 0) + c.quantity
      })
    })
    return Object.entries(counts).sort((a, b) => {
      if (groupBy === 'Mana Value') {
        if (a[0] === '8+') return 1
        if (b[0] === '8+') return -1
        return parseInt(a[0]) - parseInt(b[0])
      }
      return a[0].localeCompare(b[0])
    })
  }, [mainboardCards, groupBy])

  const max = Math.max(...categoryCounts.map((c) => c[1]), 1)

  return (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        padding: '20px',
        borderRadius: '6px',
        border: '1px solid #333'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#eee' }}>Quantity of</span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          style={{
            padding: '6px',
            backgroundColor: t.inputBg,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            width: '200px',
            outline: 'none'
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            height: '180px',
            gap: '8px',
            width: '100%',
            borderBottom: '1px solid #444'
          }}
        >
          {categoryCounts.map(([name, count]) => (
            <div
              key={`bar-${name}`}
              style={{
                flex: 1,
                position: 'relative',
                height: '100%'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80%',
                  maxWidth: '40px',
                  height: `${(count / max) * 100}%`,
                  backgroundColor: '#f97316',
                  borderRadius: '2px 2px 0 0',
                  minHeight: '2px'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: `calc(${(count / max) * 100}% + 4px)`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '11px',
                  color: '#ccc'
                }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            width: '100%',
            paddingTop: '10px'
          }}
        >
          {categoryCounts.map(([name]) => (
            <div
              key={`label-${name}`}
              style={{
                flex: 1,
                fontSize: '11px',
                color: '#eee',
                fontWeight: 'bold',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DeckStats({ hydratedCards, theme }: DeckStatsProps) {
  const [activeTab, setActiveTab] = useState('curve')

  const mainboardCards = useMemo(() => {
    return hydratedCards.filter((c) => c.section.toLowerCase() !== 'sideboard')
  }, [hydratedCards])

  const tabs = [
    { id: 'curve', label: 'Mana Curve' },
    { id: 'color', label: 'Color Devotion' },
    { id: 'draw', label: 'Draw Probability' },
    { id: 'distribution', label: 'Quantity Distribution' }
  ]

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: theme.panel,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, gap: '20px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === tab.id ? theme.text : theme.subText,
              padding: '10px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? `2px solid #f97316` : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: '10px' }}>
        {activeTab === 'curve' && <StatManaCurve mainboardCards={mainboardCards} theme={theme} />}
        {activeTab === 'color' && <StatColorDevotion mainboardCards={mainboardCards} />}
        {activeTab === 'draw' && <StatDrawOdds mainboardCards={mainboardCards} theme={theme} />}
        {activeTab === 'distribution' && (
          <StatDistribution mainboardCards={mainboardCards} theme={theme} />
        )}
      </div>
    </div>
  )
}
