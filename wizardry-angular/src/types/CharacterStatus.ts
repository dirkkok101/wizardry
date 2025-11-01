/**
 * Character Status - Current health/life state
 */
export enum CharacterStatus {
  GOOD = 'GOOD',           // Healthy, full capabilities
  INJURED = 'INJURED',     // HP < 50%, reduced effectiveness
  DEAD = 'DEAD',           // HP = 0, body must be recovered
  ASHES = 'ASHES',         // Failed resurrection, harder to resurrect
  LOST_FOREVER = 'LOST_FOREVER', // Permanent death
  PARALYZED = 'PARALYZED', // Cannot act in combat
  STONED = 'STONED',       // Petrified, cannot act
  POISONED = 'POISONED',   // Taking damage over time
  ASLEEP = 'ASLEEP'        // Cannot act, wakes on damage
}
