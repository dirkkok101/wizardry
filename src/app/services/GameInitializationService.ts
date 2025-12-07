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
import { NumericIdMappingLoader } from './NumericIdMappingLoader'
import { StatModifierService } from './StatModifierService'
import { LoadingProgressService, LoadingStep } from './LoadingProgressService'
import { SpritePreloadService } from './SpritePreloadService'

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
    // dungeon is undefined until party enters maze via DungeonMovementService.enterDungeon()
    // Per GameState.ts: "Optional: undefined when in castle/town"
    dungeon: undefined,
    settings: {
      difficulty: 'NORMAL',
      soundEnabled: true,
      musicEnabled: true,
      encountersEnabled: true // Set to false to disable random encounters for testing
    }
  }
}

/**
 * Helper to report progress if service is provided
 */
function reportStep(progress: LoadingProgressService | undefined, step: LoadingStep): void {
  progress?.startStep(step)
}

function completeStep(progress: LoadingProgressService | undefined, step: LoadingStep): void {
  progress?.completeStep(step)
}

/**
 * Initialize game state and load game data
 *
 * Loads race and class data in parallel for optimal startup performance.
 * Must be called before character creation functionality is used.
 *
 * @param progress Optional progress service for UI updates
 * @throws {Error} If race or class data fails to load
 */
async function initializeGame(progress?: LoadingProgressService): Promise<void> {
  console.log('Initializing game data...')
  progress?.startLoading()

  // Load classes first with Zod validation (required for character creation)
  reportStep(progress, 'classes')
  console.log('Loading classes...')
  await ClassDataLoader.loadAllClasses()
  completeStep(progress, 'classes')

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
  reportStep(progress, 'spells')
  console.log('Loading spells and monsters...')
  await Promise.all([
    SpellDataLoader.loadAllSpells().then(() => completeStep(progress, 'spells')),
    MonsterDataLoader.loadAllMonsters().then(() => completeStep(progress, 'monsters'))
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
  reportStep(progress, 'races')
  try {
    await RaceService.initialize()
    completeStep(progress, 'races')

    // Report race loading statistics
    const raceCount = RaceService.getLoadedCount()
    const totalRaces = RaceService.getTotalCount()
    console.log(`Loaded ${raceCount} races successfully`)
  } catch (error) {
    console.error('Failed to initialize races:', error)
    progress?.error('Failed to load race data')
    throw error // Races are critical, re-throw error
  }

  // Initialize stat modifier service (critical for HP calculations)
  reportStep(progress, 'statModifiers')
  try {
    await StatModifierService.initialize()
    completeStep(progress, 'statModifiers')
  } catch (error) {
    console.error('Failed to initialize stat modifiers:', error)
    progress?.error('Failed to load stat modifiers')
    throw error // Stat modifiers are critical, re-throw error
  }

  // Initialize remaining data services
  reportStep(progress, 'items')
  console.log('Loading items, traps, treasure, and numeric ID mapping...')
  await Promise.all([
    ItemDataLoader.loadAllItems().then(() => completeStep(progress, 'items')),
    TrapDataLoader.loadAllTraps().then(() => completeStep(progress, 'traps')),
    TreasureDataLoader.loadAllRewards().then(() => completeStep(progress, 'treasure')),
    NumericIdMappingLoader.loadMapping()  // Required for treasure item lookups
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

  // Preload sprites (after monster data is loaded so we know which sprites to load)
  reportStep(progress, 'sprites')
  console.log('Preloading sprites...')
  await SpritePreloadService.preloadAllSprites()
  completeStep(progress, 'sprites')

  // Report sprite loading statistics
  const spriteCount = SpritePreloadService.getPreloadedCount()
  const failedSpriteCount = SpritePreloadService.getFailedCount()
  if (failedSpriteCount > 0) {
    console.warn(`Preloaded ${spriteCount} sprites (${failedSpriteCount} failed)`)
  } else {
    console.log(`Preloaded ${spriteCount} sprites successfully`)
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

  reportStep(progress, 'finalizing')
  gameState = createNewGame()
  completeStep(progress, 'finalizing')
  progress?.complete()
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
