/**
 * SpecialTileEffectService - Special tile effect handling
 *
 * Handles all special tile effects triggered during movement:
 * - Teleporter: instant transport with loop prevention
 * - Spinner: randomize facing direction
 * - Chute: fall 1-3 levels with damage
 * - Pit: AGI-based damage trap
 * - Darkness zones: light state management
 * - Condition tiles: item/quest requirements
 *
 * @see docs/systems/dungeon-system.md
 */

import { GameState } from '@models/GameState'
import {
  Position,
  Direction,
  TileData,
  TileType,
  SpecialTileResult,
  ConditionResult
} from '@models/Dungeon'
import { DungeonService } from '../DungeonService'
import { RandomService } from '../RandomService'
import { LightService } from '../LightService'
import { TileConditionService } from '../TileConditionService'
import { FightMapService } from '../FightMapService'
import { requireDungeon, tileHasType } from './DungeonCoreMovementService'
import { enterLevel } from './DungeonLevelService'

/**
 * Handle special tile effects (teleporters, spinners, chutes, conditions, etc.)
 * Called after every movement
 *
 * @param state - Current game state (position already updated to new tile)
 * @param tile - The tile data for the new position
 * @param previousPosition - Position before movement (for retreat action)
 * @returns SpecialTileResult with new state, messages, and condition result
 */
