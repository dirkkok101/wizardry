/**
 * TrapEffectService - Handles trap damage, status effects, and triggering
 *
 * Responsible for:
 * - Calculating trap damage (authentic Wizardry 1: mazeLevel × diceType)
 * - Applying status effects with escalation rules
 * - Processing trap trigger results
 * - Applying trap effects to game state
 *
 * @see docs/research/combat-formulas.md
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { GameState, PendingTrapResult } from '@models/GameState'
import {
  TrapId,
  TrapEffect,
  TrapTriggerResult,
} from '@models/Trap'
import { RandomService } from '../RandomService'
import { TrapDataLoader } from '../TrapDataLoader'
import { CharacterResistanceService } from '../CharacterResistanceService'
import { ResistanceType } from '@models/CharacterResistance'

/**
 * Map trap effect to resistance type (DATA-DRIVEN)
 *
 * Authentic Wizardry 1 resistance mapping, now loaded from trap JSON files:
 * - gas_bomb → poisonGasTrap (from data/traps/gas_bomb.json)
 * - mage_blaster → antiMageTrap (from data/traps/mage_blaster.json)
 * - priest_blaster → antiPriestTrap (from data/traps/priest_blaster.json)
 *
 * Falls back to status effect-based resistance for traps without explicit resistanceType:
 * - poison_needle → poison (via statusEffect field)
 * - stunner → paralysis (via statusEffect field)
 */
function mapTrapToResistanceType(
  trapEffect: TrapEffect,
  statusEffect?: CharacterStatus
): ResistanceType | null {
  // Use resistance type from trap data if specified (data-driven approach)
  if (trapEffect.resistanceType) {
    return trapEffect.resistanceType
  }

  // Fall back to status effect-based resistances for traps without explicit resistanceType
  if (statusEffect === CharacterStatus.POISONED) return 'poison'
  if (statusEffect === CharacterStatus.PARALYZED) return 'paralysis'
  if (statusEffect === CharacterStatus.STONED) return 'stoning'

  return null
}

/**
 * Get trap effect from TrapDataLoader
 * Trap data must be loaded via TrapDataLoader.loadAllTraps() before use
 * @throws Error if traps are not loaded or trap ID is not found
 */
export function getTrapEffect(trapId: TrapId): TrapEffect {
  if (!TrapDataLoader.isLoaded()) {
    throw new Error('Trap data not loaded. Call TrapDataLoader.loadAllTraps() first.')
  }

  const effect = TrapDataLoader.getTrapEffect(trapId)
  if (!effect) {
    throw new Error(`Unknown trap ID: ${trapId}`)
  }

  return effect
}

/**
 * Calculate trap damage (authentic Wizardry 1)
 *
 * Formula: (MazeLevel)d{diceType}
 * - Roll MazeLevel dice of the specified type
 * - Example: Level 3 with d8 = 3d8 damage
 *
 * This is the authentic Wizardry 1 trap damage formula where
 * deeper dungeon levels = more dice (not higher multiplier)
 *
 * @param diceType The die type (6, 8, 12, etc.)
 * @param mazeLevel Current dungeon level (1-10)
 * @returns Total damage from rolling mazeLevel dice
 */
export function calculateTrapDamage(diceType: number, mazeLevel: number): number {
  // Authentic Wizardry 1: roll (mazeLevel) dice of the given type
  return RandomService.rollDice(mazeLevel, diceType)
}

/**
 * Apply status escalation (authentic Wizardry 1)
 *
 * Escalation behavior depends on trap type:
 *
 * Class-specific traps (Anti-Mage, Anti-Priest):
 * - First hit: Apply status (PARALYZED)
 * - Second hit while PARALYZED: STONED (not DEAD)
 *
 * Regular status traps:
 * - STONED + STONED = DEAD
 * - POISONED does NOT escalate (stays POISONED)
 *
 * @param currentStatus Character's current status
 * @param newStatus Status being applied
 * @param isClassSpecific True for class-specific traps (Anti-Mage/Anti-Priest)
 * @returns Resulting status after escalation check
 */
