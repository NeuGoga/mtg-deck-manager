import { useState, useEffect, useMemo, useRef } from 'react'
import { Deck, HydratedCard } from '../types'

interface DeckCardsProps {
  activeDeck: Deck
  hydratedCards: HydratedCard[]
  updateActiveDeck: (updates: Partial<Deck>) => void
  onCardClick: (card: HydratedCard) => void
  setHoveredCard: (card: HydratedCard | null) => void
  searchQuery: string
  sortMethod: string
  viewMode: string
  groupMethod: string
  theme: any
}

const imageCache: Record<string, string> = {}

const QuantityInput = ({ quantity, onChange, theme, fontSize = '13px', width = '20px' }: any) => {
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
        if (!isNaN(parsed) && parsed >= 0) onChange(parsed)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      onClick={(e) => e.stopPropagation()}
      style={{
        width,
        textAlign: 'center',
        background: 'transparent',
        border: 'none',
        color: theme.text,
        outline: 'none',
        fontWeight: 'bold',
        fontSize,
        padding: 0,
        margin: 0
      }}
    />
  )
}

const ManaCost = ({ cost }: { cost: string }) => {
  if (!cost) return null
  const symbols = cost.match(/\{[^}]+\}/g) || []
  return (
    <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
      {symbols.map((sym, i) => {
        let bg = '#CCCCCC'
        if (sym.includes('W')) bg = '#F8E7B9'
        else if (sym.includes('U')) bg = '#B3CEEA'
        else if (sym.includes('B')) bg = '#A69F9D'
        else if (sym.includes('R')) bg = '#EB9F82'
        else if (sym.includes('G')) bg = '#C4D3CA'
        return (
          <div
            key={i}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: bg,
              color: 'black',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '9px',
              fontWeight: 'bold',
              border: '1px solid #333'
            }}
          >
            {sym.replace(/[{}]/g, '')}
          </div>
        )
      })}
    </div>
  )
}

const StackedCard = ({
  card,
  index,
  isLast,
  isSectionGroup,
  handleDragStart,
  onCardClick,
  setHoveredCard,
  setExactQuantity
}: any) => {
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimer = useRef<any>(null)

  const cardId = card.scryfall_id || card.id
  const [localImage, setLocalImage] = useState<string | null>(imageCache[cardId] || null)

  useEffect(() => {
    if (localImage) return

    let isMounted = true
    ;(window as any).api.getCardImage(cardId, card.imageUrl).then((img: string) => {
      if (img) {
        imageCache[cardId] = img
        if (isMounted) setLocalImage(img)
      }
    })

    return () => {
      isMounted = false
    }
  }, [cardId, card.imageUrl, localImage])

  const collapsedHeight = 46
  const expandedHeight = 380
  const isExpanded = isHovered || isLast

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      setIsHovered(true)
      setHoveredCard(card)
    }, 150)
  }

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setIsHovered(false)
    setHoveredCard(null)
  }

  return (
    <div
      draggable={isSectionGroup}
      onDragStart={(e) => handleDragStart(e, card.id, card.section)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onCardClick(card)}
      style={{
        position: 'relative',
        width: '100%',
        height: isExpanded ? `${expandedHeight}px` : `${collapsedHeight}px`,
        marginBottom: isExpanded ? '28px' : '0px',
        transition: 'height 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), margin-bottom 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        willChange: 'height, margin-bottom',
        transform: 'translateZ(0)',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: `url(${localImage || card.imageUrl})`,
        backgroundSize: '100% auto',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000000',
        borderRadius: '13px',
        boxShadow: '0 -2px 6px rgba(0,0,0,0.8)',
        cursor: 'pointer',
        marginTop: index === 0 ? '0' : '-4px',
        zIndex: isHovered ? 100 : index
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '42px',
          height: '42px',
          background: '#000000',
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          borderTopLeftRadius: '10px',
          zIndex: 2
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            width: '14px',
            height: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}
        >
          <QuantityInput
            quantity={card.quantity}
            onChange={(val: number) => setExactQuantity(card.id, card.section, val)}
            theme={{ text: 'white' }}
            fontSize="11px"
            width="14px"
          />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setExactQuantity(card.id, card.section, card.quantity + 1)
          }}
          style={{
            position: 'absolute',
            top: '1px',
            left: '16px',
            width: '14px',
            height: '14px',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: 0,
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            zIndex: 2
          }}
        >
          +
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setExactQuantity(card.id, card.section, card.quantity - 1)
          }}
          style={{
            position: 'absolute',
            top: '16px',
            left: '2px',
            width: '14px',
            height: '14px',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: 0,
            fontSize: '15px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            zIndex: 2
          }}
        >
          -
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.2s',
          zIndex: 2,
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}
      >
        <span
          style={{
            color: '#4ade80',
            fontWeight: '900',
            fontSize: '15px',
            letterSpacing: '0.5px',
            textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)'
          }}
        >
          ${card.prices?.usd || 'N/A'}
        </span>
      </div>
    </div>
  )
}

