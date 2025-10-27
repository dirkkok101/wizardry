/**
 * LeaveTrainingGroundsCommand - Return to Castle Menu
 */

import { SceneType } from '../../../types/SceneType'
import { SaveService } from '../../../services/SaveService'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface LeaveTrainingGroundsContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: LeaveTrainingGroundsContext): Promise<NavigateCommandResult> {
  // Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: 'Transition already in progress'
    }
  }

  try {
    // Auto-save before leaving (Training Grounds is a safe zone)
    await SaveService.saveGame()

    // Navigate back to Castle Menu
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
      fadeTime: 300,
      data: { fromTrainingGrounds: true }
    })

    return { success: true, nextScene: SceneType.CASTLE_MENU }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const LeaveTrainingGroundsCommand = { execute }
