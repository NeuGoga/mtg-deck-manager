import { useEffect, useState } from 'react'
import { Deck, HydratedCard } from '../types'

interface DeckHeaderProps {
  activeDeck: Deck
  updateActiveDeck: (updates: Partial<Deck>) => void
  hydratedCards: HydratedCard[]
  theme: any
  onGoBack: () => void
  onExportList: () => void
  onExportCode: () => void
  onDeleteDeck: (id: number) => void
  onReloadPrices: () => void
  isRefreshing: boolean
}

const formats = ['Standard', 'Pioneer', 'Modern', 'Legacy', 'Vintage', 'Commander', 'Pauper']

export default function DeckHeader({
  activeDeck,
  updateActiveDeck,
  hydratedCards,
  theme: t,
  onGoBack,
  onExportList,
  onExportCode,
  onDeleteDeck,
  onReloadPrices,
  isRefreshing
}: DeckHeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showLegality, setShowLegality] = useState(false)
  const [coverImg, setCoverImg] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    if (activeDeck.coverCardId && activeDeck.coverCardUrl) {
      ;(window as any).api
        .getCardImage(activeDeck.coverCardId, activeDeck.coverCardUrl)
        .then((img: string) => {
          if (isMounted && img) setCoverImg(img)
        })
    }
    return () => {
      isMounted = false
    }
  }, [activeDeck.coverCardId, activeDeck.coverCardUrl])

  const mainboardCards = hydratedCards
    .filter((c) => c.section.toLowerCase() !== 'sideboard')
    .reduce((sum, c) => sum + c.quantity, 0)
  const sideboardCards = hydratedCards
    .filter((c) => c.section.toLowerCase() === 'sideboard')
    .reduce((sum, c) => sum + c.quantity, 0)

  const totalCards = mainboardCards + sideboardCards
  const totalPrice = hydratedCards.reduce(
    (sum, c) => sum + parseFloat(c.prices?.usd || '0') * c.quantity,
    0
  )

  const checkLegality = () => {
    const isCommander = activeDeck.format.toLowerCase() === 'commander'
    const activeFormat = activeDeck.format.toLowerCase()
    const errors: string[] = []

    if (isCommander && mainboardCards !== 100)
      errors.push(`Commander requires exactly 100 mainboard cards (Has ${mainboardCards})`)
    else if (!isCommander && mainboardCards < 60)
      errors.push(`Minimum 60 mainboard cards required (Has ${mainboardCards})`)

    if (!isCommander && sideboardCards > 15)
      errors.push(`Sideboard limit is 15 cards (Has ${sideboardCards})`)

    const overLimitCards = new Set<string>()
    const bannedCards = new Set<string>()

    hydratedCards.forEach((card) => {
      const isBasicLand =
        card.type_line?.toLowerCase().includes('basic land') ||
        card.type_line?.toLowerCase().includes('basic snow land')
      const formatLimit = isCommander ? 1 : 4

      const totalInDeck = hydratedCards
        .filter((c) => c.id === card.id)
        .reduce((sum, c) => sum + c.quantity, 0)
      if (!isBasicLand && totalInDeck > formatLimit)
        overLimitCards.add(`Too many '${card.name}' (Max ${formatLimit})`)

      const legality = card.legalities?.[activeFormat]
      if (legality !== 'legal' && !(activeFormat === 'vintage' && legality === 'restricted')) {
        bannedCards.add(`'${card.name}' is illegal/banned`)
      }
    })

    if (overLimitCards.size > 0) errors.push(...Array.from(overLimitCards))
    if (bannedCards.size > 0) errors.push(...Array.from(bannedCards))

    return errors
  }

  const legalityErrors = checkLegality()
  const isLegal = legalityErrors.length === 0

  return (
    <div style={{ position: 'relative', backgroundColor: t.panel, borderRadius: '6px' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '6px' }}>
        {activeDeck.coverCardUrl && (
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '120%',
              height: '120%',
              backgroundImage: `url(${coverImg || activeDeck.coverCardUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 20%',
              filter: 'blur(20px)',
              zIndex: 0
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: t.panel,
            opacity: 0.85,
            zIndex: 1
          }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <button
          onClick={onGoBack}
          style={{
            position: 'absolute',
            top: '30px',
            right: '30px',
            padding: '6px 15px',
            cursor: 'pointer',
            backgroundColor: t.element,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            fontSize: '13px'
          }}
        >
          ← Back to Decks
        </button>

        <input
          value={activeDeck.name}
          onChange={(e) => updateActiveDeck({ name: e.target.value })}
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            padding: '0',
            backgroundColor: 'transparent',
            color: t.text,
            border: 'none',
            outline: 'none',
            width: '80%',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)'
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            color: t.text
          }}
        >
          <select
            value={activeDeck.format}
            onChange={(e) => updateActiveDeck({ format: e.target.value })}
            style={{
              padding: '4px 8px',
              backgroundColor: t.inputBg,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {formats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <span style={{ color: t.border }}>|</span>

          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowLegality(true)}
            onMouseLeave={() => setShowLegality(false)}
          >
            <span
              style={{
                color: isLegal ? t.success : t.danger,
                fontWeight: 'bold',
                cursor: isLegal ? 'default' : 'help',
                padding: '5px 0'
              }}
            >
              {isLegal ? '✓ Legal' : `✗ Not Legal (${legalityErrors.length} issues)`}
            </span>
            {showLegality && !isLegal && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '5px',
                  backgroundColor: t.panel,
                  border: `1px solid ${t.border}`,
                  borderRadius: '5px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                  padding: '15px',
                  zIndex: 100,
                  width: 'max-content',
                  maxWidth: '350px'
                }}
              >
                <strong style={{ color: t.danger, display: 'block', marginBottom: '8px' }}>
                  Format Violations:
                </strong>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '20px',
                    color: t.text,
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}
                >
                  {legalityErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            color: t.text
          }}
        >
          <span style={{ color: t.subText }}>Size:</span>
          <strong>{totalCards}</strong>
          <span style={{ color: t.border }}>|</span>
          <span style={{ color: t.subText }}>Est cost:</span>
          <strong style={{ color: t.success }}>${totalPrice.toFixed(2)}</strong>

          <button
            onClick={onReloadPrices}
            disabled={isRefreshing}
            style={{
              background: 'none',
              border: 'none',
              color: t.subText,
              cursor: 'pointer',
              fontSize: '16px',
              padding: 0,
              marginLeft: '-5px'
            }}
            title="Update Prices"
          >
            <span className={isRefreshing ? 'spinner' : ''} style={{ display: 'inline-block' }}>
              ↻
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: t.subText, fontSize: '14px', marginRight: '5px' }}>Tags:</span>
          {activeDeck.tags.length === 0 && (
            <span style={{ fontSize: '13px', color: t.subText, fontStyle: 'italic' }}>
              No deck tags
            </span>
          )}
          {activeDeck.tags.map((tag) => (
            <div
              key={tag}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: t.element,
                color: t.text,
                padding: '4px 10px',
                borderRadius: '15px',
                fontSize: '12px',
                border: `1px solid ${t.border}`
              }}
            >
              {tag}
              <button
                onClick={() =>
                  updateActiveDeck({ tags: activeDeck.tags.filter((tg) => tg !== tag) })
                }
                style={{
                  background: 'none',
                  border: 'none',
                  color: t.subText,
                  marginLeft: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: 0
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <input
            type="text"
            placeholder="+ Add tag..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                if (!activeDeck.tags.includes(e.currentTarget.value.trim())) {
                  updateActiveDeck({ tags: [...activeDeck.tags, e.currentTarget.value.trim()] })
                  e.currentTarget.value = ''
                }
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `1px dashed ${t.border}`,
              color: t.text,
              outline: 'none',
              fontSize: '13px',
              width: '120px',
              marginLeft: '5px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onExportList}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              backgroundColor: t.element,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '5px',
              fontWeight: 'bold'
            }}
          >
            Export as List
          </button>
          <button
            onClick={onExportCode}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              backgroundColor: t.element,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '5px',
              fontWeight: 'bold'
            }}
          >
            Export as Code
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: t.element,
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold'
              }}
            >
              ⋮
            </button>
            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '5px',
                  backgroundColor: t.panel,
                  border: `1px solid ${t.border}`,
                  borderRadius: '5px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                  zIndex: 100
                }}
              >
                <button
                  onClick={() => {
                    setShowMenu(false)
                    if (window.confirm(`Delete "${activeDeck.name}"?`)) onDeleteDeck(activeDeck.id)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    background: 'transparent',
                    border: 'none',
                    color: t.danger,
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Delete Deck
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
