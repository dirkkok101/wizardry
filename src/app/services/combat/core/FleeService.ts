/**
 * Flee Service
 *
 * Handles flee mechanics including chance calculation, demoralization,
 * and flee failure penalties.
 *
 * Based on authentic Wizardry 1 Apple II mechanics.
 *
 * @see docs/research/combat-formulas.md
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { CombatState, MonsterGroup } from '@models/Combat'
import { RandomService } from '@services/RandomService'
import { FLEE } from '../CombatConstants'
import { CombatHelpers } from '../CombatHelpers'
import {
  applyDamageToCharacter,
  getAllActingMonsters,
} from './DamageApplicationService'
import { resolveAttack } from './AttackResolutionService'

// ============================================================================
// Demoralization
// ============================================================================

/**
 * Calculate if monsters are demoralized
 *
 * Formula: Total Party Level > Total Monster Morale
 * Where Monster Morale = sum of (Monster Level × Alive Count) for each group
 *
 * When demoralized:
 * - Party gets +20% flee bonus
 * - Monsters with Run ability have 65% chance to flee each turn
 */
export function calculateDemoralization(
  party: Character[],
  monsterGroups: MonsterGroup[],
  characterUpdates?: Map<string, Character>
): boolean {
  // Calculate total party level (alive members only)
  const totalPartyLevel = party.reduce((sum, char) => {
    const current = characterUpdates?.get(char.id) ?? char
    // Only count living characters
    if (
      current.status === CharacterStatus.DEAD ||
      current.status === CharacterStatus.ASHES ||
      current.status === CharacterStatus.LOST
    ) {
      return sum
    }
    return sum + (current.level || 1)
  }, 0)

  // Calculate total monster morale
  // Morale = sum of (Monster Level × Alive Count) for each group
  const totalMonsterMorale = monsterGroups.reduce((sum, group) => {
    const aliveMonsters = CombatHelpers.getAliveMonsters(group.monsters)
    if (aliveMonsters.length === 0) return sum
    // Use the first monster's level as representative for the group
    const groupLevel = aliveMonsters[0]?.level || 1
    return sum + groupLevel * aliveMonsters.length
  }, 0)

  return totalPartyLevel > totalMonsterMorale
}

// ============================================================================
// Flee Chance Calculation
// ============================================================================

/**
 * Calculate flee chance based on Apple II Wizardry reference
 *
 * Formula (from Data Driven Gamer):
 * - Base: 39% - (MazeLevel × 3%)
 * - Small party bonus (if 3 or fewer): 20% - (PartyCount × 5%)
 * - Demoralization bonus: +20% if monsters are demoralized
 * - Level 10: ALWAYS 0% (running NEVER works on level 10!)
 *
 * Example base chances by level:
 * Level 1: 36%, Level 5: 24%, Level 9: 12%, Level 10: 0%
 */
export function calculateFleeChance(
  state: CombatState,
  party: Character[],
  fleeingCharacterIds: Set<string>,
  characterUpdates?: Map<string, Character>
): number {
  // Boss fights cannot flee
  if (!state.canFlee) {
    return 0
  }

  // Must have at least one character attempting to flee
  if (fleeingCharacterIds.size === 0) {
    return 0
  }

  // Level 10: Running NEVER works!
  if (state.dungeonLevel === FLEE.BLOCKED_LEVEL) {
    return 0
  }

  // Count alive party members
  const aliveParty = party.filter(c => {
    const updated = characterUpdates?.get(c.id) ?? c
    return updated.status !== CharacterStatus.DEAD && updated.hp > 0
  })

  if (aliveParty.length === 0) {
    return 0
  }

  // Base formula: 39% - (MazeLevel × 3%)
  let chance = FLEE.BASE_CHANCE - state.dungeonLevel * FLEE.LEVEL_PENALTY_MULTIPLIER

  // Small party bonus: if party size <= 3, add 20% - (PartySize × 5%)
  // 1 member: +15%, 2 members: +10%, 3 members: +5%
  if (aliveParty.length <= FLEE.SMALL_PARTY_THRESHOLD) {
    chance += FLEE.SMALL_PARTY_BASE_BONUS - aliveParty.length * FLEE.SMALL_PARTY_SIZE_PENALTY
  }

  // Demoralization bonus: +20% if monsters are demoralized
  if (state.monstersDemoralized) {
    chance += FLEE.DEMORALIZATION_BONUS
  }

  // Clamp to 0-100% range
  return Math.max(0, Math.min(100, chance))
}

