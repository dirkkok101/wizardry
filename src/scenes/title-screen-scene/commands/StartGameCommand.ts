/**
 * StartGameCommand - Execute game start from title screen
 */

import { SceneType } from '../../../types/SceneType'
import { GameState } from '../../../types/GameState'
import { SaveService } from '../../../services/SaveService'
import { GameInitializationService } from '../../../services/GameInitializationService'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface StartGameContext {
  assetsLoaded: boolean
  saveDataDetected?: boolean
  mode?: 'LOADING' | 'READY' | 'TRANSITIONING'
}

export interface CommandResult {
  success: boolean
  nextScene: SceneType
  gameState?: GameState
  error?: string
  metadata?: {
    isNewGame: boolean
    loadTime?: number
  }
}

/**
 * Check if command can execute
 */
function canExecute(context: StartGameContext): boolean {
  return context.assetsLoaded === true
}

/**
 * Execute the start game command
 */
async function execute(context: StartGameContext): Promise<CommandResult> {
  // 1. Validate
  if (!canExecute(context)) {
    return {
      success: false,
      nextScene: SceneType.TITLE_SCREEN,
      error: 'Assets not loaded - cannot start game'
    }
  }

  const startTime = Date.now()

  try {
    // 2. Check for save
    const saveExists = await SaveService.checkForSaveData()

    // 3. Load or create
    let gameState: GameState
    let isNewGame: boolean

    if (saveExists) {
      try {
        gameState = await SaveService.loadGame()
        isNewGame = false
      } catch (error) {
        console.error('Save corrupted, creating new game:', error)
        gameState = GameInitializationService.createNewGame()
        isNewGame = true
      }
    } else {
      gameState = GameInitializationService.createNewGame()
      isNewGame = true
    }

    // 4. Determine destination
    const destination = gameState.party.inMaze
      ? SceneType.CAMP
      : SceneType.CASTLE_MENU

    // 5. Transition
    await SceneNavigationService.transitionTo(destination, {
      fadeTime: 300,
      data: { isNewGame }
    })

    // 6. Return success
    const loadTime = Date.now() - startTime
    return {
      success: true,
      nextScene: destination,
      gameState,
      metadata: { isNewGame, loadTime }
    }
  } catch (error) {
    console.error('StartGameCommand failed:', error)
    return {
      success: false,
      nextScene: SceneType.TITLE_SCREEN,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export const StartGameCommand = {
  canExecute,
  execute
}
