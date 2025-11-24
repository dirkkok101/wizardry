import { z } from 'zod'

/**
 * Zod schemas for runtime validation of item JSON files
 * Ensures loaded items match TypeScript interfaces and original Wizardry 1 data
 */

/**
 * Character class type
 */
const CharacterClassSchema = z.enum([
  'fighter',
  'mage',
  'priest',
  'thief',
  'bishop',
  'samurai',
  'lord',
  'ninja'
])

/**
 * Alignment type
 */
const AlignmentSchema = z.enum(['good', 'neutral', 'evil'])

/**
 * Damage roll structure
 */
const DamageRollSchema = z.object({
  dice: z.string().regex(/^\d+d\d+$/, 'Damage dice must be in format "XdY" (e.g., "1d8", "10d50")'),
  min: z.number().int().min(1),
  max: z.number().int().min(1)
}).refine(data => data.max >= data.min, {
  message: 'Max damage must be >= min damage'
})

/**
 * Item effect structure for consumables
 */
const ItemEffectSchema = z.object({
  type: z.enum(['heal', 'cast_spell', 'remove_status', 'buff']),
  healing: z.string().optional(), // e.g., "1d8"
  spellId: z.string().optional()
})

/**
 * Special properties structure
 */
const SpecialPropertiesSchema = z.object({
  invoke: z.enum(['cast_spell', 'str_bonus', 'hp_bonus', 'party_heal', 'change_class', 'class_change']).optional(),
  spellId: z.string().optional(),
  targetClass: z.string().optional(), // For class change items
  invokeEffect: z.object({
    stat: z.string(),
    bonus: z.number()
  }).optional(),
  regeneration: z.number().optional(), // Can be negative for cursed items
  protection: z.string().optional(), // Single protection type
  protections: z.array(z.string()).optional(), // Multiple protection types
  ac: z.number().optional(), // AC bonus for accessories
  partyHealing: z.boolean().optional()
}).nullable().optional()

/**
 * Base item schema with common fields
 */
const BaseItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['weapon', 'armor', 'shield', 'helmet', 'gauntlets', 'accessory', 'consumable', 'special']),
  cost: z.number().int().min(0),
  usableBy: z.array(CharacterClassSchema),
  cursed: z.boolean(),
  alignmentRequired: AlignmentSchema.optional(),
  special: SpecialPropertiesSchema.default(null)
})

/**
 * Weapon schema
 */
const WeaponSchema = BaseItemSchema.extend({
  category: z.literal('weapon'),
  weaponType: z.enum(['dagger', 'sword', 'mace', 'flail', 'staff', 'blade', 'shuriken']),
  damage: DamageRollSchema,
  enhancement: z.number().int(),
  effectiveAgainst: z.array(z.string()).optional(), // e.g., ["dragon"], ["werebeast"]
  depletionChance: z.number().int().min(0).max(100).optional(),
  transformsTo: z.string().nullable().optional()
})

/**
 * Armor schema
 */
const ArmorSchema = BaseItemSchema.extend({
  category: z.literal('armor'),
  armorType: z.literal('body'),
  ac: z.number().int().min(-2).max(10), // AC can be negative for cursed armor
  enhancement: z.number().int(),
  depletionChance: z.number().int().min(0).max(100).optional(),
  transformsTo: z.string().nullable().optional()
})

/**
 * Shield schema
 */
const ShieldSchema = BaseItemSchema.extend({
  category: z.literal('shield'),
  ac: z.number().int().min(-2).max(10),
  enhancement: z.number().int()
})

/**
 * Helmet schema
 */
const HelmetSchema = BaseItemSchema.extend({
  category: z.literal('helmet'),
  ac: z.number().int().min(-2).max(10),
  enhancement: z.number().int(),
  depletionChance: z.number().int().min(0).max(100).optional(),
  transformsTo: z.string().nullable().optional()
})

/**
 * Gauntlets schema
 */
const GauntletsSchema = BaseItemSchema.extend({
  category: z.literal('gauntlets'),
  ac: z.number().int().min(1).max(10),
  enhancement: z.number().int()
})

/**
 * Accessory schema
 */
const AccessorySchema = BaseItemSchema.extend({
  category: z.literal('accessory'),
  accessoryType: z.enum(['ring', 'amulet', 'rod']),
  depletionChance: z.number().int().min(0).max(100).optional(),
  transformsTo: z.string().nullable().optional()
})

/**
 * Consumable schema
 */
const ConsumableSchema = BaseItemSchema.extend({
  category: z.literal('consumable'),
  consumableType: z.enum(['potion', 'scroll']),
  singleUse: z.boolean(),
  depletionChance: z.number().int().min(0).max(100),
  transformsTo: z.string(),
  effect: ItemEffectSchema
})

/**
 * Special item schema (keys, quest items, legendary items)
 */
const SpecialItemSchema = BaseItemSchema.extend({
  category: z.literal('special'),
  specialType: z.enum(['key', 'quest', 'legendary', 'broken']),
  purpose: z.string().optional()
})

/**
 * Union of all item types
 * Uses discriminated union on 'category' field for type safety
 */
export const ItemSchema = z.discriminatedUnion('category', [
  WeaponSchema,
  ArmorSchema,
  ShieldSchema,
  HelmetSchema,
  GauntletsSchema,
  AccessorySchema,
  ConsumableSchema,
  SpecialItemSchema
])

/**
 * TypeScript type inferred from the ItemSchema
 *
 * This represents the validated JSON format loaded from data/items/*.json files.
 * It differs from the runtime Item interface in that:
 * - Uses JSON property names (e.g., 'usableBy' vs 'classRestrictions')
 * - Uses discriminated union on 'category' field for type safety
 * - Includes all original JSON fields before transformation to runtime format
 *
 * After validation, items are transformed to the runtime Item format by ItemDataLoader.
 */
export type ValidatedItem = z.infer<typeof ItemSchema>

/**
 * Export individual schemas for testing
 */
export const ItemSchemas = {
  Weapon: WeaponSchema,
  Armor: ArmorSchema,
  Shield: ShieldSchema,
  Helmet: HelmetSchema,
  Gauntlets: GauntletsSchema,
  Accessory: AccessorySchema,
  Consumable: ConsumableSchema,
  Special: SpecialItemSchema
}
