import { useState, useEffect } from 'react'
import { Deck } from './types'
import { THEMES } from './theme'
import Home from './components/Home'
import DeckBuilder from './components/DeckBuilder'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'editor' | 'settings'>('home')
  const [decks, setDecks] = useState<Deck[]>([])
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')
  const t = THEMES[themeMode]

  useEffect(() => {
    const init = async () => {
      const savedDecks = await (window as any).api.getDecks()
      setDecks(savedDecks)
      const savedTheme = localStorage.getItem('mtg-theme')
      if (savedTheme === 'light') setThemeMode('light')
    }
    init()
  }, [])

  useEffect(() => {
    localStorage.setItem('mtg-theme', themeMode)
  }, [themeMode])
  useEffect(() => {
    if (decks.length > 0) (window as any).api.saveDecks(decks)
  }, [decks])

  const createNewDeck = () => {
    const newDeck: Deck = {
      id: Date.now(),
      name: 'New Unnamed Deck',
      format: 'Modern',
      tags: [],
      cards: []
    }
    setDecks([...decks, newDeck])
    setActiveDeck(newDeck)
    setCurrentScreen('editor')
  }

  const updateActiveDeck = (updates: Partial<Deck>) => {
    if (!activeDeck) return
    const updated = { ...activeDeck, ...updates }
    setActiveDeck(updated)
    setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  const deleteDeck = (id: number) => {
    const updatedDecks = decks.filter((d) => d.id !== id)
    setDecks(updatedDecks)
    ;(window as any).api.saveDecks(updatedDecks)
    if (activeDeck?.id === id) {
      setActiveDeck(null)
      setCurrentScreen('home')
    }
  }

  const globalStyles = `
    html, body, #root { margin: 0; padding: 0; width: 100vw; height: 100vh; background: ${t.bg} !important; color: ${t.text} !important; overflow: hidden; font-family: Arial, sans-serif; }
    * { box-sizing: border-box; }
    h1, h2, h3, h4, h5, h6, span, p, div { color: inherit; } 
    ::-webkit-scrollbar { width: 10px; }
    ::-webkit-scrollbar-track { background: ${t.bg}; }
    ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 5px; }
    ::-webkit-scrollbar-thumb:hover { background: ${t.subText}; }

    @keyframes fadeOutToast {
      0% { opacity: 0; transform: translateY(10px); }
      10% { opacity: 1; transform: translateY(0); }
      80% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .spinner { animation: spin 1s linear infinite; }
  `

  if (currentScreen === 'settings') {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          padding: '30px',
          color: t.text,
          backgroundColor: t.bg
        }}
      >
        <style>{globalStyles}</style>
        <button
          onClick={() => setCurrentScreen('home')}
          style={{
            padding: '8px 15px',
            marginBottom: '20px',
            cursor: 'pointer',
            backgroundColor: t.element,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '5px'
          }}
        >
          ← Back
        </button>
        <h1>Settings</h1>
        <div
          style={{
            backgroundColor: t.panel,
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '400px',
            border: `1px solid ${t.border}`
          }}
        >
          <h3>Appearance</h3>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setThemeMode('dark')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: themeMode === 'dark' ? t.primary : t.element,
                color: themeMode === 'dark' ? 'white' : t.text,
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Dark Mode
            </button>
            <button
              onClick={() => setThemeMode('light')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: themeMode === 'light' ? t.primary : t.element,
                color: themeMode === 'light' ? 'white' : t.text,
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Light Mode
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{globalStyles}</style>

      {currentScreen === 'home' && (
        <Home
          decks={decks}
          theme={t}
          onCreateDeck={createNewDeck}
          onOpenDeck={(d) => {
            setActiveDeck(d)
            setCurrentScreen('editor')
          }}
          onOpenSettings={() => setCurrentScreen('settings')}
          onDeleteDeck={deleteDeck}
        />
      )}

      {currentScreen === 'editor' && activeDeck && (
        <DeckBuilder
          activeDeck={activeDeck}
          updateActiveDeck={updateActiveDeck}
          theme={t}
          onGoBack={() => setCurrentScreen('home')}
          onDeleteDeck={deleteDeck}
        />
      )}
    </>
  )
}
