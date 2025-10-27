/**
 * ReturnToCastleCommand - Navigate from Edge of Town to Castle Menu
 */

import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface ReturnToCastleContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: ReturnToCastleContext): Promise<NavigateCommandResult> {
  // Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'Transition already in progress'
    }
  }

  try {
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
      direction: 'fade'
    })

    return { success: true, nextScene: SceneType.CASTLE_MENU }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const ReturnToCastleCommand = { execute }
