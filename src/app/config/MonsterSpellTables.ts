// src/app/config/MonsterSpellTables.ts
/**
 * Monster Spell Tables (Apple II Wizardry 1 Reference)
 *
 * Monsters cast from fixed spell tables based on their mage/priest level.
 * Each level has two spell choices:
 * - Spell A: 66% chance to be selected
 * - Spell B: 34% chance to be selected
 *
 * Mage spells degrade over time (spell level decreases after casting).
 * Priest spells do not degrade.
 */

export interface SpellTableEntry {
  spellA: string  // 66% chance
  spellB: string  // 34% chance
}

/**
 * Monster Mage Spell Table (from Apple II reference)
 * Spell A has 66% chance, Spell B has 34% chance
 */
export const MONSTER_MAGE_SPELL_TABLE: Record<number, SpellTableEntry> = {
  1: { spellA: 'katino', spellB: 'halito' },
  2: { spellA: 'dilto', spellB: 'halito' },
  3: { spellA: 'molito', spellB: 'mahalito' },
  4: { spellA: 'dalto', spellB: 'lahalito' },
  5: { spellA: 'lahalito', spellB: 'madalto' },
  6: { spellA: 'madalto', spellB: 'zilwan' },
  7: { spellA: 'tiltowait', spellB: 'tiltowait' },
}

/**
 * Monster Priest Spell Table (from Apple II reference)
 * Priests always use max level (no degradation)
 * Spell A has 66% chance, Spell B has 34% chance
 */
export const MONSTER_PRIEST_SPELL_TABLE: Record<number, SpellTableEntry> = {
  1: { spellA: 'badios', spellB: 'badios' },
  2: { spellA: 'montino', spellB: 'montino' },
  3: { spellA: 'badios', spellB: 'badial' },
  4: { spellA: 'badial', spellB: 'badial' },
  5: { spellA: 'badialma', spellB: 'badi' },
  6: { spellA: 'lorto', spellB: 'mabadi' },
  7: { spellA: 'mabadi', spellB: 'mabadi' },
}

/**
 * Spell level degradation weights for mage spells
 * After casting, spell level may decrease
 * Index = degradation amount, value = weight
 */
export const MAGE_SPELL_DEGRADATION_WEIGHTS = [
  71.0,    // 0: stay at max level
  20.59,   // -1 level
  5.97,    // -2 levels
  1.73,    // -3 levels
  0.50,    // -4 levels
  0.15,    // -5 levels
  0.06,    // -6 levels
]

/**
 * Select a spell from the monster mage table
 * @param mageLevel - Current mage level (1-7)
 * @param rollSpellChoice - Random value 0-1 to select A or B
 * @returns Spell ID
 */
export function selectMonsterMageSpell(mageLevel: number, rollSpellChoice: number): string {
  const effectiveLevel = Math.max(1, Math.min(7, mageLevel))
  const entry = MONSTER_MAGE_SPELL_TABLE[effectiveLevel]
  return rollSpellChoice < 0.66 ? entry.spellA : entry.spellB
}

/**
 * Select a spell from the monster priest table
 * @param priestLevel - Current priest level (1-7)
 * @param rollSpellChoice - Random value 0-1 to select A or B
 * @returns Spell ID
 */
export function selectMonsterPriestSpell(priestLevel: number, rollSpellChoice: number): string {
  const effectiveLevel = Math.max(1, Math.min(7, priestLevel))
  const entry = MONSTER_PRIEST_SPELL_TABLE[effectiveLevel]
  return rollSpellChoice < 0.66 ? entry.spellA : entry.spellB
}

/**
 * Roll for spell level degradation
 * Returns amount to subtract from current spell level
 * @param roll - Random value 0-1
 * @returns Degradation amount (0-6)
 */
export function rollSpellLevelDegradation(roll: number): number {
  const total = MAGE_SPELL_DEGRADATION_WEIGHTS.reduce((a, b) => a + b, 0)
  let cumulative = 0
  const target = roll * total

  for (let i = 0; i < MAGE_SPELL_DEGRADATION_WEIGHTS.length; i++) {
    cumulative += MAGE_SPELL_DEGRADATION_WEIGHTS[i]
    if (target < cumulative) {
      return i
    }
  }
  return 0
}
