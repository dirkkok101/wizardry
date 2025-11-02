import { ItemType, ItemSlot } from './ItemType'
import { CharacterClass } from './CharacterClass'
import { Alignment } from './Alignment'

/**
 * Item - Equipment and inventory items
 */
export interface Item {
  id: string
  name: string
  type: ItemType
  slot: ItemSlot
  price: number

  // Combat stats
  damage?: number
  defense?: number

  // Requirements
  classRestrictions?: CharacterClass[]
  alignmentRestrictions?: Alignment[]

  // Special properties
  cursed: boolean
  identified: boolean
  equipped: boolean

  // Description
  description?: string
  unidentifiedName?: string // Name shown before identification
}
