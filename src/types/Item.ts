import { ItemType, ItemSlot } from './ItemType'
import { CharacterClass } from './CharacterClass'
import { Alignment } from './Alignment'

/**
 * Damage roll structure from JSON data
 */
export interface DamageRoll {
  dice: string  // e.g., "1d8", "2d4+1"
  min: number
  max: number
}

/**
 * Item effect structure for consumables
 */
export interface ItemEffect {
  type: string  // e.g., "cast_spell", "heal", "cure"
  spellId?: string
  healAmount?: number
  [key: string]: any  // Allow additional effect properties
}

/**
 * Item - Equipment and inventory items
 *
 * This interface supports both:
 * 1. Runtime item instances (with type, slot, price, identified, equipped)
 * 2. JSON data format (with category, cost, usableBy, damageRoll, ac)
 *
 * Transformation layer converts JSON → runtime format
 */
export interface Item {
  // Core identity (required)
  id: string
  name: string

  // Type fields - runtime format (transformed from JSON)
  type: ItemType        // Transformed from category
  slot: ItemSlot        // Derived from weaponType/armorType/category
  price: number         // Transformed from cost

  // Combat stats - simplified runtime format
  damage?: number       // Transformed from damageRoll.max
  defense?: number      // Transformed from ac

  // Requirements - runtime format
  classRestrictions?: CharacterClass[]  // Transformed from usableBy
  alignmentRestrictions?: Alignment[]

  // Runtime state (not in JSON)
  cursed: boolean       // From JSON
  identified: boolean   // Runtime only - defaults to false
  equipped: boolean     // Runtime only - defaults to false

  // Description
  description?: string
  unidentifiedName?: string

  // ========== JSON Data Format Fields (optional) ==========
  // These fields come from the actual JSON files and are used
  // by the transformation layer. They're optional because runtime
  // instances may not need them after transformation.

  // JSON category and subtypes
  category?: string              // "weapon", "armor", "shield", "helmet", "gauntlet", "consumable", "misc"
  weaponType?: string            // "dagger", "sword", "axe", "mace", "staff", etc.
  armorType?: string             // "body", "shield", "helmet", "gauntlet"
  consumableType?: string        // "potion", "scroll", "wand"

  // JSON pricing
  cost?: number                  // Original JSON field (mapped to price)

  // JSON combat stats
  damageRoll?: DamageRoll        // Original complex damage format
  ac?: number                    // Original JSON field (mapped to defense)

  // JSON requirements
  usableBy?: string[]            // Original JSON field (mapped to classRestrictions)

  // Enhancement and special properties
  enhancement?: number           // +1, +2, etc. (bonus to damage/AC)
  special?: string | null        // Special item properties

  // Consumable-specific fields
  singleUse?: boolean            // Item is consumed on use
  depletionChance?: number       // Chance (0-100) item breaks after use
  transformsTo?: string          // Item ID to transform into when depleted
  effect?: ItemEffect            // Effect when used (healing, spell, etc.)
}
