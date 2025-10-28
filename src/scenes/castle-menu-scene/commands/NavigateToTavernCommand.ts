/**
 * NavigateToTavernCommand - Navigate from Castle Menu to Tavern
 */

import { SceneType } from '../../../types/SceneType'
import { SaveService } from '../../../services/SaveService'
import { SceneNavigationService } from '../../../services/SceneNavigationService'
import { GameInitializationService } from '../../../services/GameInitializationService'

export interface NavigateToTavernContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: NavigateToTavernContext): Promise<NavigateCommandResult> {
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
    await SceneNavigationService.transitionTo(SceneType.TAVERN, {
      fadeTime: 300,
      data: { fromCastle: true }
    })

    return { success: true, nextScene: SceneType.TAVERN }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.CASTLE_MENU,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToTavernCommand = { execute }
