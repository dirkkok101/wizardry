/**
 * ChuteHandler - Handles chute tile effects
 *
 * Chutes cause the party to fall 1-3 levels down.
 * Each level fallen causes 1d6 damage to all party members.
 */

import { TileHandler, TileHandlerContext, TileHandlerResult, createNoEffectResult } from './TileHandler'
import { TileData, TileType, DungeonState } from '@models/Dungeon'
import { GameState } from '@models/GameState'
import { RandomService } from '@services/RandomService'

export class ChuteHandler implements TileHandler {
  readonly tileType: TileType = 'chute'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('chute') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    // Roll for fall distance (1-3 levels)
    const levelsFallen = RandomService.random(1, 3)
    const newLevel = Math.min(10, dungeon.currentLevel + levelsFallen)
    const actualFall = newLevel - dungeon.currentLevel

    if (actualFall === 0) {
      // Already at level 10, can't fall further
      return createNoEffectResult(state)
    }

    // Calculate and apply damage (1d6 per level fallen)
    const newRoster = new Map(state.roster)
    const messages: string[] = [`You fall ${actualFall} level${actualFall > 1 ? 's' : ''}!`]

    for (const memberId of state.party.members) {
      const character = newRoster.get(memberId)
      if (!character) continue

      let totalDamage = 0
      for (let i = 0; i < actualFall; i++) {
        totalDamage += RandomService.rollDie(6)
      }

      if (totalDamage > 0) {
        newRoster.set(memberId, {
          ...character,
          hp: Math.max(0, character.hp - totalDamage)
        })
      }
    }

    const newState: GameState = {
      ...state,
      roster: newRoster,
      dungeon: {
        ...dungeon,
        currentLevel: newLevel
      }
    }

    return {
      state: newState,
      messages,
      continueProcessing: true
    }
  }
}
