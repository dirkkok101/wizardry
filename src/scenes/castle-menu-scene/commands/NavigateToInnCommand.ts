/**
 * NavigateToInnCommand - Navigate from Castle Menu to Inn
 */

import { SceneType } from '../../../types/SceneType'
import { SaveService } from '../../../services/SaveService'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface NavigateToInnContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: NavigateToInnContext): Promise<NavigateCommandResult> {
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
    await SaveService.saveGame()

    // 3. Navigate to destination
    await SceneNavigationService.transitionTo(SceneType.INN, {
      fadeTime: 300,
      data: { fromCastle: true }
    })

    return { success: true, nextScene: SceneType.INN }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.CASTLE_MENU,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToInnCommand = { execute }
