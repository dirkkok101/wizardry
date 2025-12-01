import { z } from 'zod'

/**
 * Zod schemas for runtime validation of treasure reward JSON files
 * Based on Wizardry 1 reference document Section 4.4
 */

/**
 * Trap types that can appear on treasure chests
 */
export const TrapTypeSchema = z.enum([
  'none',
  'poison_needle',
  'gas_bomb',
  'type3',           // Subtypes: crossbow, exploding, splinters, blades, stunner
  'teleporter',
  'anti_mage',
  'anti_priest',
  'alarm'
])

/**
 * Gold dice roll structure
 * Supports simple (2d5) and complex (10d10×d4) formats
 */
export const GoldDiceSchema = z.object({
  count: z.number().int().min(1),
  sides: z.number().int().min(1),
  multiplier: z.number().int().min(1).default(10),
  bonusRoll: z.object({
    count: z.number().int().min(1),
    sides: z.number().int().min(1)
  }).optional()  // For complex rolls like 10d10×d4×10
})

/**
 * Item tier for treasure generation
 * Each tier has a chance to drop an item from a specific ID range
 */
export const TreasureTierSchema = z.object({
  chance: z.number().int().min(0).max(100),
  minItemId: z.number().int().min(0),
  maxItemId: z.number().int().min(0)
}).refine(data => data.maxItemId >= data.minItemId, {
  message: 'maxItemId must be >= minItemId'
})

/**
 * Complete treasure reward configuration
 */
export const TreasureRewardSchema = z.object({
  rewardType: z.number().int().min(10).max(21),
  description: z.string().optional(),
  goldDice: GoldDiceSchema,
  traps: z.array(TrapTypeSchema),
  tiers: z.array(TreasureTierSchema)
})

/**
 * TypeScript types inferred from schemas
 */
export type TrapType = z.infer<typeof TrapTypeSchema>
export type GoldDice = z.infer<typeof GoldDiceSchema>
export type TreasureTier = z.infer<typeof TreasureTierSchema>
export type TreasureReward = z.infer<typeof TreasureRewardSchema>