export function handleSpecialTile(state: GameState, tile: TileData, previousPosition: Position): SpecialTileResult {
  const dungeon = requireDungeon(state)
  const messages: string[] = []

  console.log(`[Movement] Entering tile (${tile.x}, ${tile.y}), types=[${tile.types?.join(', ') ?? 'none'}], hasCondition=${!!tile.condition}`)

  // Reset teleport count for non-teleporter tiles
  if (!tileHasType(tile, 'teleporter') && dungeon.teleportCount > 0) {
    state = {
      ...state,
      dungeon: { ...dungeon, teleportCount: 0 }
    }
  }

  // =========================================================================
  // CONDITION CHECKING - Must happen before other tile effects
  // =========================================================================
  if (tile.condition) {
    console.log(`[Movement] Tile has condition: ${JSON.stringify(tile.condition)}`)

    // Create tile key for completion tracking
    const tileKey = DungeonService.createTileKey(dungeon.currentLevel, tile.x, tile.y)

    // First check if this conditional tile was already completed
    if (dungeon.completedConditionTiles?.has(tileKey)) {
      console.log(`[Movement] Conditional tile ${tileKey} already completed, skipping condition`)
      const conditionResult: ConditionResult = { status: 'already_completed' }
      const lightState = processLightState(state, tile.types)
      return { newState: lightState, messages, conditionResult }
    }

    // Also check if encounter was already defeated (for tiles with encounterId)
    if (tile.encounterId && dungeon.defeatedEncounters.includes(tile.encounterId)) {
      // Already completed - no condition check needed, continue normally
      console.log(`[Movement] Encounter ${tile.encounterId} already completed, skipping condition`)
      const conditionResult: ConditionResult = { status: 'already_completed' }
      const lightState = processLightState(state, tile.types)
      return { newState: lightState, messages, conditionResult }
    }

    // Check the condition
    const conditionMet = TileConditionService.checkCondition(tile.condition, state)
    console.log(`[Movement] Condition result: ${conditionMet ? 'PASS' : 'FAIL'}`)

    if (!conditionMet && tile.onConditionFail) {
      // Condition FAILED - return failure result
      console.log(`[Movement] Executing fail action: ${tile.onConditionFail.action}`)
      const fail = tile.onConditionFail
      const conditionResult: ConditionResult = {
        status: 'fail',
        message: fail.message,
        messageStyle: fail.messageStyle ?? 'letterbox',
        entryMessage: tile.message,  // Always shown before condition message
        failAction: fail.action,
        failDestination: fail.destination,
        previousPosition
      }
      // Note: Position is NOT reverted here - MazeComponent handles retreat after showing message
      return { newState: state, messages, conditionResult }
    }

    if (conditionMet) {
      // Condition PASSED - consume item and mark tile as completed
      console.log(`[Movement] Condition passed, consuming item and marking tile complete`)

      // Consume the required item (for has_item conditions)
      let updatedState = TileConditionService.consumeConditionItem(tile.condition, state)

      // Mark this conditional tile as completed
      const updatedDungeon = updatedState.dungeon!
      const newCompletedTiles = new Set(updatedDungeon.completedConditionTiles ?? [])
      newCompletedTiles.add(tileKey)

      // Track consumed item ID (prevents re-awarding from searchable tiles)
      const newConsumedItems = new Set(updatedDungeon.consumedConditionItems ?? [])
      if (tile.condition.type === 'has_item' && tile.condition.itemId) {
        newConsumedItems.add(tile.condition.itemId)
        console.log(`[Movement] Tracking consumed item: "${tile.condition.itemId}"`)
      }

      updatedState = {
        ...updatedState,
        dungeon: {
          ...updatedDungeon,
          completedConditionTiles: newCompletedTiles,
          consumedConditionItems: newConsumedItems
        }
      }

      // Return success result
      const suppressMessage = isEncounterComplete(tile, dungeon.currentLevel, tile.x, tile.y)
      const success = tile.onConditionSuccess
      const conditionResult: ConditionResult = {
        status: 'success',
        message: suppressMessage ? undefined : success?.message,
        messageStyle: success?.messageStyle ?? 'letterbox',
        entryMessage: suppressMessage ? undefined : tile.message,
        encounterId: suppressMessage ? undefined : tile.encounterId  // Also skip encounter trigger
      }
      const lightState = processLightState(updatedState, tile.types)
      return { newState: lightState, messages, conditionResult }
    }
  }

  // =========================================================================
  // STANDARD SPECIAL TILE HANDLING
  // =========================================================================

  // Handle special tile types (using includes() since tiles can have multiple types)
  if (tileHasType(tile, 'teleporter')) {
    return { newState: handleTeleporter(state, tile), messages }
  }

  if (tileHasType(tile, 'spinner')) {
    return { newState: handleSpinner(state), messages }
  }

  if (tileHasType(tile, 'chute')) {
    return { newState: handleChute(state), messages }
  }

  if (tileHasType(tile, 'pit')) {
    if (tile.message) {
      messages.push(tile.message)
    }
    return { newState: handlePit(state, tile), messages }
  }

  if (tileHasType(tile, 'stairs_up')) {
    if (dungeon.currentLevel > 1) {
      return { newState: enterLevel(state, dungeon.currentLevel - 1, 'STAIRS_UP'), messages }
    }
    return { newState: state, messages }
  }

  if (tileHasType(tile, 'stairs_down')) {
    if (dungeon.currentLevel < 10) {
      return { newState: enterLevel(state, dungeon.currentLevel + 1, 'STAIRS_DOWN'), messages }
    }
    return { newState: state, messages }
  }

  if (tileHasType(tile, 'elevator')) {
    // Process light state (handles leaving darkness zone) then UI handles level selection
    return { newState: processLightState(state, tile.types), messages }
  }

  // Process light state for all other tiles (handles darkness zones, duration decrement)
  // Includes: darkness, darkness_zone_start, anti_magic, message, searchable, fixed_encounter

  // Suppress entry message for:
  // 1. Active fixed_encounter tiles (checkForEncounter handles message + encounter together)
  // 2. Completed non-repeatable fixed encounters (already handled by isEncounterComplete)
  const fixedConfig = tileHasType(tile, 'fixed_encounter')
    ? FightMapService.getFixedEncounterConfig(dungeon.currentLevel, tile.x, tile.y)
    : undefined
  const isActiveFixedEncounter = fixedConfig && fixedConfig.encounterId && !fixedConfig.triggered
  const suppressMessage = isActiveFixedEncounter || isEncounterComplete(tile, dungeon.currentLevel, tile.x, tile.y)

  return {
    newState: processLightState(state, tile.types),
    messages,
    entryMessage: suppressMessage ? undefined : tile.message
  }
}

/**
 * Process light state after movement to a tile.
 * Handles darkness zone transitions and light duration decrement.
 *
 * @returns Object with updated state and any messages to display
 */
export function processLightState(state: GameState, newTileTypes: TileType[] | undefined): GameState {
  const dungeon = requireDungeon(state)
  const isNowInDarkness = LightService.isDarknessTile(newTileTypes)
  const wasInDarkness = dungeon.inDarknessZone

  // Case 1: Entering darkness zone
  if (!wasInDarkness && isNowInDarkness) {
    const result = LightService.enterDarknessZone(dungeon)
    return {
      ...state,
      dungeon: result.state
    }
  }

  // Case 2: Exiting darkness zone
  if (wasInDarkness && !isNowInDarkness) {
    const exitedState = LightService.exitDarknessZone(dungeon)
    // Also decrement light duration after exiting
    const decrementResult = LightService.decrementLightDuration(exitedState)
    return {
      ...state,
      dungeon: decrementResult.state
    }
  }

  // Case 3: Moving in normal zone - decrement light duration
  if (!isNowInDarkness) {
    const result = LightService.decrementLightDuration(dungeon)
    return {
      ...state,
      dungeon: result.state
    }
  }

  // Case 4: Moving within darkness zone - no change
  return state
}

