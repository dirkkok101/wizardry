import { z } from 'zod'

/**
 * Zod schema for runtime validation of monster JSON files
 * Ensures loaded monsters match TypeScript MonsterTemplate interface
 *
 * Uses .passthrough() to allow additional fields (class, spellLevels, spells, etc.)
 * that exist in monster data but aren't yet used by MonsterTemplate interface
 */
export const MonsterTemplateSchema = z.object({
  // Required fields
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.number().int().min(1).max(20),

  numberAppearing: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1)
  }).refine(
    (data) => data.max >= data.min,
    { message: 'numberAppearing.max must be >= min' }
  ),

  hp: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1)
  }).refine(
    (data) => data.max >= data.min,
    { message: 'hp.max must be >= min' }
  ),

  ac: z.number().int().min(-10).max(20),

  damage: z.array(z.object({
    dice: z.string().regex(/^\d+d\d+$/, 'Invalid dice notation'),
    min: z.number().int().min(0),
    max: z.number().int().min(0)
  })),

  xp: z.number().int().min(0),

  // Optional fields - use undefined instead of null
  gold: z.number().int().min(0).optional(),

  type: z.string().min(1),

  specialAbilities: z.array(z.string()),

  resistances: z.array(z.object({
    type: z.string(),
    value: z.number().min(0).max(100)
  })),

  regeneration: z.number().int().min(0),

  isBoss: z.boolean(),

  canFlee: z.boolean()
}).passthrough()  // Allow additional fields for future expansion

export type ValidatedMonster = z.infer<typeof MonsterTemplateSchema>