export function escalateStatus(
  currentStatus: CharacterStatus,
  newStatus: CharacterStatus,
  isClassSpecific: boolean = false
): CharacterStatus {
  // No escalation if applying same status
  if (currentStatus !== newStatus) {
    return newStatus
  }

  // Class-specific traps: PARALYZED + PARALYZED = STONED (authentic Wizardry 1)
  if (isClassSpecific && newStatus === CharacterStatus.PARALYZED) {
    return CharacterStatus.STONED
  }

  // Regular escalation: STONED + STONED = DEAD
  if (newStatus === CharacterStatus.STONED) {
    return CharacterStatus.DEAD
  }

  // POISONED does not escalate (stays POISONED)
  return newStatus
}

/**
 * Apply trap effects when triggered
 *
 * Authentic Wizardry 1 mechanics:
 * - Damage uses (MazeLevel)d{diceType} formula
 * - Class-specific traps: PARALYZED + PARALYZED = STONED
 * - Regular status traps: STONED + STONED = DEAD
 *
 * @param trapId The ID of the trap that triggered
 * @param opener The character who triggered the trap
 * @param partyMembers The party members (resolved Character objects)
 * @param mazeLevel Current dungeon level (1-10) for damage scaling
 * @returns TrapTriggerResult with damage, status effects, and special outcomes
 */
