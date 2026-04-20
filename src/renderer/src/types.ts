export interface CardData {
  id: string
  name: string
  mana_cost: string
  cmc: number
  type_line: string
  prices: { usd: string | null }
  legalities: Record<string, string>
  imageUrl: string
  quantity: number
}

export interface Deck {
  id: number
  name: string
  format: string
  tags: string[]
  cards: CardData[]
  coverCardId?: string
  coverCardUrl?: string
}