// src/components/DeckBuilder.tsx
import { useState, useEffect, useMemo } from 'react'
import { Deck, CardData } from '../types'

interface DeckBuilderProps {
  activeDeck: Deck
  updateActiveDeck: (updates: Partial<Deck>) => void
  theme: any
  onGoBack: () => void
  onDeleteDeck: (id: number) => void
}

const formats = ['Standard', 'Pioneer', 'Modern', 'Legacy', 'Vintage', 'Commander', 'Pauper']

const QuantityInput = ({ quantity, onChange, onRemove, theme }: any) => {
  const [val, setVal] = useState(quantity.toString())
  useEffect(() => {
    setVal(quantity.toString())
  }, [quantity])

  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const parsed = parseInt(val)
        if (isNaN(parsed) || parsed <= 0) onRemove()
        else onChange(parsed)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      style={{
        width: '24px',
        textAlign: 'center',
        background: 'transparent',
        border: 'none',
        color: theme.text,
        outline: 'none',
        fontWeight: 'bold',
        fontSize: '15px'
      }}
    />
  )
}

const ManaCost = ({ cost }: { cost: string }) => {
  if (!cost) return null
  const symbols = cost.match(/\{[^}]+\}/g) || []
  const getColor = (sym: string) => {
    if (sym.includes('W')) return '#F8E7B9'
    if (sym.includes('U')) return '#B3CEEA'
    if (sym.includes('B')) return '#A69F9D'
    if (sym.includes('R')) return '#EB9F82'
    if (sym.includes('G')) return '#C4D3CA'
    return '#CCCCCC'
  }
  return (
    <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
      {symbols.map((sym, i) => (
        <div
          key={i}
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: getColor(sym),
            color: 'black',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            border: '1px solid #333'
          }}
        >
          {sym.replace(/[{}]/g, '')}
        </div>
      ))}
    </div>
  )
}

const ManaCurve = ({ cards, theme }: { cards: CardData[]; theme: any }) => {
  const curve = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    cards.forEach((c) => {
      if (
        c.type_line?.toLowerCase().includes('land') &&
        !c.type_line?.toLowerCase().includes('creature')
      )
        return
      const cmc = Math.min(Math.floor(c.cmc || 0), 6)
      counts[cmc] += c.quantity
    })
    return counts
  }, [cards])
  const max = Math.max(...curve, 1)

  return (
    <div
      style={{
        display: 'flex',
        gap: '5px',
        height: '160px',
        flexShrink: 0,
        marginTop: '20px',
        backgroundColor: theme.element,
        padding: '15px',
        borderRadius: '10px'
      }}
    >
      {curve.map((count, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1,
            height: '100%'
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
            <div
              style={{
                width: '100%',
                height: `${(count / max) * 100}%`,
                backgroundColor: theme.primary,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s'
              }}
            />
          </div>
          <span style={{ fontSize: '12px', marginTop: '5px', color: theme.text }}>
            {i === 6 ? '6+' : i}
          </span>
          <span style={{ fontSize: '10px', color: theme.subText }}>{count}</span>
        </div>
      ))}
    </div>
  )
}

