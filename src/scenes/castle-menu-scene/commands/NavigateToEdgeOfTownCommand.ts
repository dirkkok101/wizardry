/**
 * NavigateToEdgeOfTownCommand - Navigate from Castle Menu to Edge of Town
 */

import { SceneType } from '../../../types/SceneType'
import { SaveService } from '../../../services/SaveService'
import { SceneNavigationService } from '../../../services/SceneNavigationService'
import { GameInitializationService } from '../../../services/GameInitializationService'

export interface NavigateToEdgeOfTownContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: NavigateToEdgeOfTownContext): Promise<NavigateCommandResult> {
  // 1. Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.CASTLE_MENU,
      error: 'Transition already in progress'
    }
  }

  try {
    // 2. Auto-save before transition
    const gameState = GameInitializationService.getGameState()
    await SaveService.saveGame(gameState)

    // 3. Navigate to destination
    await SceneNavigationService.transitionTo(SceneType.EDGE_OF_TOWN, {
      fadeTime: 300,
      data: { fromCastle: true }
    })

    return { success: true, nextScene: SceneType.EDGE_OF_TOWN }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.CASTLE_MENU,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToEdgeOfTownCommand = { execute }
