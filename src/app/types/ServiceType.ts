/**
 * ServiceType - Temple of Cant service types
 *
 * Authentic Wizardry 1 costs per level:
 * - Cure Poison: 10 gold
 * - Cure Paralysis: 100 gold
 * - Cure Stoned: 200 gold
 * - Resurrect (DEAD → OK): 250 gold
 * - Restore (ASHES → OK): 500 gold
 */
export enum ServiceType {
  CURE_POISON = 'CURE_POISON',
  CURE_PARALYSIS = 'CURE_PARALYSIS',
  CURE_STONED = 'CURE_STONED',
  RESURRECT = 'RESURRECT',
  RESTORE = 'RESTORE'
}