export default function DeckBuilder({
  activeDeck,
  updateActiveDeck,
  theme: t,
  onGoBack,
  onDeleteDeck
}: DeckBuilderProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'sideboard'>('main')

  const [importText, setImportText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const [hoveredCard, setHoveredCard] = useState<CardData | null>(null)
  const [hoverImage, setHoverImage] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const mainCards = activeDeck.cards || []
  const sideCards = activeDeck.sideboard || []

  useEffect(() => {
    let isMounted = true
    if (hoveredCard) {
      setHoverImage(null)
      ;(window as any).api
        .getCardImage(hoveredCard.id, hoveredCard.imageUrl)
        .then((img: string) => {
          if (isMounted) setHoverImage(img)
        })
    }
    return () => {
      isMounted = false
    }
  }, [hoveredCard])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const compressAndEncode = async (text: string) => {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))
    const buffer = await new Response(stream).arrayBuffer()
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
  }

  const decodeAndDecompress = async (base64: string) => {
    try {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      return await new Response(stream).text()
    } catch (e) {
      try {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
        return await new Response(stream).text()
      } catch (e2) {
        return decodeURIComponent(atob(base64))
      }
    }
  }

  const handleExportText = async () => {
    let text = mainCards.map((c) => `${c.quantity} ${c.name}`).join('\n')
    if (sideCards.length > 0) {
      text += '\nSideboard\n' + sideCards.map((c) => `${c.quantity} ${c.name}`).join('\n')
    }
    await navigator.clipboard.writeText(text)
    showToast('Decklist copied to clipboard!')
  }

  const handleExportCode = async () => {
    const encodeBoard = (cards: CardData[]) => cards.map((c) => `${c.quantity}${c.name}`).join('|')
    let compactText = encodeBoard(mainCards)
    if (sideCards.length > 0) compactText += '||' + encodeBoard(sideCards)

    const compressed = await compressAndEncode(compactText)
    await navigator.clipboard.writeText(compressed)
    showToast('Deck Code copied!')
  }

  const handleImport = async () => {
    let parsedText = importText.trim()
    if (!parsedText) return

    setIsImporting(true)
    setImportErrors([])

    if (!parsedText.includes(' ') && parsedText.length > 10) {
      parsedText = await decodeAndDecompress(parsedText)
    }

    let lines: string[] = []
    if (parsedText.includes('|')) {
      const parts = parsedText.split('||')
      if (parts[0]) lines.push(...parts[0].split('|'))
      if (parts[1]) {
        lines.push('Sideboard')
        lines.push(...parts[1].split('|'))
      }
    } else {
      lines = parsedText.split('\n')
    }

    const mainImported: CardData[] = []
    const sideImported: CardData[] = []
    const failedCards: string[] = []

    let currentTarget: 'main' | 'sideboard' = activeTab

    for (const line of lines) {
      if (line.trim().toLowerCase() === 'sideboard') {
        currentTarget = 'sideboard'
        continue
      }

      const match = line.trim().match(/^(\d+)\s*(.+)$/)
      if (match) {
        const quantity = parseInt(match[1])
        const cardName = match[2].trim()

        const result = await (window as any).api.getCardData(cardName)

        if (result.success) {
          if (currentTarget === 'main') mainImported.push({ ...result.data, quantity })
          else sideImported.push({ ...result.data, quantity })
        } else {
          failedCards.push(cardName)
        }
      }
    }

    if (failedCards.length > 0) setImportErrors(failedCards)

    const newMainCards = [...mainCards]
    for (const card of mainImported) {
      const existing = newMainCards.findIndex(
        (c) => c.name.toLowerCase() === card.name.toLowerCase()
      )
      if (existing !== -1)
        newMainCards[existing] = {
          ...newMainCards[existing],
          quantity: newMainCards[existing].quantity + card.quantity
        }
      else newMainCards.push(card)
    }

    const newSideCards = [...sideCards]
    for (const card of sideImported) {
      const existing = newSideCards.findIndex(
        (c) => c.name.toLowerCase() === card.name.toLowerCase()
      )
      if (existing !== -1)
        newSideCards[existing] = {
          ...newSideCards[existing],
          quantity: newSideCards[existing].quantity + card.quantity
        }
      else newSideCards.push(card)
    }

    updateActiveDeck({ cards: newMainCards, sideboard: newSideCards })
    setImportText('')
    setIsImporting(false)
  }

  const handleReloadPrices = async () => {
    setIsRefreshing(true)
    const updatedMain = [...mainCards]
    const updatedSide = [...sideCards]

    for (let i = 0; i < updatedMain.length; i++) {
      const result = await (window as any).api.getCardData(updatedMain[i].name, true)
      if (result.success) updatedMain[i] = { ...updatedMain[i], prices: result.data.prices }
    }

    for (let i = 0; i < updatedSide.length; i++) {
      const result = await (window as any).api.getCardData(updatedSide[i].name, true)
      if (result.success) updatedSide[i] = { ...updatedSide[i], prices: result.data.prices }
    }

    updateActiveDeck({ cards: updatedMain, sideboard: updatedSide })
    setIsRefreshing(false)
    showToast('Prices updated!')
  }

  const setExactQuantity = (card: CardData, amount: number, board: 'main' | 'sideboard') => {
    if (amount <= 0) {
      removeCard(card, board)
      return
    }
    const list = board === 'main' ? mainCards : sideCards
    const newCards = list.map((c) => (c.id === card.id ? { ...c, quantity: amount } : c))

    if (board === 'main') updateActiveDeck({ cards: newCards })
    else updateActiveDeck({ sideboard: newCards })
  }

  const removeCard = (card: CardData, board: 'main' | 'sideboard') => {
    const list = board === 'main' ? mainCards : sideCards
    const newCards = list.filter((c) => c.id !== card.id)

    if (board === 'main') updateActiveDeck({ cards: newCards })
    else updateActiveDeck({ sideboard: newCards })
  }

  const mainCount = mainCards.reduce((sum, c) => sum + c.quantity, 0)
  const sideCount = sideCards.reduce((sum, c) => sum + c.quantity, 0)

  const mainPrice = mainCards.reduce(
    (sum, card) => sum + parseFloat(card.prices?.usd || '0') * card.quantity,
    0
  )
  const sidePrice = sideCards.reduce(
    (sum, card) => sum + parseFloat(card.prices?.usd || '0') * card.quantity,
    0
  )

  const currentList = activeTab === 'main' ? mainCards : sideCards
  const sortedCards = [...currentList].sort((a, b) => {
    if (a.cmc !== b.cmc) return a.cmc - b.cmc
    return a.name.localeCompare(b.name)
  })

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        padding: '20px',
        boxSizing: 'border-box',
        display: 'flex',
        gap: '20px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: t.success,
            color: 'white',
            padding: '12px 24px',
            borderRadius: '30px',
            fontWeight: 'bold',
            fontSize: '14px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            animation: 'fadeOutToast 2.5s forwards'
          }}
        >
          {toastMessage}
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          paddingRight: '10px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            onClick={onGoBack}
            style={{
              padding: '8px 15px',
              cursor: 'pointer',
              backgroundColor: t.element,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '5px'
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${activeDeck.name}"?`)) onDeleteDeck(activeDeck.id)
            }}
            style={{
              padding: '8px 15px',
              cursor: 'pointer',
              backgroundColor: t.danger,
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            🗑 Delete Deck
          </button>
        </div>

        <input
          value={activeDeck.name}
          onChange={(e) => updateActiveDeck({ name: e.target.value })}
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '10px',
            backgroundColor: t.panel,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '5px',
            width: '100%'
          }}
        />

        <div style={{ marginTop: '20px' }}>
          <label
            style={{ fontSize: '14px', color: t.subText, display: 'block', marginBottom: '5px' }}
          >
            Format
          </label>
          <select
            value={activeDeck.format}
            onChange={(e) => updateActiveDeck({ format: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: t.inputBg,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '5px'
            }}
          >
            {formats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label
            style={{ fontSize: '14px', color: t.subText, display: 'block', marginBottom: '5px' }}
          >
            Tags
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '10px',
              backgroundColor: t.inputBg,
              border: `1px solid ${t.border}`,
              borderRadius: '5px',
              minHeight: '40px',
              alignItems: 'center'
            }}
          >
            {activeDeck.tags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: t.primary,
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '15px',
                  fontSize: '13px'
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
                    color: 'rgba(255,255,255,0.7)',
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
              placeholder="Add tag..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.trim()
                  if (val && !activeDeck.tags.includes(val)) {
                    updateActiveDeck({ tags: [...activeDeck.tags, val] })
                    e.currentTarget.value = ''
                  }
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: t.text,
                outline: 'none',
                fontSize: '14px',
                flex: 1,
                minWidth: '80px'
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            backgroundColor: t.panel,
            padding: '15px',
            borderRadius: '10px',
            border: `1px solid ${t.border}`
          }}
        >
          <h3 style={{ margin: '0 0 15px 0' }}>Import / Export</h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={handleExportText}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: t.element,
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Export as List
            </button>
            <button
              onClick={handleExportCode}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: t.element,
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Export as Code
            </button>
          </div>

          <p style={{ fontSize: '12px', color: t.subText, margin: '0 0 5px 0' }}>
            Paste text or Base64 Deck Code here:
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            style={{
              width: '100%',
              height: '100px',
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: t.inputBg,
              color: t.text,
              border: `1px solid ${t.border}`,
              resize: 'none'
            }}
          />
          <button
            onClick={handleImport}
            disabled={isImporting}
            style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: t.primary,
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            {isImporting ? (
              <span className="spinner" style={{ display: 'inline-block' }}>
                ⟳
              </span>
            ) : (
              `Import to ${activeTab === 'main' ? 'Mainboard' : 'Sideboard'}`
            )}
          </button>

          {importErrors.length > 0 && (
            <div
              style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                border: `1px solid ${t.danger}`,
                borderRadius: '5px'
              }}
            >
              <strong style={{ color: t.danger, fontSize: '14px' }}>
                Could not find these cards:
              </strong>
              <ul
                style={{
                  margin: '5px 0 0 0',
                  paddingLeft: '20px',
                  color: t.danger,
                  fontSize: '13px'
                }}
              >
                {importErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1.5,
          backgroundColor: t.panel,
          padding: '20px',
          borderRadius: '10px',
          overflowY: 'auto',
          border: `1px solid ${t.border}`
        }}
      >
        <h3 style={{ marginTop: 0, display: 'flex', gap: '15px', fontSize: '20px' }}>
          <span
            onClick={() => setActiveTab('main')}
            style={{
              cursor: 'pointer',
              color: activeTab === 'main' ? t.text : t.subText,
              textDecoration: activeTab === 'main' ? 'underline' : 'none',
              textUnderlineOffset: '5px'
            }}
          >
            Decklist
          </span>
          <span style={{ color: t.border }}>/</span>
          <span
            onClick={() => setActiveTab('sideboard')}
            style={{
              cursor: 'pointer',
              color: activeTab === 'sideboard' ? t.text : t.subText,
              textDecoration: activeTab === 'sideboard' ? 'underline' : 'none',
              textUnderlineOffset: '5px'
            }}
          >
            Sideboard
          </span>
        </h3>

        {sortedCards.length === 0 && (
          <p style={{ color: t.subText }}>No cards in {activeTab} yet.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedCards.map((card) => {
            const formatLimit = activeDeck.format.toLowerCase() === 'commander' ? 1 : 4
            const isBasicLand =
              card.type_line?.toLowerCase().includes('basic land') ||
              card.type_line?.toLowerCase().includes('basic snow land')

            const totalInDeck =
              (mainCards.find((c) => c.name === card.name)?.quantity || 0) +
              (sideCards.find((c) => c.name === card.name)?.quantity || 0)
            const overLimit = !isBasicLand && totalInDeck > formatLimit

            const activeFormat = activeDeck.format.toLowerCase() || 'standard'
            const isIllegal =
              card.legalities?.[activeFormat] !== 'legal' &&
              !(activeFormat === 'vintage' && card.legalities?.['vintage'] === 'restricted')
            const hasWarning = isIllegal || overLimit

            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredCard(card)}
                style={{
                  padding: '10px',
                  backgroundColor: t.element,
                  borderRadius: '5px',
                  border: hasWarning ? `1px solid ${t.danger}` : `1px solid transparent`,
                  boxShadow: hasWarning ? `0 0 5px rgba(220, 53, 69, 0.3)` : 'none'
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: '5px',
                        background: t.inputBg,
                        border: `1px solid ${t.border}`,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        alignItems: 'center'
                      }}
                    >
                      <button
                        onClick={() => setExactQuantity(card, card.quantity - 1, activeTab)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: t.subText,
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        -
                      </button>
                      <QuantityInput
                        quantity={card.quantity}
                        onChange={(val: number) => setExactQuantity(card, val, activeTab)}
                        onRemove={() => removeCard(card, activeTab)}
                        theme={t}
                      />
                      <button
                        onClick={() => setExactQuantity(card, card.quantity + 1, activeTab)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: t.subText,
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        +
                      </button>
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{card.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <ManaCost cost={card.mana_cost} />
                    <span
                      style={{
                        color: t.success,
                        width: '50px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      {card.prices?.usd ? `$${card.prices.usd}` : 'N/A'}
                    </span>
                  </div>
                </div>
                {hasWarning && (
                  <div
                    style={{
                      color: t.danger,
                      fontSize: '12px',
                      marginTop: '8px',
                      paddingLeft: '5px'
                    }}
                  >
                    {isIllegal ? `• Not legal in ${activeDeck.format}. ` : ''}
                    {overLimit ? `• Max ${formatLimit} allowed (Main+Side).` : ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1.2,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          paddingRight: '5px'
        }}
      >
        <div
          style={{
            flex: 1,
            maxHeight: '420px',
            minHeight: '320px',
            backgroundColor: t.panel,
            border: `1px solid ${t.border}`,
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            padding: '10px',
            paddingBottom: '20px',
            position: 'relative'
          }}
        >
          {hoverImage ? (
            <>
              <img
                src={hoverImage}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: '10px',
                  objectFit: 'contain'
                }}
              />

              {hoveredCard && (
                <button
                  onClick={() =>
                    updateActiveDeck({
                      coverCardId: hoveredCard.id,
                      coverCardUrl: hoveredCard.imageUrl
                    })
                  }
                  style={{
                    position: 'absolute',
                    bottom: '5px',
                    padding: '8px 15px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    border: `1px solid #555`,
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    backdropFilter: 'blur(4px)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)')}
                >
                  Set as Deck Cover
                </button>
              )}
            </>
          ) : (
            <p style={{ color: t.subText }}>Hover a card to preview</p>
          )}
        </div>

        <ManaCurve cards={mainCards} theme={t} />

        <div
          style={{
            marginTop: '15px',
            backgroundColor: t.panel,
            border: `1px solid ${t.border}`,
            padding: '15px',
            borderRadius: '10px'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Deck Stats</h3>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              marginBottom: '4px'
            }}
          >
            <span style={{ color: t.subText }}>Mainboard</span>
            <strong>{mainCount}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              marginBottom: '4px'
            }}
          >
            <span style={{ color: t.subText }}>Sideboard</span>
            <strong>{sideCount}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              marginBottom: '12px',
              borderTop: `1px solid ${t.border}`,
              paddingTop: '4px'
            }}
          >
            <span style={{ color: t.subText }}>Total Cards</span>
            <strong>{mainCount + sideCount}</strong>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              marginBottom: '4px'
            }}
          >
            <span style={{ color: t.subText }}>Mainboard Value</span>
            <strong style={{ color: t.success }}>${mainPrice.toFixed(2)}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              marginBottom: '4px'
            }}
          >
            <span style={{ color: t.subText }}>Sideboard Value</span>
            <strong style={{ color: t.success }}>${sidePrice.toFixed(2)}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '16px',
              alignItems: 'center',
              borderTop: `1px solid ${t.border}`,
              paddingTop: '6px'
            }}
          >
            <span style={{ color: t.subText }}>Total Value</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ color: t.success }}>${(mainPrice + sidePrice).toFixed(2)}</strong>
              <button
                onClick={handleReloadPrices}
                disabled={isRefreshing}
                style={{
                  background: 'none',
                  border: 'none',
                  color: t.text,
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: 0
                }}
              >
                <span className={isRefreshing ? 'spinner' : ''} style={{ display: 'inline-block' }}>
                  ↻
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
