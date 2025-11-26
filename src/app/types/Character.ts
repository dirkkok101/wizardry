import { Race } from './Race'
import { CharacterClass } from './CharacterClass'
import { Alignment } from './Alignment'
import { CharacterStatus } from './CharacterStatus'
import { MaxCurrent } from './MaxCurrent'
import { CharacterSpellPoints } from './SpellPoints'
import { Item } from './Item'

/**
 * Complete character data structure matching original Wizardry 1
 */
export interface Character {
  // Identity
  id: string
  name: string

  // Core Classification
  race: Race
  class: CharacterClass
  alignment: Alignment

  // Attributes (final values after racial base stats + rolls applied)
  strength: number      // 3-18+ range
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number

  // Progression
  level: number         // 1-13+
  experience: number    // XP total
  age: number           // Starting 14-16, increases with inn rests

  // Combat Stats
  hp: number            // Current hit points
  maxHp: number         // Maximum hit points
  ac: number            // Armor class (lower is better, D&D style)

  // Status & Vitality
  status: CharacterStatus  // OK, DEAD, ASHES, etc. (single status at a time)
  vim: MaxCurrent          // Vitality for resurrection (degrades with rests/deaths)

  // Spell System (for caster classes only)
  spellPoints?: CharacterSpellPoints  // Optional: 7 levels per spell type
  knownSpells: string[]                // Spell IDs learned by this character

  // Equipment (5 slots total) - stores full Item objects
  equippedWeapon?: Item        // Weapon slot
  equippedArmor?: Item         // Armor slot
  equippedShield?: Item        // Shield slot
  equippedHelmet?: Item        // Helmet slot
  equippedGauntlets?: Item     // Gauntlet slot

  // Inventory
  inventory: Item[]  // Item objects (max 8 items)

  // Gold (individual gold before joining party, pooled when added to party)
  gold: number  // Starting gold: 90 + random(0-100), authentic Wizardry 1 (1981)

  // Password (for character access protection)
  password?: string  // Password for character deletion/access

  // Metadata
  createdAt?: number  // Timestamp of character creation
  lastModified?: number  // Timestamp of last modification
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
