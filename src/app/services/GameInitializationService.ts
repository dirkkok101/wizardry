/**
 * GameInitializationService - Create new game state
 */

import { isDevMode } from '@angular/core'
import { GameState } from '@models/GameState'
import { SceneType } from '@models/SceneType'
import { RaceService } from './RaceService'
import { ItemDataLoader } from './ItemDataLoader'
import { DungeonService } from './DungeonService'
import { SpellDataLoader } from './SpellDataLoader'
import { MonsterDataLoader } from './MonsterDataLoader'
import { ClassDataLoader } from './ClassDataLoader'
import { TrapDataLoader } from './TrapDataLoader'
import { TreasureDataLoader } from './TreasureDataLoader'
import { StatModifierService } from './StatModifierService'

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

  // Load classes first with Zod validation (required for character creation)
  console.log('Loading classes...')
  await ClassDataLoader.loadAllClasses()

  // Report class loading statistics
  const classCount = ClassDataLoader.getLoadedCount()
  const failedClasses = ClassDataLoader.getFailedClasses()
  const totalClasses = ClassDataLoader.getTotalCount()

  if (failedClasses.size > 0) {
    console.warn(`Loaded ${classCount}/${totalClasses} classes (${failedClasses.size} failed)`)
    if (isDevMode()) {
      console.warn('Failed classes:', Array.from(failedClasses.entries()))
    }
  } else {
    console.log(`Loaded ${classCount} classes successfully`)
  }

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

  // Initialize race service (critical - must succeed)
  try {
    await RaceService.initialize()

    // Report race loading statistics
    const raceCount = RaceService.getLoadedCount()
    const totalRaces = RaceService.getTotalCount()
    console.log(`Loaded ${raceCount} races successfully`)
  } catch (error) {
    console.error('Failed to initialize races:', error)
    throw error // Races are critical, re-throw error
  }

  // Initialize stat modifier service (critical for HP calculations)
  try {
    await StatModifierService.initialize()
  } catch (error) {
    console.error('Failed to initialize stat modifiers:', error)
    throw error // Stat modifiers are critical, re-throw error
  }

  // Initialize remaining data services
  console.log('Loading items, traps, and treasure...')
  await Promise.all([
    ItemDataLoader.loadAllItems(),
    TrapDataLoader.loadAllTraps(),
    TreasureDataLoader.loadAllRewards()
  ])

  // Report item loading statistics
  const itemCount = ItemDataLoader.getLoadedCount()
  const failedItems = ItemDataLoader.getFailedItems()
  const totalItems = ItemDataLoader.getTotalCount()

  if (failedItems.size > 0) {
    console.warn(`Loaded ${itemCount}/${totalItems} items (${failedItems.size} failed)`)
    if (isDevMode()) {
      console.warn('Failed items:', Array.from(failedItems.entries()))
    }
  } else {
    console.log(`Loaded ${itemCount} items successfully`)
  }

  // Report trap loading statistics
  const trapCount = TrapDataLoader.getLoadedCount()
  const failedTraps = TrapDataLoader.getFailedTraps()
  const totalTraps = TrapDataLoader.getTotalCount()

  if (failedTraps.size > 0) {
    console.warn(`Loaded ${trapCount}/${totalTraps} traps (${failedTraps.size} failed)`)
    if (isDevMode()) {
      console.warn('Failed traps:', Array.from(failedTraps.entries()))
    }
  } else {
    console.log(`Loaded ${trapCount} traps successfully`)
  }

  console.log('Game data initialized successfully')

  // Validate map data in development mode
  if (isDevMode()) {
    console.log('Validating dungeon maps...')
    const validationErrors: string[] = []

    for (let level = 1; level <= 10; level++) {
      try {
        // Just try to load each level to verify it exists and parses correctly
        DungeonService.loadLevel(level)
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