/**
 * Attempt to flee from combat
 *
 * @returns Object with success flag and flee chance used
 */
export function attemptFlee(
  state: CombatState,
  party: Character[],
  fleeingCharacterIds: Set<string>,
  characterUpdates?: Map<string, Character>
): { success: boolean; chance: number } {
  const chance = calculateFleeChance(state, party, fleeingCharacterIds, characterUpdates)

  if (chance === 0) {
    return { success: false, chance: 0 }
  }

  const success = RandomService.chance(chance)
  return { success, chance }
}

// ============================================================================
// Flee Failure Penalty
// ============================================================================

export interface FleeFailurePenaltyResult {
  newState: CombatState
  messages: string[]
  damagedCharacters: Map<string, Character>
}

/**
 * Execute flee failure penalty - monsters get a free attack round
 *
 * Per Wizardry research: when flee fails, all monsters attack without party retaliation
 */
export function executeFleeFailurePenalty(
  state: CombatState,
  party: Character[],
  frontRow: string[]
): FleeFailurePenaltyResult {
  const messages: string[] = ['The monsters take advantage of the failed escape!']
  const damagedCharacters = new Map<string, Character>()

  // All alive monsters get a free attack
  const actingMonsters = getAllActingMonsters(state)

  for (const monster of actingMonsters) {
    // Get alive front row members that can be targeted
    const aliveFront = party.filter(
      c => frontRow.includes(c.id) && c.hp > 0 && c.status !== CharacterStatus.DEAD
    )

    // Check if character was already damaged this penalty round
    const getEffectiveChar = (c: Character): Character => {
      return damagedCharacters.get(c.id) ?? c
    }

    // Filter to only alive targets after previous penalty attacks
    const effectiveAliveFront = aliveFront.filter(c => getEffectiveChar(c).hp > 0)

    // If no alive front row, target back row
    const aliveBack = party.filter(
      c => !frontRow.includes(c.id) && c.hp > 0 && c.status !== CharacterStatus.DEAD
    )
    const effectiveAliveBack = aliveBack.filter(c => getEffectiveChar(c).hp > 0)

    const targetPool = effectiveAliveFront.length > 0 ? effectiveAliveFront : effectiveAliveBack

    if (targetPool.length === 0) continue

    // Select random target
    const target = RandomService.pickRandom(targetPool)
    const effectiveTarget = getEffectiveChar(target)

    // Resolve attack (no parrying during penalty round)
    const attackResult = resolveAttack(monster, effectiveTarget)

    // Get display name (use unidentified name for unidentified monsters)
    const group = state.monsterGroups.find(g => g.monsters.some(m => m.id === monster.id))
    const displayName = group?.identified ? monster.name : monster.unidentifiedName

    if (attackResult.hit) {
      const damaged = applyDamageToCharacter(effectiveTarget, attackResult.damage)
      damagedCharacters.set(target.id, damaged)
      messages.push(`${displayName} attacks ${target.name}: ${attackResult.damage} damage!`)
    } else {
      messages.push(`${displayName} attacks ${target.name}: Miss!`)
    }
  }

  return {
    newState: state,
    messages,
    damagedCharacters,
  }
}

/**
 * Flee Service class (static methods for backward compatibility)
 */
export class FleeService {
  static calculateDemoralization = calculateDemoralization
  static calculateFleeChance = calculateFleeChance
  static attemptFlee = attemptFlee
  static executeFleeFailurePenalty = executeFleeFailurePenalty
}