export function applyTrapEffects(
  trapId: TrapId,
  opener: Character,
  partyMembers: Character[],
  mazeLevel: number = 1
): TrapTriggerResult {
  const effect = getTrapEffect(trapId)
  const damageDealt = new Map<string, number>()
  const statusApplied = new Map<string, CharacterStatus>()
  const messages: string[] = []

  console.log(`[CHEST] Trap triggered: ${effect.name} (${trapId})`)
  console.log(`[CHEST]   Effect: ${effect.diceType ? `${mazeLevel}d${effect.diceType} damage` : 'no damage'}, ${effect.statusEffect || 'no status'}, target=${effect.targetMode}`)

  // Determine targets based on target mode
  let targets: Character[] = []
  const isClassSpecific = effect.targetMode === 'class_specific'

  switch (effect.targetMode) {
    case 'opener':
      targets = [opener]
      console.log(`[CHEST]   Targets: ${opener.name} (opener only)`)
      break
    case 'party':
      targets = partyMembers
      console.log(`[CHEST]   Targets: All ${partyMembers.length} party members`)
      break
    case 'class_specific':
      targets = partyMembers.filter(m =>
        effect.targetClasses?.includes(m.class)
      )
      console.log(`[CHEST]   Targets: ${targets.length} ${effect.targetClasses?.join('/')} class members`)
      break
    case 'special':
      // Special effects handled separately
      console.log(`[CHEST]   Targets: Special effect`)
      break
  }

  // Apply damage if applicable - uses diceType with maze-level scaling
  if (effect.diceType && targets.length > 0) {
    const hitChance = effect.hitChance ?? 1.0  // Default to always hit
    const resistanceType = mapTrapToResistanceType(effect, effect.statusEffect)

    for (const target of targets) {
      // Roll for hit (0-1 random vs hitChance threshold)
      const hitRoll = RandomService.nextRandom()
      const didHit = hitRoll < hitChance
      console.log(`[CHEST]   ${target.name}: Hit roll ${(hitRoll * 100).toFixed(1)}% vs ${(hitChance * 100).toFixed(1)}% → ${didHit ? 'Hit' : 'Miss'}`)

      if (didHit) {
        // Check resistance before applying damage (authentic Wizardry 1)
        if (resistanceType) {
          const resistResult = CharacterResistanceService.checkResistance(target, resistanceType)
          console.log(`[CHEST]     Resist (${resistanceType}): ${resistResult.resisted ? 'RESISTED' : 'Failed'}`)
          if (resistResult.resisted) {
            messages.push(`${target.name} resists the trap!`)
            continue  // Skip damage for this target
          }
        }

        // Authentic Wizardry 1: (mazeLevel)d{diceType}
        const damage = calculateTrapDamage(effect.diceType, mazeLevel)
        damageDealt.set(target.id, damage)
        console.log(`[CHEST]     Damage: ${mazeLevel}d${effect.diceType} = ${damage}`)
        messages.push(`${target.name} takes ${damage} damage!`)
      } else {
        messages.push(`${target.name} avoids the trap!`)
      }
    }
  }

  // Apply status effect if applicable (with authentic Wizardry 1 save mechanics)
  if (effect.statusEffect && targets.length > 0) {
    const hitChance = effect.hitChance ?? 1.0
    const resistanceType = mapTrapToResistanceType(effect, effect.statusEffect)
    const hasPrimaryTargets = isClassSpecific && effect.primaryTargetClasses && effect.primaryTargetClasses.length > 0

    for (const target of targets) {
      // Only apply status if not already rolled for damage (avoid double roll)
      // If there's no diceType, we need to roll for status
      let shouldApply: boolean
      if (effect.diceType) {
        shouldApply = damageDealt.has(target.id)  // Hit was already determined
      } else {
        const statusRoll = RandomService.nextRandom()
        shouldApply = statusRoll < hitChance
        console.log(`[CHEST]   ${target.name}: Status roll ${(statusRoll * 100).toFixed(1)}% vs ${(hitChance * 100).toFixed(1)}% → ${shouldApply ? 'Hit' : 'Miss'}`)
      }

      if (shouldApply) {
        // Check resistance (Save vs. Spell for class-specific traps)
        let saveSucceeded = false
        if (!effect.diceType && resistanceType) {
          const resistResult = CharacterResistanceService.checkResistance(target, resistanceType)
          saveSucceeded = resistResult.resisted
          console.log(`[CHEST]     Save vs ${resistanceType}: ${saveSucceeded ? 'SAVED' : 'Failed'}`)
        }

        // Authentic Wizardry 1: Primary vs Secondary class behavior for class-specific traps
        if (hasPrimaryTargets) {
          const isPrimaryTarget = effect.primaryTargetClasses!.includes(target.class)
          console.log(`[CHEST]     Class type: ${isPrimaryTarget ? 'PRIMARY' : 'SECONDARY'} (${target.class})`)

          if (isPrimaryTarget) {
            // PRIMARY CLASS (e.g., MAGE for Anti-Mage, PRIEST for Anti-Priest):
            // - Save success: Still paralyzed, but NO escalation to STONED
            // - Save failure + already paralyzed: STONED
            // - Save failure + not paralyzed: PARALYZED
            if (saveSucceeded) {
              // Save succeeded: Apply status but do NOT escalate
              statusApplied.set(target.id, effect.statusEffect)
              console.log(`[CHEST]     Result: ${effect.statusEffect} (no escalation - saved)`)
              messages.push(`${target.name} is ${effect.statusEffect.toLowerCase()}!`)
            } else {
              // Save failed: Apply with potential escalation to STONED
              const finalStatus = escalateStatus(target.status, effect.statusEffect, true)
              statusApplied.set(target.id, finalStatus)
              console.log(`[CHEST]     Result: ${finalStatus}${finalStatus !== effect.statusEffect ? ` (escalated from ${target.status})` : ''}`)

              if (finalStatus === CharacterStatus.STONED && target.status === CharacterStatus.PARALYZED) {
                messages.push(`${target.name} was already paralyzed and turns to stone!`)
              } else {
                messages.push(`${target.name} is ${finalStatus.toLowerCase()}!`)
              }
            }
          } else {
            // SECONDARY CLASS (e.g., SAMURAI/BISHOP for Anti-Mage, BISHOP for Anti-Priest):
            // - Save success: NO effect whatsoever
            // - Save failure: Paralyzed only (NEVER escalates to STONED)
            if (saveSucceeded) {
              console.log(`[CHEST]     Result: Resisted (secondary class saved)`)
              messages.push(`${target.name} resists the trap!`)
              // No status applied - secondary class successfully saved
            } else {
              // Secondary class fails save: Apply status but NEVER escalate
              statusApplied.set(target.id, effect.statusEffect)
              console.log(`[CHEST]     Result: ${effect.statusEffect} (no escalation - secondary class)`)
              messages.push(`${target.name} is ${effect.statusEffect.toLowerCase()}!`)
            }
          }
        } else {
          // Non-class-specific traps or traps without primaryTargetClasses: Original behavior
          if (saveSucceeded) {
            console.log(`[CHEST]     ${target.name}: Resisted status effect`)
            messages.push(`${target.name} resists the ${effect.statusEffect.toLowerCase()}!`)
            continue  // Skip status for this target
          }

          // Authentic Wizardry 1: Status escalation (class-specific vs regular)
          const finalStatus = escalateStatus(target.status, effect.statusEffect, isClassSpecific)
          statusApplied.set(target.id, finalStatus)
          console.log(`[CHEST]     ${target.name}: Status → ${finalStatus}${finalStatus !== effect.statusEffect ? ` (escalated from ${target.status})` : ''}`)

          if (finalStatus === CharacterStatus.STONED && isClassSpecific && target.status === CharacterStatus.PARALYZED) {
            messages.push(`${target.name} was already paralyzed and turns to stone!`)
          } else if (finalStatus === CharacterStatus.DEAD && target.status === effect.statusEffect) {
            messages.push(`${target.name} was already ${effect.statusEffect.toLowerCase()} and dies!`)
          } else {
            messages.push(`${target.name} is ${finalStatus.toLowerCase()}!`)
          }
        }
      }
    }
  }

  // Handle special effects
  if (effect.specialEffect) {
    console.log(`[CHEST]   Special effect: ${effect.specialEffect}`)
    switch (effect.specialEffect) {
      case 'teleport':
        messages.push('The party is teleported to a random location!')
        break
      case 'combat':
        messages.push('An alarm sounds! Monsters approach!')
        break
    }
  }

  return {
    trapId,
    trapName: effect.name,
    damageDealt,
    statusApplied,
    specialEffect: effect.specialEffect,
    message: messages.join(' ')
  }
}

