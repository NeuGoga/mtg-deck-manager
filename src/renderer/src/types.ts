export interface CardData {
  id: string
  scryfall_id: string
  name: string
  mana_cost: string
  cmc: number
  type_line: string
  prices: { usd: string | null }
  legalities: Record<string, string>
  imageUrl: string
  colors?: string[]
  produced_mana?: string[]
}

export interface DeckCardRef {
  id: string
  quantity: number
  section: string
}

export type HydratedCard = CardData & DeckCardRef

export interface Deck {
  id: number
  name: string
  format: string
  tags: string[]
  sections: string[]
  cards: DeckCardRef[]
  coverCardId?: string
  coverCardUrl?: string
}