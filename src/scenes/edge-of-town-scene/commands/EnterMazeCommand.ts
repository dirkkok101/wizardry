/**
 * EnterMazeCommand - Navigate from Edge of Town to Camp (dungeon entry)
 * Validates party exists and has no dead members
 */

import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'
import { GameState } from '../../../types/GameState'
import { Character } from '../../../types/Character'
import { CharacterStatus } from '../../../types/CharacterStatus'

export interface EnterMazeContext {
  mode: 'READY' | 'TRANSITIONING'
  gameState: GameState
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: EnterMazeContext): Promise<NavigateCommandResult> {
  // 1. Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'Transition already in progress'
    }
  }

  // 2. Validate party exists
  if (context.gameState.party.members.length === 0) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'You need a party to enter the maze (visit Tavern)'
    }
  }

  // 3. Resolve party member IDs to Character objects
  const partyMembers = context.gameState.party.members
    .map(id => context.gameState.roster.get(id))
    .filter((c): c is Character => c !== undefined)

  // 4. Validate party health (no DEAD/ASHES/LOST_FOREVER members)
  const hasDeadMembers = partyMembers.some(m =>
    m.status === CharacterStatus.DEAD ||
    m.status === CharacterStatus.ASHES ||
    m.status === CharacterStatus.LOST_FOREVER
  )

  if (hasDeadMembers) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'Some party members are dead (visit Temple)'
    }
  }

  // 5. Navigate to Camp
  try {
    await SceneNavigationService.transitionTo(SceneType.CAMP, {
      direction: 'fade'
    })

    return { success: true, nextScene: SceneType.CAMP }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const EnterMazeCommand = { execute }
