import { useState, useEffect, useMemo } from 'react'
import { Deck, CardData, HydratedCard } from '../types'
import DeckHeader from './DeckHeader'
import DeckToolbar from './DeckToolbar'
import DeckCards from './DeckCards'
import CardModal from './CardModal'
import DeckStats from './DeckStats'

interface DeckBuilderProps {
  activeDeck: Deck
  updateActiveDeck: (updates: Partial<Deck>) => void
  theme: any
  onGoBack: () => void
  onDeleteDeck: (id: number) => void
}

export default function DeckBuilder({
  activeDeck,
  updateActiveDeck,
  theme: t,
  onGoBack,
  onDeleteDeck
}: DeckBuilderProps) {
  const [cardMap, setCardMap] = useState<Record<string, CardData>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMethod, setSortMethod] = useState('cmc_low')
  const [viewMode, setViewMode] = useState('stacks')
  const [groupMethod, setGroupMethod] = useState('section')

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [_hoveredCard, setHoveredCard] = useState<HydratedCard | null>(null)
  const [selectedCard, setSelectedCard] = useState<HydratedCard | null>(null)

  const [importText, setImportText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])

  useEffect(() => {
    const fetchMissing = async () => {
      const missingIds = activeDeck.cards.filter((c) => !cardMap[c.id]).map((c) => c.id)
      if (missingIds.length > 0) {
        const newCardData = await (window as any).api.hydrateCards(missingIds)
        setCardMap((prev) => ({ ...prev, ...newCardData }))
      }
    }
    fetchMissing()
  }, [activeDeck.cards, cardMap])

  const hydratedCards: HydratedCard[] = useMemo(() => {
    return activeDeck.cards.filter((c) => cardMap[c.id]).map((c) => ({ ...cardMap[c.id], ...c }))
  }, [activeDeck.cards, cardMap])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
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

  const handleImport = async () => {
    let parsedText = importText.trim()
    if (!parsedText) return

    setIsImporting(true)
    setImportErrors([])

    if (!parsedText.includes(' ') && parsedText.length > 10) {
      parsedText = await decodeAndDecompress(parsedText)
    }

    let lines = parsedText.split('\n')
    if (parsedText.includes('|') && !parsedText.includes('\n')) {
      lines = parsedText.split('|').filter(Boolean)
    }

    const newCards = [...activeDeck.cards]
    const newSections = new Set(activeDeck.sections)
    const failedCards: string[] = []

    let currentSection = activeDeck.sections[0] || 'Mainboard'
    newSections.add(currentSection)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const match = trimmed.match(/^(\d+)[xX]?\s+(.+)$/)

      if (match) {
        const quantity = parseInt(match[1])
        const cardName = match[2].trim()

        const result = await (window as any).api.getCardData(cardName)

        if (result.success) {
          const cardData = result.data as CardData
          setCardMap((prev) => ({ ...prev, [cardData.name]: cardData }))

          const existing = newCards.findIndex(
            (c) => c.id === cardData.name && c.section === currentSection
          )
          if (existing !== -1) {
            newCards[existing].quantity += quantity
          } else {
            newCards.push({ id: cardData.name, quantity, section: currentSection })
          }
        } else {
          failedCards.push(cardName)
        }
      } else {
        currentSection = trimmed
        newSections.add(currentSection)
      }
    }

    if (failedCards.length > 0) setImportErrors(failedCards)

    updateActiveDeck({ cards: newCards, sections: Array.from(newSections) })
    setImportText('')
    setIsImporting(false)
  }

  const handleExportList = async () => {
    let lines: string[] = []
    activeDeck.sections.forEach((section) => {
      const sectionCards = hydratedCards.filter((c) => c.section === section)
      if (sectionCards.length === 0) return
      lines.push(section)
      sectionCards.forEach((c) => lines.push(`${c.quantity} ${c.name}`))
      lines.push('')
    })
    await navigator.clipboard.writeText(lines.join('\n').trim())
    showToast('Decklist copied to clipboard!')
  }

  const handleExportCode = async () => {
    const stream = new Blob([
      activeDeck.cards.map((c) => `${c.quantity}${c.section}|${c.id}`).join('\n')
    ])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw'))
    const buffer = await new Response(stream).arrayBuffer()
    await navigator.clipboard.writeText(btoa(String.fromCharCode(...new Uint8Array(buffer))))
    showToast('Deck Code copied!')
  }

  const handleReloadPrices = async () => {
    setIsRefreshing(true)
    const uniqueIds = Array.from(new Set(activeDeck.cards.map((c) => c.id)))
    for (const id of uniqueIds) {
      const cardName = cardMap[id]?.name
      if (!cardName) continue
      const result = await (window as any).api.getCardData(cardName, true)
      if (result.success) setCardMap((prev) => ({ ...prev, [id]: result.data }))
    }
    setIsRefreshing(false)
    showToast('Prices updated!')
  }

  const setExactQuantity = (cardId: string, section: string, amount: number) => {
    let newCards = [...activeDeck.cards]
    if (amount <= 0) newCards = newCards.filter((c) => !(c.id === cardId && c.section === section))
    else
      newCards = newCards.map((c) =>
        c.id === cardId && c.section === section ? { ...c, quantity: amount } : c
      )
    updateActiveDeck({ cards: newCards })
    if (selectedCard)
      setSelectedCard(hydratedCards.find((c) => c.id === cardId && c.section === section) || null)
  }

  const moveCardSection = (
    cardId: string,
    oldSection: string,
    newSection: string,
    amount: number
  ) => {
    if (oldSection === newSection) return
    const newCards = [...activeDeck.cards]
    const sourceIndex = newCards.findIndex((c) => c.id === cardId && c.section === oldSection)
    if (sourceIndex > -1) newCards.splice(sourceIndex, 1)

    const targetIndex = newCards.findIndex((c) => c.id === cardId && c.section === newSection)
    if (targetIndex > -1) newCards[targetIndex].quantity += amount
    else newCards.push({ id: cardId, quantity: amount, section: newSection })

    updateActiveDeck({ cards: newCards })
    setSelectedCard(null)
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: t.bg,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
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
            pointerEvents: 'none'
          }}
        >
          {toastMessage}
        </div>
      )}

      {selectedCard && (
        <CardModal
          card={selectedCard}
          sections={activeDeck.sections}
          theme={t}
          onClose={() => setSelectedCard(null)}
          onUpdateQuantity={setExactQuantity}
          onMoveCard={moveCardSection}
          onSetCover={(id, url) => {
            updateActiveDeck({ coverCardId: id, coverCardUrl: url })
            showToast('Deck cover updated!')
          }}
        />
      )}

      <div
        style={{
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div
          style={{
            borderRadius: '6px',
            border: `1px solid ${t.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}
        >
          <DeckHeader
            activeDeck={activeDeck}
            updateActiveDeck={updateActiveDeck}
            hydratedCards={hydratedCards}
            theme={t}
            onGoBack={onGoBack}
            onExportList={handleExportList}
            onExportCode={handleExportCode}
            onDeleteDeck={onDeleteDeck}
            onReloadPrices={handleReloadPrices}
            isRefreshing={isRefreshing}
          />
        </div>

        <div
          style={{
            borderRadius: '6px',
            border: `1px solid ${t.border}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backgroundColor: t.panel
          }}
        >
          <DeckToolbar
            theme={t}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortMethod={sortMethod}
            setSortMethod={setSortMethod}
            viewMode={viewMode}
            setViewMode={setViewMode}
            groupMethod={groupMethod}
            setGroupMethod={setGroupMethod}
            onImportClick={() => setShowImportModal(true)}
          />
        </div>

        <div
          style={{
            borderRadius: '6px',
            border: `1px solid ${t.border}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backgroundColor: t.panel
          }}
        >
          <DeckCards
            activeDeck={activeDeck}
            hydratedCards={hydratedCards}
            updateActiveDeck={updateActiveDeck}
            setHoveredCard={setHoveredCard}
            onCardClick={setSelectedCard}
            searchQuery={searchQuery}
            sortMethod={sortMethod}
            viewMode={viewMode}
            groupMethod={groupMethod}
            theme={t}
          />
        </div>
        <div
          style={{
            borderRadius: '6px',
            border: `1px solid ${t.border}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backgroundColor: t.panel
          }}
        >
          <DeckStats 
            activeDeck={activeDeck} 
            hydratedCards={hydratedCards} 
            theme={t} 
          />
        </div>
      </div>

      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              backgroundColor: t.panel,
              padding: '25px',
              borderRadius: '10px',
              width: '500px',
              border: `1px solid ${t.border}`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}
            >
              <h2 style={{ margin: 0, color: t.text }}>Import Cards</h2>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: t.subText,
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: t.subText, fontSize: '13px', marginBottom: '15px' }}>
              Paste your decklist here. Use names for sections (e.g., "Mainboard", "Creatures").
            </p>

            <textarea
              placeholder="Creatures&#10;4 Goblin Guide&#10;4 Monastery Swiftspear&#10;&#10;Instants&#10;4 Lightning Bolt"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{
                width: '100%',
                height: '200px',
                padding: '15px',
                borderRadius: '5px',
                backgroundColor: t.inputBg,
                color: t.text,
                border: `1px solid ${t.border}`,
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <button
              onClick={handleImport}
              disabled={isImporting}
              style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: t.primary,
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: 'bold'
              }}
            >
              {isImporting ? 'Importing Cards...' : 'Import List'}
            </button>

            {importErrors.length > 0 && (
              <div
                style={{
                  marginTop: '15px',
                  padding: '15px',
                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                  border: `1px solid ${t.danger}`,
                  borderRadius: '5px'
                }}
              >
                <strong style={{ color: t.danger, fontSize: '13px' }}>
                  Could not find these cards:
                </strong>
                <ul
                  style={{
                    margin: '5px 0 0 0',
                    paddingLeft: '20px',
                    color: t.danger,
                    fontSize: '12px'
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
      )}
    </div>
  )
}
