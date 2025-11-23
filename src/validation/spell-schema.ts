import { z } from 'zod'

/**
 * Zod schema for runtime validation of spell JSON files
 * Ensures loaded spells match TypeScript interface
 */
export const SpellDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4),
    z.literal(5), z.literal(6), z.literal(7)
  ]),
  casterType: z.enum(['mage', 'priest']),
  category: z.enum(['offensive', 'healing', 'utility', 'buff', 'debuff']),
  target: z.enum(['single', 'group', 'all_enemies', 'all_allies', 'self', 'dead_body', 'ashes']),
  castableIn: z.array(z.enum(['combat', 'dungeon', 'town'])),

  // Optional fields
  damage: z.object({
    dice: z.string(),
    type: z.enum(['fire', 'cold', 'lightning', 'holy', 'air', 'magic', 'physical'])
  }).optional(),

  healing: z.object({
    dice: z.string().optional(),
    type: z.enum(['normal', 'full'])
  }).optional(),

  acModifier: z.number().optional(),
  statusEffect: z.enum(['ASLEEP', 'BLIND', 'SILENCED', 'INVISIBLE', 'PARALYZED', 'POISONED']).optional(),

  instantDeath: z.boolean().optional(),
  resurrection: z.boolean().optional(),
  resurrectionSuccessRate: z.number().min(0).max(1).optional(),
  dispelMagic: z.boolean().optional(),
  transformation: z.boolean().optional(),
  undeadOnly: z.boolean().optional(),
  ignoresAC: z.boolean().optional(),

  utility: z.enum([
    'reveal_stats', 'identify_foe', 'identify_trap', 'extended_light',
    'locate_person', 'teleport', 'recall', 'show_coordinates'
  ]).optional(),

  teleportSuccessRate: z.number().min(0).max(1).optional(),
  recallSuccessRate: z.literal('level_based').optional(),

  statusCure: z.enum(['poison', 'paralysis', 'silence', 'blind', 'asleep', 'all']).optional(),
  causeFear: z.boolean().optional(),

  description: z.string(),
  failureResult: z.string().optional()
})

export type ValidatedSpell = z.infer<typeof SpellDefinitionSchema>
