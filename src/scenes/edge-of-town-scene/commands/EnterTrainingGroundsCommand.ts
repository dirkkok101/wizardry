/**
 * EnterTrainingGroundsCommand - Navigate from Edge of Town to Training Grounds
 */

import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface EnterTrainingGroundsContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: EnterTrainingGroundsContext): Promise<NavigateCommandResult> {
  // Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'Transition already in progress'
    }
  }

  try {
    await SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, {
      direction: 'fade'
    })

    return { success: true, nextScene: SceneType.TRAINING_GROUNDS }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const EnterTrainingGroundsCommand = { execute }
