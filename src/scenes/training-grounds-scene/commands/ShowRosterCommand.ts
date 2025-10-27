/**
 * ShowRosterCommand - Show character roster in view-only mode (STUB)
 */

import { SceneType } from '../../../types/SceneType'

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
    console.log('[STUB] ShowRosterCommand - Would show character roster in view-only mode')
    // TODO: Implement after Character List scene exists
    // const state = GameInitializationService.getGameState()
    // const characters = CharacterService.getAllCharacters(state)
    // await SceneNavigationService.transitionTo(SceneType.CHARACTER_LIST, {
    //   fadeTime: 300,
    //   data: {
    //     characters,
    //     mode: 'view-only',
    //     title: 'CHARACTER ROSTER'
    //   }
    // })

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