/**
 * Handle teleporter tile - instant transport with loop prevention
 */
export function handleTeleporter(state: GameState, tile: TileData): GameState {
  const dungeon = requireDungeon(state)

  // Prevent infinite loops - max 3 consecutive teleports
  if (dungeon.teleportCount >= 3) {
    return state
  }

  if (!tile.destination) {
    return state
  }

  return {
    ...state,
    dungeon: {
      ...dungeon,
      position: {
        ...dungeon.position,
        x: tile.destination.x!,
        y: tile.destination.y!,
      },
      teleportCount: dungeon.teleportCount + 1,
    }
  }
}

/**
 * Handle spinner tile - randomize facing direction
 */
export function handleSpinner(state: GameState): GameState {
  const dungeon = requireDungeon(state)
  const directions: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST']
  const randomDirection = RandomService.pickRandom(directions)

  return {
    ...state,
    dungeon: {
      ...dungeon,
      position: {
        ...dungeon.position,
        facing: randomDirection,
      }
    }
  }
}

/**
 * Handle chute tile - fall 1-3 levels with 1d6 damage per level
 * Research: docs/systems/dungeon-system.md:449-476
 */
export function handleChute(state: GameState): GameState {
  const dungeon = requireDungeon(state)

  // Roll for fall distance (1-3 levels)
  const levelsFallen = RandomService.random(1, 3)
  const newLevel = Math.min(10, dungeon.currentLevel + levelsFallen)

  // Calculate damage (1d6 per level fallen)
  const actualFall = newLevel - dungeon.currentLevel
  const damagePerCharacter: Map<string, number> = new Map()

  for (const memberId of state.party.members) {
    let totalDamage = 0
    for (let i = 0; i < actualFall; i++) {
      totalDamage += RandomService.rollDie(6) // 1d6
    }
    damagePerCharacter.set(memberId, totalDamage)
  }

  // Apply damage to all party members
  const newRoster = new Map(state.roster)
  for (const [memberId, damage] of damagePerCharacter) {
    const character = newRoster.get(memberId)!
    newRoster.set(memberId, {
      ...character,
      hp: Math.max(0, character.hp - damage),
    })
  }

  return {
    ...state,
    roster: newRoster,
    dungeon: {
      ...dungeon,
      currentLevel: newLevel,
    }
  }
}

/**
 * Handle pit tile - AGI-based damage trap (no level change)
 * Avoidance: (AGI - Level) x 4%
 * Failure: pitDamage (default 1d6)
 */
export function handlePit(state: GameState, tile?: TileData): GameState {
  const dungeon = requireDungeon(state)
  const newRoster = new Map(state.roster)

  // Parse pitDamage (default "1d6")
  const damageNotation = tile?.pitDamage ?? '1d6'
  const [countStr, sidesStr] = damageNotation.split('d')
  const count = parseInt(countStr, 10) || 1
  const sides = parseInt(sidesStr, 10) || 6

  for (const memberId of state.party.members) {
    const character = newRoster.get(memberId)!

    // Calculate avoidance chance: (AGI - Level) x 4%
    const avoidanceChance = (character.agility - dungeon.currentLevel) * 4
    const avoided = RandomService.chance(avoidanceChance)

    // Failed avoidance - take damage based on pitDamage
    if (!avoided) {
      const damage = RandomService.rollDice(count, sides)
      newRoster.set(memberId, {
        ...character,
        hp: Math.max(0, character.hp - damage),
      })
    }
  }

  return {
    ...state,
    roster: newRoster,
  }
}

/**
 * Check if a tile's non-repeatable fixed encounter has been completed
 * Used to suppress entry messages after victory
 */
export function isEncounterComplete(tile: TileData, level: number, x: number, y: number): boolean {
  if (!tile.types?.includes('fixed_encounter')) return false
  if (tile.repeatable !== false) return false  // repeatable=true or undefined means always show

  // Check if encounter has been triggered (getFixedEncounterConfig returns undefined when triggered)
  return FightMapService.getFixedEncounterConfig(level, x, y) === undefined
}

export const SpecialTileEffectService = {
  handleSpecialTile,
  processLightState,
  handleTeleporter,
  handleSpinner,
  handleChute,
  handlePit,
  isEncounterComplete,
}
