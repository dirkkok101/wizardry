/**
 * PitHandler - Handles pit tile effects
 *
 * Pits are traps that deal damage based on character agility.
 * Avoidance: (AGI - Level) × 4%
 * Damage: configurable via pitDamage (default 1d6)
 */

import { TileHandler, TileHandlerContext, TileHandlerResult, createNoEffectResult } from './TileHandler'
import { TileData, TileType, DungeonState } from '@models/Dungeon'
import { GameState } from '@models/GameState'
import { RandomService } from '@services/RandomService'

export class PitHandler implements TileHandler {
  readonly tileType: TileType = 'pit'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('pit') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state, tile } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    // Parse pitDamage notation (default "1d6")
    const damageNotation = tile.pitDamage ?? '1d6'
    const [countStr, sidesStr] = damageNotation.split('d')
    const diceCount = parseInt(countStr, 10) || 1
    const diceSides = parseInt(sidesStr, 10) || 6

    // Apply pit effect to all party members
    const newRoster = new Map(state.roster)
    const hitMessages: string[] = []
    let anyoneHit = false

    for (const memberId of state.party.members) {
      const character = newRoster.get(memberId)
      if (!character) continue
      if (character.hp <= 0) continue // Skip dead characters

      // Calculate avoidance chance: (AGI - Level) × 4%
      const avoidanceChance = (character.agility - dungeon.currentLevel) * 4
      const avoided = RandomService.chance(Math.max(0, avoidanceChance))

      if (!avoided) {
        // Failed to avoid - take damage
        const damage = RandomService.rollDice(diceCount, diceSides)
        newRoster.set(memberId, {
          ...character,
          hp: Math.max(0, character.hp - damage)
        })
        hitMessages.push(`${character.name} takes ${damage} damage!`)
        anyoneHit = true
      }
    }

    const messages: string[] = []
    if (tile.message) {
      messages.push(tile.message)
    }
    if (anyoneHit) {
      messages.push(...hitMessages)
    }

    return {
      state: {
        ...state,
        roster: newRoster
      },
      messages,
      continueProcessing: true,
      entryMessage: tile.message
    }
  }
}
