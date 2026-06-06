import { useState, useEffect } from 'react'
import { Deck } from '../types'

interface DeckCardProps {
  deck: Deck
  onClick: () => void
  onDelete: (id: number) => void
  theme: any
}

export default function DeckCard({ deck, onClick, onDelete, theme }: DeckCardProps) {
  const [coverImg, setCoverImg] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (deck.coverCardId && deck.coverCardUrl) {
      ;(window as any).api.getCardImage(deck.coverCardId, deck.coverCardUrl).then((img: string) => {
        if (isMounted) setCoverImg(img)
      })
    }
    return () => {
      isMounted = false
    }
  }, [deck.coverCardId, deck.coverCardUrl])

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {
        setIsHovered(true)
        e.currentTarget.style.transform = 'translateY(-5px) translateZ(0)'
        e.currentTarget.style.boxShadow = `0 12px 20px rgba(0,0,0,0.6)`
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        e.currentTarget.style.transform = 'translateY(0) translateZ(0)'
        e.currentTarget.style.boxShadow = `0 8px 16px rgba(0,0,0,0.4)`
      }}
      style={{
        width: '180px',
        height: '260px',
        backgroundColor: theme.panel,
        borderRadius: '10px',
        cursor: 'pointer',
        border: `7px solid ${theme.cardBorder}`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
        transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        willChange: 'height, margin-bottom',
        transform: 'translateZ(0)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm(`Are you sure you want to delete "${deck.name}"?`)) {
              onDelete(deck.id)
            }
          }}
          style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: theme.danger,
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold',
            lineHeight: '22px',
            textAlign: 'center',
            padding: 0,
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
          title="Delete Deck"
        >
          ✕
        </button>
      )}

      <div
        style={{
          height: '100px',
          width: '100%',
          backgroundColor: theme.inputBg,
          borderBottom: `2px solid ${theme.cardBorder}`,
          overflow: 'hidden'
        }}
      >
        {coverImg ? (
          <img
            src={coverImg}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 20%',
              transform: 'scale(1.22)'
            }}
            alt="Cover"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: theme.subText,
              fontSize: '11px'
            }}
          >
            No Cover Image
          </div>
        )}
      </div>

      <div
        style={{
          height: '32px',
          backgroundColor: theme.element,
          borderBottom: `2px solid ${theme.cardBorder}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          fontWeight: 'bold',
          fontSize: '13px',
          color: theme.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {deck.name}
      </div>

      <div
        style={{
          flex: 1,
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.panel
        }}
      >
        <div
          style={{
            fontSize: '11px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            color: theme.text
          }}
        >
          <span>
            <strong>{deck.format}</strong>
          </span>
          <span style={{ color: theme.subText }}>
            {deck.cards.reduce((sum, c) => sum + c.quantity, 0)} Cards
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: 'auto' }}>
          {deck.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '9px',
                backgroundColor: theme.element,
                color: theme.text,
                padding: '4px 6px',
                borderRadius: '10px',
                border: `1px solid ${theme.border}`
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