/**
 * Apply trap effects to game state
 *
 * Takes a pending trap result (damage and status effects already calculated)
 * and applies them to the character roster.
 *
 * @param state Current game state
 * @param trapResult The pending trap result from trap triggering
 * @returns New game state with damage and status applied to characters
 */
export function applyTrapEffectsToState(
  state: GameState,
  trapResult: PendingTrapResult
): GameState {
  let newRoster = new Map(state.roster)

  // Apply damage
  for (const [charId, damage] of trapResult.damageDealt) {
    const char = newRoster.get(charId)
    if (char) {
      const newHP = Math.max(0, char.hp - damage)
      const newStatus = newHP <= 0 ? CharacterStatus.DEAD : char.status

      newRoster.set(charId, {
        ...char,
        hp: newHP,
        status: trapResult.statusApplied.get(charId) ?? newStatus
      })
    }
  }

  // Apply status effects (for characters not in damage map)
  for (const [charId, status] of trapResult.statusApplied) {
    const char = newRoster.get(charId)
    if (char && !trapResult.damageDealt.has(charId)) {
      newRoster.set(charId, {
        ...char,
        status
      })
    }
  }

  return {
    ...state,
    roster: newRoster
  }
}

export const TrapEffectService = {
  getTrapEffect,
  calculateTrapDamage,
  escalateStatus,
  applyTrapEffects,
  applyTrapEffectsToState,
}
