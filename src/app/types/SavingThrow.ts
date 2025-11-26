/**
 * Saving Throw Types for Wizardry 1
 *
 * From original Wizardry 1 saving throw formula:
 * Save% = (CharacterLevel/5 + Luck/6 - ClassBonus - RaceBonus) * 5%
 *
 * Each save type represents a different category of threats:
 * - death: Poison, paralysis, critical hits
 * - wand: Wand effects (unused in Wizardry 1 but present in code)
 * - breath: Breath attacks, gas traps
 * - petrify: Petrification attacks
 * - spell: Spells, magic attacks
 */
export type SaveType = 'death' | 'wand' | 'breath' | 'petrify' | 'spell'
