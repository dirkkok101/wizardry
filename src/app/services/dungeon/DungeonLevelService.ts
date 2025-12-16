/**
 * DungeonLevelService - Level transitions and dungeon entry
 *
 * Handles level management:
 * - Enter dungeon from castle (initial state setup)
 * - Enter a new level (stairs up/down, elevator, chute)
 * - Handle stairs transition from wall-based stairs
 * - Find entry tiles on levels
 *
 * @see docs/services/DungeonMovementService.md
 */

import { GameState } from '@models/GameState'
import { Position, LevelData, TileType, Destination } from '@models/Dungeon'
import { DungeonService } from '../DungeonService'
import { LightService } from '../LightService'
import { requireDungeon } from './DungeonCoreMovementService'

/**
 * Initialize dungeon state when entering from camp
 * Sets default position and enables torch light
 * Preserves existing position when re-entering the same level
 * Preserves expedition-wide state (completed tiles, looted tiles, etc.) across level changes
 */
export function enterDungeon(state: GameState, level: number): GameState {
  const existingDungeon = state.dungeon
  const hasExistingState = existingDungeon !== undefined && existingDungeon !== null
  const isSameLevelReEntry = hasExistingState && existingDungeon.currentLevel === level

  // Expedition-wide state persists across level changes within the same dungeon visit
  // This allows conditions like "used silver_key at level 2" to be remembered
  // even when re-entering the dungeon at level 1
  // Note: visitedTiles uses "x,y" format (per-level), so it resets with level change
  // Fields using "level_x_y" format persist across levels
  const expeditionState = hasExistingState ? {
    completedConditionTiles: existingDungeon.completedConditionTiles ?? new Set<string>(),
    consumedConditionItems: existingDungeon.consumedConditionItems ?? new Set<string>(),
    defeatedEncounters: existingDungeon.defeatedEncounters ?? [],
    lootedTiles: existingDungeon.lootedTiles ?? new Set<string>(),
    unlockedDoors: existingDungeon.unlockedDoors ?? new Set<string>(),
    latumapicActive: existingDungeon.latumapicActive ?? false,
    expeditionAcBuff: existingDungeon.expeditionAcBuff ?? 0,
    activeExpeditionSpells: existingDungeon.activeExpeditionSpells ?? [],
  } : {
    completedConditionTiles: new Set<string>(),
    consumedConditionItems: new Set<string>(),
    defeatedEncounters: [],
    lootedTiles: new Set<string>(),
    unlockedDoors: new Set<string>(),
    latumapicActive: false,
    expeditionAcBuff: 0,
    activeExpeditionSpells: [],
  }

  const newState: GameState = {
    ...state,
    dungeon: isSameLevelReEntry ? {
      // Same level re-entry: preserve position and all progress
      ...existingDungeon,
      currentLevel: level
    } : {
      // Different level or first entry: reset position but preserve expedition state
      currentLevel: level,
      position: { x: 0, y: 0, facing: 'NORTH' },  // Default start position
      lightRadius: 3,  // Default view distance (no spell active)
      lightActive: false,  // Party starts in darkness (must cast MILWA)
      lightSpellType: undefined,
      lightDurationRemaining: undefined,
      inDarknessZone: false,
      teleportCount: 0,
      visitedTiles: new Set<string>(),  // Reset per level (uses "x,y" format)
      openDoors: new Set<string>(),  // Open doors reset per level visit
      pendingCampEncounter: undefined,
      ...expeditionState,
    }
  }

  return newState
}

/**
 * Find first tile of given type in level
 */
export function findTileOfType(level: LevelData, type: TileType): Position | undefined {
  for (const tile of level.tiles) {
    if (tile.types?.includes(type)) {
      return { x: tile.x, y: tile.y, facing: 'NORTH' }
    }
  }
  return undefined
}

/**
 * Change dungeon level (stairs, elevator, chute)
 * Sets position to appropriate entry point on new level
 */
export function enterLevel(
  state: GameState,
  newLevel: number,
  entryType: 'STAIRS_UP' | 'STAIRS_DOWN' | 'ELEVATOR' | 'CHUTE'
): GameState {
  const dungeon = requireDungeon(state)

  // Clamp level to 1-10
  newLevel = Math.max(1, Math.min(10, newLevel))

  // Load new level to find entry position
  const level = DungeonService.loadLevel(newLevel)

  // Find appropriate entry tile
  let entryPosition: Position | undefined

  if (entryType === 'STAIRS_DOWN' || entryType === 'CHUTE') {
    // Find stairs_up tile on new level
    entryPosition = findTileOfType(level, 'stairs_up')
  } else if (entryType === 'STAIRS_UP') {
    // Find stairs_down tile on new level
    entryPosition = findTileOfType(level, 'stairs_down')
  } else if (entryType === 'ELEVATOR') {
    // Find elevator tile on new level
    entryPosition = findTileOfType(level, 'elevator')
  }

  // If no entry tile found, use current position
  if (!entryPosition) {
    entryPosition = { ...dungeon.position }
  }

  // Maintain facing direction
  entryPosition.facing = dungeon.position.facing

  // Get destination tile to check for darkness
  const destTile = DungeonService.getTile(level, entryPosition.x, entryPosition.y)
  const isDestDarkness = LightService.isDarknessTile(destTile.types)

  // Update dungeon state with new level, position, and correct darkness state
  return {
    ...state,
    dungeon: {
      ...dungeon,
      currentLevel: newLevel,
      position: entryPosition,
      // Reset darkness state based on destination tile (not carry over from previous)
      inDarknessZone: isDestDarkness,
      // If entering darkness, extinguish light
      ...(isDestDarkness && dungeon.lightActive ? {
        lightActive: false,
        lightSpellType: undefined,
        lightDurationRemaining: undefined,
      } : {})
    }
  }
}

/**
 * Handle stairs transition from wall-based stairs
 * @param state Current game state
 * @param destination Destination data from tile
 * @returns Updated game state (or state indicating castle transition)
 */
export function handleStairsTransition(state: GameState, destination: Destination | undefined): GameState {
  // Validate destination exists
  if (!destination) {
    return state
  }

  // Handle stairs_up (to castle)
  if (destination.type === 'castle') {
    // Return state with dungeon: undefined to indicate castle transition
    // Component will handle actual scene transition
    return {
      ...state,
      dungeon: undefined
    }
  }

  // Handle stairs_down (to another level)
  if (destination.level !== undefined) {
    const dungeon = requireDungeon(state)
    const targetX = destination.x ?? 0
    const targetY = destination.y ?? 0
    const targetFacing = dungeon.position.facing

    return {
      ...state,
      dungeon: {
        ...dungeon,
        currentLevel: destination.level,
        position: {
          x: targetX,
          y: targetY,
          facing: targetFacing
        }
      }
    }
  }

  // Fallback - no valid destination
  return state
}

export const DungeonLevelService = {
  enterDungeon,
  findTileOfType,
  enterLevel,
  handleStairsTransition,
}
