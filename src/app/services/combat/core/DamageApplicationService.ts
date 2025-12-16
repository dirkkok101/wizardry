/**
 * Damage Application Service
 *
 * Handles applying damage and healing to combatants.
 * Provides immutable state updates for both characters and monsters.
 *
 * @see docs/research/combat-formulas.md
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { CombatState, Combatant, MonsterInstance, CombatantStatus } from '@models/Combat'
import { CombatHelpers } from '../CombatHelpers'

// ============================================================================
// Character Damage/Healing
// ============================================================================

/**
 * Apply damage to a character
 * Returns updated character (immutable)
 * Also wakes sleeping characters
 */
export function applyDamageToCharacter(character: Character, damage: number): Character {
  const newHp = Math.max(0, character.hp - damage)
  const isDead = newHp === 0

  // Wake up sleeping character if damaged
  const newStatus = isDead
    ? CharacterStatus.DEAD
    : character.status === CharacterStatus.ASLEEP
      ? CharacterStatus.OK
      : character.status

  return {
    ...character,
    hp: newHp,
    status: newStatus,
  }
}

/**
 * Apply healing to a character
 * Returns updated character with restored HP (capped at maxHp)
 */
export function applyHealingToCharacter(character: Character, healing: number): Character {
  const newHp = Math.min(character.maxHp, character.hp + healing)
  return {
    ...character,
    hp: newHp,
  }
}

/**
 * Apply full heal to a character (restores to maxHp)
 */
export function applyFullHealToCharacter(character: Character): Character {
  return {
    ...character,
    hp: character.maxHp,
  }
}

/**
 * Kill a character instantly (critical hit, instant death spell)
 */
export function killCharacter(character: Character): Character {
  return {
    ...character,
    hp: 0,
    status: CharacterStatus.DEAD,
  }
}

/**
 * Resurrect a character with specified HP
 */
export function resurrectCharacter(character: Character, hp: number = 1): Character {
  return {
    ...character,
    hp: Math.min(hp, character.maxHp),
    status: CharacterStatus.OK,
  }
}

// ============================================================================
// Monster Damage
// ============================================================================

/**
 * Apply damage to a monster within combat state
 * Returns updated state (immutable)
 * Also wakes sleeping monsters
 */
export function applyDamageToMonster(
  state: CombatState,
  monsterId: string,
  damage: number
): CombatState {
  const newMonsterGroups = state.monsterGroups.map(group => ({
    ...group,
    monsters: group.monsters.map(m => {
      if (m.id !== monsterId) return m

      const newHp = Math.max(0, m.hp - damage)
      // Wake up sleeping monster if damaged, or mark as dead
      const newStatus: CombatantStatus = newHp === 0
        ? 'DEAD'
        : m.status === 'ASLEEP'
          ? 'ALIVE'
          : m.status

      return {
        ...m,
        hp: newHp,
        status: newStatus,
      }
    }),
  }))

  return { ...state, monsterGroups: newMonsterGroups }
}

/**
 * Apply instant death to a monster (MAKANITO, critical hit)
 */
export function applyInstantDeathToMonster(
  state: CombatState,
  monsterId: string
): CombatState {
  const newMonsterGroups = state.monsterGroups.map(group => ({
    ...group,
    monsters: group.monsters.map(m => {
      if (m.id !== monsterId) return m
      return {
        ...m,
        hp: 0,
        status: 'DEAD' as const,
      }
    }),
  }))

  return { ...state, monsterGroups: newMonsterGroups }
}

/**
 * Apply healing to a monster (regeneration)
 */
export function applyHealingToMonster(
  state: CombatState,
  monsterId: string,
  healing: number
): CombatState {
  const newMonsterGroups = state.monsterGroups.map(group => ({
    ...group,
    monsters: group.monsters.map(m => {
      if (m.id !== monsterId) return m
      const newHp = Math.min(m.maxHp, m.hp + healing)
      return {
        ...m,
        hp: newHp,
      }
    }),
  }))

  return { ...state, monsterGroups: newMonsterGroups }
}

// ============================================================================
// Generic Combatant Damage
// ============================================================================

/**
 * Apply damage to any combatant (monster updates state, character returns updated character)
 *
 * For monsters: Updates the combat state and returns it
 * For characters: State is unchanged, character update must be handled separately
 */
