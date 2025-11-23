/**
 * GameInitializationService - Create new game state
 */

import { isDevMode } from '@angular/core'
import { GameState } from '../types/GameState'
import { SceneType } from '../types/SceneType'
import { RaceService } from './RaceService'
import { ClassService } from './ClassService'
import { ItemDataService } from './ItemDataService'
import { DungeonService } from './DungeonService'
import { SpellDataLoader } from './SpellDataLoader'
import { MonsterDataLoader } from './MonsterDataLoader'

let gameState: GameState | null = null

/**
 * Create a new game with default values
 */
function createNewGame(): GameState {
  return {
    currentScene: SceneType.TITLE_SCREEN,
    roster: new Map(),
    party: {
      members: [],
      formation: {
        frontRow: [],
        backRow: []
      },
      position: {
        level: 1,
        x: 0,
        y: 0,
        facing: 'NORTH'
      },
      light: false,
      gold: 0 // NEW: initialize with 0 gold
    },
    dungeon: {
      currentLevel: 1,
      position: { x: 0, y: 0, facing: 'NORTH' },
      lightActive: true,  // Default torch light enabled
      lightRadius: 3,     // Default torch range
      teleportCount: 0,
      visitedTiles: new Set(),
      defeatedEncounters: [],
      unlockedDoors: new Set(),
      openDoors: new Set()
    },
    settings: {
      difficulty: 'NORMAL',
      soundEnabled: true,
      musicEnabled: true,
      encountersEnabled: true // Set to false to disable random encounters for testing
    }
  }
}

/**
 * Initialize game state and load game data
 *
 * Loads race and class data in parallel for optimal startup performance.
 * Must be called before character creation functionality is used.
 *
 * @throws {Error} If race or class data fails to load
 */
async function initializeGame(): Promise<void> {
  console.log('Initializing game data...')

  // Load spells and monsters in parallel (required for character creation, combat, etc.)
  console.log('Loading spells and monsters...')
  await Promise.all([
    SpellDataLoader.loadAllSpells(),
    MonsterDataLoader.loadAllMonsters()
  ])

  // Report spell loading statistics
  const spellCount = SpellDataLoader.getLoadedCount()
  const failedSpells = SpellDataLoader.getFailedSpells()
  const totalSpells = SpellDataLoader.getTotalCount()

  if (failedSpells.size > 0) {
    console.warn(`Loaded ${spellCount}/${totalSpells} spells (${failedSpells.size} failed)`)
    if (isDevMode()) {
      console.warn('Failed spells:', Array.from(failedSpells.entries()))
    }
  } else {
    console.log(`Loaded ${spellCount} spells successfully`)
  }

  // Report monster loading statistics
  const monsterCount = MonsterDataLoader.getLoadedCount()
  const failedMonsters = MonsterDataLoader.getFailedMonsters()
  const totalMonsters = MonsterDataLoader.getTotalCount()

  if (failedMonsters.size > 0) {
    console.warn(`Loaded ${monsterCount}/${totalMonsters} monsters (${failedMonsters.size} failed)`)
    if (isDevMode()) {
      console.warn('Failed monsters:', Array.from(failedMonsters.entries()))
    }
  } else {
    console.log(`Loaded ${monsterCount} monsters successfully`)
  }

  // Initialize other data services in parallel
  await Promise.all([
    RaceService.initialize(),
    ClassService.initialize(),
    ItemDataService.loadAllItems()
  ])

  console.log('Game data initialized successfully')

  // Validate map data in development mode
  if (isDevMode()) {
    console.log('Validating dungeon maps...')
    const validationErrors: string[] = []

    for (let level = 1; level <= 10; level++) {
      try {
        const levelData = DungeonService.loadLevel(level)
        const errors = DungeonService.validateStairsWalls(levelData)

        if (errors.length > 0) {
          validationErrors.push(`Level ${level}:`)
          validationErrors.push(...errors.map(err => `  ${err}`))
        }
      } catch (error) {
        validationErrors.push(`Level ${level}: Failed to load - ${error}`)
      }
    }

    if (validationErrors.length > 0) {
      console.warn('Map validation errors found:')
      validationErrors.forEach(err => console.warn(err))
    } else {
      console.log('All dungeon maps validated successfully')
    }
  }

  gameState = createNewGame()
}

/**
 * Get current game state
 */
function getGameState(): GameState {
  if (!gameState) {
    gameState = createNewGame()
  }
  return gameState
}

/**
 * Update game state
 */
function updateGameState(newState: GameState): void {
  gameState = newState
}

export const GameInitializationService = {
  createNewGame,
  initializeGame,
  getGameState,
  updateGameState
}
