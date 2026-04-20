import { useState, useEffect, useRef } from 'react'
import { Deck } from '../types'
import DeckCard from './DeckCard'

interface HomeProps {
  decks: Deck[]
  theme: any
  onCreateDeck: () => void
  onOpenDeck: (deck: Deck) => void
  onOpenSettings: () => void
  onDeleteDeck: (id: number) => void
}

export default function Home({ decks, theme, onCreateDeck, onOpenDeck, onOpenSettings, onDeleteDeck }: HomeProps) {
  const [searchFilter, setSearchFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [animDir, setAnimDir] = useState<'next' | 'prev' | null>(null)
  
  const lastScrollTime = useRef(0)
  const itemsPerPage = 10 

  const filteredDecks = decks.filter(d => 
    d.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    d.tags.some(tag => tag.toLowerCase().includes(searchFilter.toLowerCase()))
  )

  const totalPages = Math.max(1, Math.ceil(filteredDecks.length / itemsPerPage))

  useEffect(() => { setCurrentPage(0) }, [searchFilter])

  const startIndex = currentPage * itemsPerPage
  const visibleDecks = filteredDecks.slice(startIndex, startIndex + itemsPerPage)

  const changePage = (dir: 'next' | 'prev') => {
    setAnimDir(dir)
    setCurrentPage(p => dir === 'next' ? p + 1 : p - 1)
  }

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now()
    if (now - lastScrollTime.current < 400) return 

    if (e.deltaY > 0 && currentPage < totalPages - 1) {
      lastScrollTime.current = now
      changePage('next')
    } else if (e.deltaY < 0 && currentPage > 0) {
      lastScrollTime.current = now
      changePage('prev')
    }
  }

  const ArrowButton = ({ direction, onClick, isHidden }: { direction: 'prev' | 'next', onClick: () => void, isHidden: boolean }) => (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: theme.text,
        fontSize: '60px',
        cursor: 'pointer',
        padding: '20px',
        transition: 'transform 0.2s',
        visibility: isHidden ? 'hidden' : 'visible' 
      }}
      onMouseEnter={e => !isHidden && (e.currentTarget.style.transform = 'scale(1.2)')}
      onMouseLeave={e => !isHidden && (e.currentTarget.style.transform = 'scale(1)')}
    >
      {direction === 'prev' ? '◀' : '▶'}
    </button>
  )

  const animationStyles = `
    @keyframes slideInFromRight { 0% { opacity: 0; transform: translateX(50px); } 100% { opacity: 1; transform: translateX(0); } }
    @keyframes slideInFromLeft { 0% { opacity: 0; transform: translateX(-50px); } 100% { opacity: 1; transform: translateX(0); } }
  `

  return (
    <div onWheel={handleWheel} style={{ height: '100vh', width: '100vw', padding: '30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{animationStyles}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: theme.text }}>My Collection</h1>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input 
            placeholder="Search by name or tag..." 
            value={searchFilter} 
            onChange={(e) => setSearchFilter(e.target.value)} 
            style={{ padding: '10px 15px', width: '250px', borderRadius: '5px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, outline: 'none' }} 
          />
          <button onClick={onCreateDeck} style={{ padding: '10px 20px', backgroundColor: theme.success, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Create Deck
          </button>
          <button 
            onClick={onOpenSettings} title="Settings"
            style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: theme.element, color: theme.text, border: `1px solid ${theme.border}`, cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.elementHover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = theme.element}
          >
            ⚙
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ArrowButton direction="prev" onClick={() => changePage('prev')} isHidden={currentPage === 0} />
        
        <div key={currentPage} style={{ width: '1020px', height: '560px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', animation: animDir === 'next' ? 'slideInFromRight 0.3s ease-out' : animDir === 'prev' ? 'slideInFromLeft 0.3s ease-out' : 'none' }}>
          {visibleDecks.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridAutoRows: 'max-content', gap: '20px', padding: '10px' }}>
              {visibleDecks.map((deck) => (
                <DeckCard key={deck.id} deck={deck} theme={theme} onClick={() => onOpenDeck(deck)} onDelete={onDeleteDeck} />
              ))}
            </div>
          ) : (
            <div style={{ width: '100%', textAlign: 'center', color: theme.subText, fontSize: '20px', marginTop: '100px' }}>No decks found.</div>
          )}
        </div>

        <ArrowButton direction="next" onClick={() => changePage('next')} isHidden={currentPage >= totalPages - 1} />
      </div>

      <div style={{ textAlign: 'center', color: theme.subText, fontSize: '14px', paddingBottom: '10px' }}>
        Page {currentPage + 1} of {totalPages}
      </div>
    </div>
  )
}