export default function DeckCards({
  activeDeck,
  hydratedCards,
  updateActiveDeck,
  onCardClick,
  setHoveredCard,
  searchQuery,
  sortMethod,
  viewMode,
  groupMethod,
  theme: t
}: DeckCardsProps) {
  const [newSectionName, setNewSectionName] = useState('')
  const isSectionGroup = groupMethod === 'section'

  const groups = useMemo(() => {
    let filtered = hydratedCards
    if (searchQuery.trim())
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

    filtered.sort((a, b) => {
      if (sortMethod === 'cmc_low') return a.cmc - b.cmc || a.name.localeCompare(b.name)
      if (sortMethod === 'cmc_high') return b.cmc - a.cmc || a.name.localeCompare(b.name)
      if (sortMethod === 'name_az') return a.name.localeCompare(b.name)
      if (sortMethod === 'name_za') return b.name.localeCompare(a.name)
      if (sortMethod === 'price_low')
        return parseFloat(a.prices?.usd || '0') - parseFloat(b.prices?.usd || '0')
      if (sortMethod === 'price_high')
        return parseFloat(b.prices?.usd || '0') - parseFloat(a.prices?.usd || '0')
      return 0
    })

    if (groupMethod === 'section') {
      return activeDeck.sections.map((name) => ({
        name,
        cards: filtered.filter((c) => c.section === name)
      }))
    } else if (groupMethod === 'type') {
      const typeMap: Record<string, HydratedCard[]> = {}
      filtered.forEach((c) => {
        let type = 'Other'
        const tl = c.type_line?.toLowerCase() || ''
        if (tl.includes('creature')) type = 'Creature'
        else if (tl.includes('land')) type = 'Land'
        else if (tl.includes('instant')) type = 'Instant'
        else if (tl.includes('sorcery')) type = 'Sorcery'
        else if (tl.includes('artifact')) type = 'Artifact'
        else if (tl.includes('enchantment')) type = 'Enchantment'
        else if (tl.includes('planeswalker')) type = 'Planeswalker'
        if (!typeMap[type]) typeMap[type] = []
        typeMap[type].push(c)
      })
      return Object.entries(typeMap).map(([name, cards]) => ({ name, cards }))
    } else if (groupMethod === 'cmc') {
      const cmcMap: Record<string, HydratedCard[]> = {}
      filtered.forEach((c) => {
        const cmc = Math.floor(c.cmc || 0)
        const key = cmc >= 6 ? '6+' : cmc.toString()
        if (!cmcMap[key]) cmcMap[key] = []
        cmcMap[key].push(c)
      })
      return Object.keys(cmcMap)
        .sort()
        .map((k) => ({ name: `Mana Value: ${k}`, cards: cmcMap[k] }))
    }
    return []
  }, [hydratedCards, activeDeck.sections, searchQuery, sortMethod, groupMethod])

  const handleDragStart = (e: React.DragEvent, cardId: string, currentSection: string) => {
    e.dataTransfer.setData('cardId', cardId)
    e.dataTransfer.setData('currentSection', currentSection)
  }

  const handleDrop = (e: React.DragEvent, targetSection: string) => {
    e.preventDefault()
    if (!isSectionGroup) return

    const cardId = e.dataTransfer.getData('cardId')
    const sourceSection = e.dataTransfer.getData('currentSection')
    if (sourceSection === targetSection) return

    const newCards = [...activeDeck.cards]
    const sourceIndex = newCards.findIndex((c) => c.id === cardId && c.section === sourceSection)
    if (sourceIndex === -1) return

    if (newCards[sourceIndex].quantity > 1) {
      newCards[sourceIndex] = {
        ...newCards[sourceIndex],
        quantity: newCards[sourceIndex].quantity - 1
      }
    } else {
      newCards.splice(sourceIndex, 1)
    }

    const targetIndex = newCards.findIndex((c) => c.id === cardId && c.section === targetSection)
    if (targetIndex !== -1) {
      newCards[targetIndex] = {
        ...newCards[targetIndex],
        quantity: newCards[targetIndex].quantity + 1
      }
    } else {
      newCards.push({ id: cardId, quantity: 1, section: targetSection })
    }
    updateActiveDeck({ cards: newCards })
  }

  const setExactQuantity = (cardId: string, section: string, amount: number) => {
    let newCards = [...activeDeck.cards]
    if (amount <= 0) newCards = newCards.filter((c) => !(c.id === cardId && c.section === section))
    else
      newCards = newCards.map((c) =>
        c.id === cardId && c.section === section ? { ...c, quantity: amount } : c
      )
    updateActiveDeck({ cards: newCards })
  }

  const columns: Array<typeof groups> = [[], [], [], []]
  const columnHeights = [0, 0, 0, 0]

  groups.forEach((group) => {
    const numUnique = group.cards.length
    let heightEstimate = 60
    if (numUnique > 0) {
      if (viewMode === 'stacks') {
        heightEstimate += (numUnique - 1) * 42 + 364 + 34
      } else {
        heightEstimate += numUnique * 36
      }
    }

    let shortestIndex = 0
    let minHeight = columnHeights[0]
    for (let i = 1; i < 4; i++) {
      if (columnHeights[i] < minHeight) {
        minHeight = columnHeights[i]
        shortestIndex = i
      }
    }

    columns[shortestIndex].push(group)
    columnHeights[shortestIndex] += heightEstimate + 20
  })

  let shortestForAdd = 0
  for (let i = 1; i < 4; i++) {
    if (columnHeights[i] < columnHeights[shortestForAdd]) {
      shortestForAdd = i
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        padding: '20px',
        gap: '20px',
        alignItems: 'flex-start',
        width: '100%',
        overflow: 'visible'
      }}
    >
      {columns.map((colGroups, colIndex) => (
        <div
          key={colIndex}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '30px',
            flex: 1,
            minWidth: 0
          }}
        >
          {colGroups.map((group) => {
            const count = group.cards.reduce((sum, c) => sum + c.quantity, 0)
            const value = group.cards.reduce(
              (sum, c) => sum + parseFloat(c.prices?.usd || '0') * c.quantity,
              0
            )

            return (
              <div
                key={group.name}
                onDragOver={(e) => isSectionGroup && e.preventDefault()}
                onDrop={(e) => isSectionGroup && handleDrop(e, group.name)}
                style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `2px solid ${t.border}`,
                    paddingBottom: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '15px', color: t.text }}>{group.name}</strong>
                    <span
                      style={{
                        fontSize: '11px',
                        backgroundColor: t.element,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        color: t.subText
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: t.success }}>${value.toFixed(2)}</span>
                </div>

                {viewMode === 'stacks' ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {group.cards.map((card, index) => (
                      <StackedCard
                        key={`${card.id}-${card.section}`}
                        card={card}
                        index={index}
                        isLast={index === group.cards.length - 1}
                        isSectionGroup={isSectionGroup}
                        handleDragStart={handleDragStart}
                        onCardClick={onCardClick}
                        setHoveredCard={setHoveredCard}
                        setExactQuantity={setExactQuantity}
                        t={t}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {group.cards.map((card) => (
                      <div
                        key={`${card.id}-${card.section}`}
                        draggable={isSectionGroup}
                        onDragStart={(e) => handleDragStart(e, card.id, card.section)}
                        onClick={() => onCardClick(card)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 8px',
                          backgroundColor: t.element,
                          borderRadius: '4px',
                          border: `1px solid ${t.border}`,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              background: t.inputBg,
                              border: `1px solid ${t.border}`,
                              borderRadius: '3px',
                              padding: '1px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                setExactQuantity(card.id, card.section, card.quantity - 1)
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                color: t.text,
                                cursor: 'pointer',
                                padding: '0 4px'
                              }}
                            >
                              -
                            </button>
                            <QuantityInput
                              quantity={card.quantity}
                              onChange={(val: number) =>
                                setExactQuantity(card.id, card.section, val)
                              }
                              theme={t}
                            />
                            <button
                              onClick={() =>
                                setExactQuantity(card.id, card.section, card.quantity + 1)
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                color: t.text,
                                cursor: 'pointer',
                                padding: '0 4px'
                              }}
                            >
                              +
                            </button>
                          </div>
                          <span
                            style={{
                              color: t.text,
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              maxWidth: '100px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {card.name}
                          </span>
                        </div>
                        <ManaCost cost={card.mana_cost} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {isSectionGroup && colIndex === shortestForAdd && (
            <div
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: 'transparent',
                border: `2px dashed ${t.border}`,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <span style={{ color: t.subText, fontSize: '13px', marginBottom: '10px' }}>
                + Add Category
              </span>
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g. Ramp"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSectionName.trim()) {
                    if (!activeDeck.sections.includes(newSectionName.trim()))
                      updateActiveDeck({
                        sections: [...activeDeck.sections, newSectionName.trim()]
                      })
                    setNewSectionName('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '5px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.inputBg,
                  color: t.text,
                  outline: 'none'
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
