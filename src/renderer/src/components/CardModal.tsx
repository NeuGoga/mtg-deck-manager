import { useState } from 'react'
import { HydratedCard } from '../types'

interface CardModalProps {
  card: HydratedCard
  sections: string[]
  theme: any
  onClose: () => void
  onUpdateQuantity: (id: string, section: string, amount: number) => void
  onMoveCard: (id: string, oldSection: string, newSection: string, amount: number) => void
  onSetCover: (id: string, url: string) => void
}

const ManaCost = ({ cost }: { cost: string }) => {
  if (!cost) return null
  const symbols = cost.match(/\{[^}]+\}/g) || []
  return (
    <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
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
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: bg,
              color: 'black',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '11px',
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

export default function CardModal({
  card,
  sections,
  theme: t,
  onClose,
  onUpdateQuantity,
  onMoveCard,
  onSetCover
}: CardModalProps) {
  const [activeTab, setActiveTab] = useState<'options' | 'info'>('options')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: t.panel,
          borderRadius: '12px',
          display: 'flex',
          border: `1px solid ${t.border}`,
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh'
        }}
      >
        <div
          style={{
            padding: '25px',
            backgroundColor: t.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: `1px solid ${t.border}`
          }}
        >
          <img
            src={card.imageUrl}
            alt={card.name}
            style={{
              width: '300px',
              borderRadius: '14px',
              boxShadow: '0 10px 20px rgba(0,0,0,0.4)'
            }}
          />

          <button
            onClick={() => onSetCover(card.id, card.imageUrl)}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '10px',
              backgroundColor: t.element,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = t.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = t.element)}
          >
            Set as Deck Cover
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '20px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 10px 0', color: t.text, fontSize: '24px' }}>{card.name}</h2>
              <ManaCost cost={card.mana_cost} />
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: t.subText,
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${t.border}`,
              backgroundColor: t.bg
            }}
          >
            <button
              onClick={() => setActiveTab('options')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'options' ? t.panel : 'transparent',
                color: activeTab === 'options' ? t.text : t.subText,
                border: 'none',
                borderBottom:
                  activeTab === 'options' ? `3px solid ${t.primary}` : '3px solid transparent',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Card options
            </button>
            <button
              onClick={() => setActiveTab('info')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'info' ? t.panel : 'transparent',
                color: activeTab === 'info' ? t.text : t.subText,
                border: 'none',
                borderBottom:
                  activeTab === 'info' ? `3px solid ${t.primary}` : '3px solid transparent',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Card info
            </button>
          </div>

          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            {activeTab === 'options' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: t.subText,
                      fontSize: '13px',
                      marginBottom: '8px',
                      fontWeight: 'bold'
                    }}
                  >
                    Category (Section)
                  </label>
                  <select
                    value={card.section}
                    onChange={(e) =>
                      onMoveCard(card.id, card.section, e.target.value, card.quantity)
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: t.inputBg,
                      color: t.text,
                      border: `1px solid ${t.border}`,
                      borderRadius: '5px',
                      fontSize: '15px'
                    }}
                  >
                    {sections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: t.subText,
                      fontSize: '13px',
                      marginBottom: '8px',
                      fontWeight: 'bold'
                    }}
                  >
                    Quantity
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: t.inputBg,
                      border: `1px solid ${t.border}`,
                      borderRadius: '5px',
                      width: 'fit-content',
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      onClick={() => onUpdateQuantity(card.id, card.section, card.quantity - 1)}
                      style={{
                        padding: '8px 15px',
                        background: 'none',
                        border: 'none',
                        color: t.text,
                        cursor: 'pointer',
                        fontSize: '18px'
                      }}
                    >
                      -
                    </button>
                    <input
                      value={card.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(card.id, card.section, parseInt(e.target.value) || 0)
                      }
                      style={{
                        width: '40px',
                        textAlign: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: t.text,
                        fontWeight: 'bold',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => onUpdateQuantity(card.id, card.section, card.quantity + 1)}
                      style={{
                        padding: '8px 15px',
                        background: 'none',
                        border: 'none',
                        color: t.text,
                        cursor: 'pointer',
                        fontSize: '18px'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <span style={{ color: t.subText, fontSize: '12px' }}>Type Line</span>
                  <div
                    style={{
                      color: t.text,
                      fontSize: '15px',
                      fontWeight: 'bold',
                      marginTop: '4px'
                    }}
                  >
                    {card.type_line}
                  </div>
                </div>
                <div>
                  <span style={{ color: t.subText, fontSize: '12px' }}>Mana Value (CMC)</span>
                  <div
                    style={{
                      color: t.text,
                      fontSize: '15px',
                      fontWeight: 'bold',
                      marginTop: '4px'
                    }}
                  >
                    {card.cmc}
                  </div>
                </div>
                <div>
                  <span style={{ color: t.subText, fontSize: '12px' }}>Prices</span>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '4px' }}>
                    <span style={{ color: t.success, fontWeight: 'bold' }}>
                      USD: ${card.prices?.usd || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