export function applyDamage(
  state: CombatState,
  target: Combatant,
  damage: number
): CombatState {
  // Apply damage to monster
  if ('monsterId' in target) {
    return applyDamageToMonster(state, target.id, damage)
  }

  // For characters, state doesn't change here
  // Character updates are tracked separately via characterUpdates map
  return state
}

/**
 * Apply healing to any combatant
 * Same pattern as applyDamage
 */
export function applyHealing(
  state: CombatState,
  target: Combatant,
  healing: number
): CombatState {
  // Apply healing to monster
  if ('monsterId' in target) {
    return applyHealingToMonster(state, target.id, healing)
  }

  // For characters, healing is handled separately
  return state
}

// ============================================================================
// Combat State Queries
// ============================================================================

/**
 * Check if all monsters are dead
 */
export function areAllMonstersDead(state: CombatState): boolean {
  return state.monsterGroups.every(group =>
    group.monsters.every(m => CombatHelpers.isMonsterDead(m))
  )
}

/**
 * Check if all characters are dead/incapacitated
 */
export function areAllCharactersDead(
  party: Character[],
  characterUpdates?: Map<string, Character>
): boolean {
  return party.every(char => {
    const updated = characterUpdates?.get(char.id) ?? char
    return updated.hp <= 0 ||
           updated.status === CharacterStatus.DEAD ||
           updated.status === CharacterStatus.ASHES ||
           updated.status === CharacterStatus.LOST
  })
}

/**
 * Check if a specific combatant is dead
 */
export function isCombatantDead(combatant: Combatant): boolean {
  if ('monsterId' in combatant) {
    return CombatHelpers.isMonsterDead(combatant as MonsterInstance)
  }

  const char = combatant as Character
  return char.hp <= 0 ||
         char.status === CharacterStatus.DEAD ||
         char.status === CharacterStatus.ASHES ||
         char.status === CharacterStatus.LOST
}

/**
 * Check if a combatant can act (not dead, not incapacitated)
 */
export function canCombatantAct(combatant: Combatant): boolean {
  if (isCombatantDead(combatant)) return false

  // Check for incapacitating status
  if ('status' in combatant) {
    const status = combatant.status
    if (typeof status === 'string') {
      const statusStr = status.toUpperCase()
      if (statusStr === 'ASLEEP' || statusStr === 'PARALYZED' || statusStr === 'STONED') {
        return false
      }
    } else {
      // CharacterStatus enum
      if (status === CharacterStatus.ASLEEP ||
          status === CharacterStatus.PARALYZED ||
          status === CharacterStatus.STONED) {
        return false
      }
    }
  }

  return true
}

// ============================================================================
// Monster Queries
// ============================================================================

/**
 * Get all monsters from all groups
 */
export function getAllMonsters(state: CombatState): MonsterInstance[] {
  return state.monsterGroups.flatMap(g => g.monsters)
}

/**
 * Get all alive monsters
 */
export function getAllAliveMonsters(state: CombatState): MonsterInstance[] {
  return state.monsterGroups.flatMap(g =>
    CombatHelpers.getAliveMonsters(g.monsters)
  )
}

/**
 * Get all monsters that can act (alive and not incapacitated)
 */
export function getAllActingMonsters(state: CombatState): MonsterInstance[] {
  return state.monsterGroups.flatMap(g =>
    g.monsters.filter(m =>
      CombatHelpers.isMonsterAlive(m) &&
      m.status !== 'ASLEEP' &&
      m.status !== 'PARALYZED'
    )
  )
}

/**
 * Damage Application Service class (static methods for backward compatibility)
 */
export class DamageApplicationService {
  static applyDamageToCharacter = applyDamageToCharacter
  static applyHealingToCharacter = applyHealingToCharacter
  static applyFullHealToCharacter = applyFullHealToCharacter
  static killCharacter = killCharacter
  static resurrectCharacter = resurrectCharacter
  static applyDamageToMonster = applyDamageToMonster
  static applyInstantDeathToMonster = applyInstantDeathToMonster
  static applyHealingToMonster = applyHealingToMonster
  static applyDamage = applyDamage
  static applyHealing = applyHealing
  static areAllMonstersDead = areAllMonstersDead
  static areAllCharactersDead = areAllCharactersDead
  static isCombatantDead = isCombatantDead
  static canCombatantAct = canCombatantAct
  static getAllMonsters = getAllMonsters
  static getAllAliveMonsters = getAllAliveMonsters
  static getAllActingMonsters = getAllActingMonsters
}
