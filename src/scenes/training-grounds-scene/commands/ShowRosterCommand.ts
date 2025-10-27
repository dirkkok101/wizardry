/**
 * ShowRosterCommand - Show character roster in view-only mode
 */

import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'
import { Character } from '../../../types/Character'

export interface ShowRosterContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: ShowRosterContext): Promise<NavigateCommandResult> {
  // Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: 'Transition already in progress'
    }
  }

  try {
    // Navigate to CHARACTER_LIST scene with roster configuration
    await SceneNavigationService.transitionTo(SceneType.CHARACTER_LIST, {
      fadeTime: 300,
      data: {
        title: 'CHARACTER ROSTER',
        emptyMessage: 'No characters in roster',
        filter: null, // Show all characters
        onSelect: (character: Character) => {
          // Navigate to character inspection
          SceneNavigationService.transitionTo(SceneType.CHARACTER_INSPECTION, {
            fadeTime: 300,
            data: {
              character,
              mode: 'inspect',
              returnTo: SceneType.CHARACTER_LIST
            }
          })
        },
        returnTo: SceneType.TRAINING_GROUNDS
      }
    })

    return { success: true, nextScene: SceneType.CHARACTER_LIST }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const ShowRosterCommand = { execute }
