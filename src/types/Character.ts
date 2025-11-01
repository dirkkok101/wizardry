import { Race } from './Race'
import { CharacterClass } from './CharacterClass'
import { Alignment } from './Alignment'
import { CharacterStatus } from './CharacterStatus'

/**
 * Character - Core character data structure
 */
export interface Character {
  id: string
  name: string
  race: Race
  class: CharacterClass
  alignment: Alignment
  status: CharacterStatus

  // Core stats (3-18 base range)
  strength: number
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number

  // Derived stats
  level: number
  experience: number
  hp: number
  maxHp: number
  ac: number // Armor Class (lower is better)

  // Inventory (8 items max)
  // Can contain either item IDs (string) or Item objects (for unidentified items)
  inventory: (string | any)[] // Item IDs or Item objects for unidentified items
  equippedWeapon?: string // Item ID
  equippedArmor?: string // Item ID

  // Password protection
  password: string

  // Metadata
  createdAt: number // Unix timestamp
  lastModified: number
}

/**
 * Character creation parameters
 */
export interface CreateCharacterParams {
  name: string
  race: Race
  class: CharacterClass
  alignment: Alignment
  password: string
  // Stats will be rolled or assigned during creation
}
