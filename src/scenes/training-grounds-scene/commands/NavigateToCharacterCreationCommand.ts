/**
 * NavigateToCharacterCreationCommand - Navigate to Character Creation (STUB)
 */

import { SceneType } from '../../../types/SceneType'

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
    console.log('[STUB] NavigateToCharacterCreationCommand - Would navigate to character creation')
    // TODO: Implement after Character Creation scene exists
    // await SaveService.saveGame()
    // await SceneNavigationService.transitionTo(SceneType.CHARACTER_CREATION, {
    //   fadeTime: 300,
    //   data: { fromTrainingGrounds: true }
    // })

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
