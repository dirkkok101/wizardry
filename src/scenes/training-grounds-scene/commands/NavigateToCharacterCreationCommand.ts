/**
 * NavigateToCharacterCreationCommand - Navigate to Character Creation
 */

import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface NavigateToCharacterCreationContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: NavigateToCharacterCreationContext): Promise<NavigateCommandResult> {
  // Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: 'Transition already in progress'
    }
  }

  try {
    await SceneNavigationService.transitionTo(SceneType.CHARACTER_CREATION, {
      direction: 'fade'
    })

    return { success: true, nextScene: SceneType.CHARACTER_CREATION }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToCharacterCreationCommand = { execute }
