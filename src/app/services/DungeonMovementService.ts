import { GameState } from '@models/GameState'
import { Position, Direction, DungeonState, TileData, TileType, LevelData, Destination } from '@models/Dungeon'
import { DungeonService } from './DungeonService'
import { RandomService } from './RandomService'
import { LightService } from './LightService'

/**
 * DungeonMovementService - Pure function service for dungeon navigation logic
 *
 * Handles all movement-related state changes in the dungeon:
 * - Movement (forward, backward, strafe)
 * - Turning (left, right)
 * - Level transitions (stairs, chutes, elevators)
 * - Special tile effects (teleporters, spinners, pits)
 *
 * Note: This is distinct from SceneNavigationService which handles route navigation.
 */
export const DungeonMovementService = {
  /**
   * Type guard to check if dungeon is DungeonState
   */
  isDungeonState(dungeon: any): dungeon is DungeonState {
    return dungeon && 'position' in dungeon
  },

  /**
   * Assert that dungeon state exists and is valid
   * @throws Error if dungeon state is not initialized
   */
  requireDungeon(state: GameState): DungeonState {
    if (!state.dungeon || !this.isDungeonState(state.dungeon)) {
      throw new Error('Operation requires dungeon state but dungeon is not initialized')
    }
    return state.dungeon
  },

  /**
   * Initialize dungeon state when entering from camp
   * Sets default position and enables torch light
   * Preserves existing position and progress when re-entering the same level
   */
  enterDungeon(state: GameState, level: number): GameState {
    const existingDungeon = state.dungeon;
    const isReEntry = existingDungeon && existingDungeon.currentLevel === level;

    const newState: GameState = {
      ...state,
      dungeon: isReEntry ? {
        // Re-entry to same level: preserve position and progress
        ...existingDungeon,
        currentLevel: level
      } : {
        // First entry or level change: initialize fresh
        currentLevel: level,
        position: { x: 0, y: 0, facing: 'NORTH' },  // Default start position
        lightRadius: 3,  // Default view distance (no spell active)
        lightActive: false,  // Party starts in darkness (must cast MILWA)
        lightSpellType: undefined,
        lightDurationRemaining: undefined,
        inDarknessZone: false,
        teleportCount: 0,
        visitedTiles: new Set<string>(),
        defeatedEncounters: [],
        unlockedDoors: new Set<string>(),
        openDoors: new Set<string>()
      }
    };

    return newState;
  },

  /**
   * Move party forward one tile (immutable state update)
   */
  moveForward(state: GameState): GameState {
    if (!state.dungeon || !this.isDungeonState(state.dungeon)) {
      throw new Error('Dungeon state not initialized or not in maze')
    }

    const currentPos = state.dungeon.position
    const level = DungeonService.loadLevel(state.dungeon.currentLevel)

    // Check for special action triggers BEFORE updating position
    // This only checks for stairs walls, not general movement validation
    const validation = DungeonService.canMove(level, currentPos, 'FORWARD', state.dungeon.openDoors, state.dungeon.currentLevel)

    if (validation.triggersSpecialAction === 'stairs') {
      return this.handleStairsTransition(state, validation.destination)
    }

    // Normal movement: calculate new position
    // Note: Wall validation is done by MazeComponent before calling this method
    const nextPos = this.getNextPosition(currentPos, currentPos.facing, false)

    let newState: GameState = {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: nextPos
      }
    }

    // Trigger special tile effects
    const tile = DungeonService.getTile(level, nextPos.x, nextPos.y)
    newState = this.handleSpecialTile(newState, tile)

    return newState
  },

  /**
   * Get direction delta for facing direction
   * @param facing Current facing direction
   * @returns {x, y} delta for movement in that direction
   */
  getFacingDelta(facing: Direction): { x: number; y: number } {
    switch (facing) {
      case 'NORTH':
        return { x: 0, y: 1 }
      case 'SOUTH':
        return { x: 0, y: -1 }
      case 'EAST':
        return { x: 1, y: 0 }
      case 'WEST':
        return { x: -1, y: 0 }
    }
  },

  /**
   * Calculate next position based on direction and movement
   * @param position Current position
   * @param direction Direction to move (NORTH/SOUTH/EAST/WEST)
   * @param reverse If true, move opposite direction
   */
  getNextPosition(position: Position, direction: Direction, reverse: boolean): Position {
    let { x, y } = position
    const multiplier = reverse ? -1 : 1

    switch (direction) {
      case 'NORTH':
        y = this.wrapCoordinate(y + (1 * multiplier), 20)
        break
      case 'SOUTH':
        y = this.wrapCoordinate(y - (1 * multiplier), 20)
        break
      case 'EAST':
        x = this.wrapCoordinate(x + (1 * multiplier), 20)
        break
      case 'WEST':
        x = this.wrapCoordinate(x - (1 * multiplier), 20)
        break
    }

    return { x, y, facing: position.facing }
  },

  /**
   * Wrap coordinate within 0-19 range (edge wrapping)
   */
  wrapCoordinate(value: number, max: number): number {
    if (value < 0) return max - 1
    if (value >= max) return 0
    return value
  },

  /**
   * Turn party left 90 degrees
   */
  turnLeft(state: GameState): GameState {
    if (!state.dungeon || !this.isDungeonState(state.dungeon)) {
      throw new Error('Dungeon state not initialized or not in maze')
    }

    const newFacing = this.rotateDirection(state.dungeon.position.facing, 'LEFT')

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: {
          ...state.dungeon.position,
          facing: newFacing
        }
      }
    }
  },

  /**
   * Turn party right 90 degrees
   */
  turnRight(state: GameState): GameState {
    if (!state.dungeon || !this.isDungeonState(state.dungeon)) {
      throw new Error('Dungeon state not initialized or not in maze')
    }

    const newFacing = this.rotateDirection(state.dungeon.position.facing, 'RIGHT')

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: {
          ...state.dungeon.position,
          facing: newFacing
        }
      }
    }
  },

  /**
   * Rotate direction 90 degrees left or right
   */
  rotateDirection(current: Direction, rotation: 'LEFT' | 'RIGHT'): Direction {
    const directions: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST']
    const currentIndex = directions.indexOf(current)

    if (rotation === 'LEFT') {
      return directions[(currentIndex + 3) % 4] // -1 mod 4 = +3 mod 4
    } else {
      return directions[(currentIndex + 1) % 4]
    }
  },

  /**
   * Move party left without changing facing
   */
  strafeLeft(state: GameState): GameState {
    if (!state.dungeon || !this.isDungeonState(state.dungeon)) {
      throw new Error('Dungeon state not initialized or not in maze')
    }

    const currentPos = state.dungeon.position
    const leftDirection = this.rotateDirection(currentPos.facing, 'LEFT')
    const nextPos = this.getNextPosition(currentPos, leftDirection, false)

    let newState: GameState = {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: {
          ...nextPos,
          facing: currentPos.facing // Preserve original facing
        }
      }
    }

    // Trigger special tile effects
    const level = DungeonService.loadLevel(newState.dungeon!.currentLevel)
    const tile = DungeonService.getTile(level, nextPos.x, nextPos.y)
    newState = this.handleSpecialTile(newState, tile)

    return newState
  },

  /**
   * Move party right without changing facing
   */
  strafeRight(state: GameState): GameState {
    if (!state.dungeon || !this.isDungeonState(state.dungeon)) {
      throw new Error('Dungeon state not initialized or not in maze')
    }

    const currentPos = state.dungeon.position
    const rightDirection = this.rotateDirection(currentPos.facing, 'RIGHT')
    const nextPos = this.getNextPosition(currentPos, rightDirection, false)

    let newState: GameState = {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: {
          ...nextPos,
          facing: currentPos.facing // Preserve original facing
        }
      }
    }

    // Trigger special tile effects
    const level = DungeonService.loadLevel(newState.dungeon!.currentLevel)
    const tile = DungeonService.getTile(level, nextPos.x, nextPos.y)
    newState = this.handleSpecialTile(newState, tile)

    return newState
  },

  /**
   * Move party backward one tile
   */
  moveBackward(state: GameState): GameState {
    if (!state.dungeon || !this.isDungeonState(state.dungeon)) {
      throw new Error('Dungeon state not initialized or not in maze')
    }

    const currentPos = state.dungeon.position
    const nextPos = this.getNextPosition(currentPos, currentPos.facing, true)

    let newState: GameState = {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: nextPos
      }
    }

    // Trigger special tile effects
    const level = DungeonService.loadLevel(newState.dungeon!.currentLevel)
    const tile = DungeonService.getTile(level, nextPos.x, nextPos.y)
    newState = this.handleSpecialTile(newState, tile)

    return newState
  },

  /**
   * Change dungeon level (stairs, elevator, chute)
   * Sets position to appropriate entry point on new level
   */
  enterLevel(
    state: GameState,
    newLevel: number,
    entryType: 'STAIRS_UP' | 'STAIRS_DOWN' | 'ELEVATOR' | 'CHUTE'
  ): GameState {
    const dungeon = this.requireDungeon(state)

    // Clamp level to 1-10
    newLevel = Math.max(1, Math.min(10, newLevel))

    // Load new level to find entry position
    const level = DungeonService.loadLevel(newLevel)

    // Find appropriate entry tile
    let entryPosition: Position | undefined

    if (entryType === 'STAIRS_DOWN' || entryType === 'CHUTE') {
      // Find stairs_up tile on new level
      entryPosition = this.findTileOfType(level, 'stairs_up')
    } else if (entryType === 'STAIRS_UP') {
      // Find stairs_down tile on new level
      entryPosition = this.findTileOfType(level, 'stairs_down')
    } else if (entryType === 'ELEVATOR') {
      // Find elevator tile on new level
      entryPosition = this.findTileOfType(level, 'elevator')
    }

    // If no entry tile found, use current position
    if (!entryPosition) {
      entryPosition = { ...dungeon.position }
    }

    // Maintain facing direction
    entryPosition.facing = dungeon.position.facing

    return {
      ...state,
      dungeon: {
        ...dungeon,
        currentLevel: newLevel,
        position: entryPosition,
      }
    }
  },

  /**
   * Find first tile of given type in level
   */
  findTileOfType(level: LevelData, type: TileType): Position | undefined {
    for (const tile of level.tiles) {
      if (tile.types?.includes(type)) {
        return { x: tile.x, y: tile.y, facing: 'NORTH' }
      }
    }
    return undefined
  },

  /**
   * Helper to check if tile has a specific type
   */
  tileHasType(tile: TileData, type: TileType): boolean {
    return tile.types?.includes(type) ?? false
  },

  /**
   * Handle special tile effects (teleporters, spinners, chutes, etc.)
   * Called after every movement
   */
  handleSpecialTile(state: GameState, tile: TileData): GameState {
    const dungeon = this.requireDungeon(state)

    // Reset teleport count for non-teleporter tiles
    if (!this.tileHasType(tile, 'teleporter') && dungeon.teleportCount > 0) {
      state = {
        ...state,
        dungeon: { ...dungeon, teleportCount: 0 }
      }
    }

    // Handle special tile types (using includes() since tiles can have multiple types)
    if (this.tileHasType(tile, 'teleporter')) {
      return this.handleTeleporter(state, tile)
    }

    if (this.tileHasType(tile, 'spinner')) {
      return this.handleSpinner(state)
    }

    if (this.tileHasType(tile, 'chute')) {
      return this.handleChute(state)
    }

    if (this.tileHasType(tile, 'pit')) {
      return this.handlePit(state)
    }

    if (this.tileHasType(tile, 'stairs_up')) {
      if (dungeon.currentLevel > 1) {
        return this.enterLevel(state, dungeon.currentLevel - 1, 'STAIRS_UP')
      }
      return state
    }

    if (this.tileHasType(tile, 'stairs_down')) {
      if (dungeon.currentLevel < 10) {
        return this.enterLevel(state, dungeon.currentLevel + 1, 'STAIRS_DOWN')
      }
      return state
    }

    if (this.tileHasType(tile, 'elevator')) {
      // UI handles level selection, MazeComponent calls enterLevel
      return state
    }

    // Process light state for all other tiles (handles darkness zones, duration decrement)
    // Includes: darkness, darkness_zone_start, anti_magic, message, searchable, fixed_encounter
    return this.processLightState(state, tile.types)
  },

  /**
   * Process light state after movement to a tile.
   * Handles darkness zone transitions and light duration decrement.
   *
   * @returns Object with updated state and any messages to display
   */
  processLightState(state: GameState, newTileTypes: TileType[] | undefined): GameState {
    const dungeon = this.requireDungeon(state)
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
  },

  /**
   * Handle teleporter tile - instant transport with loop prevention
   */
  handleTeleporter(state: GameState, tile: TileData): GameState {
    const dungeon = this.requireDungeon(state)

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
  },

  /**
   * Handle spinner tile - randomize facing direction
   */
  handleSpinner(state: GameState): GameState {
    const dungeon = this.requireDungeon(state)
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
  },

  /**
   * Handle chute tile - fall 1-3 levels with 1d6 damage per level
   * Research: docs/systems/dungeon-system.md:449-476
   */
  handleChute(state: GameState): GameState {
    const dungeon = this.requireDungeon(state)

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
  },

  /**
   * Handle pit tile - AGI-based damage trap (no level change)
   * Avoidance: (AGI - Level) × 4%
   * Failure: 1d6 damage
   */
  handlePit(state: GameState): GameState {
    const dungeon = this.requireDungeon(state)
    const newRoster = new Map(state.roster);

    for (const memberId of state.party.members) {
      const character = newRoster.get(memberId)!;

      // Calculate avoidance chance: (AGI - Level) × 4%
      const avoidanceChance = (character.agility - dungeon.currentLevel) * 4;
      const avoided = RandomService.chance(avoidanceChance);

      // Failed avoidance - take 1d6 damage
      if (!avoided) {
        const damage = RandomService.rollDie(6);
        newRoster.set(memberId, {
          ...character,
          hp: Math.max(0, character.hp - damage),
        });
      }
    }

    return {
      ...state,
      roster: newRoster,
    };
  },

  /**
   * Handle stairs transition from wall-based stairs
   * @param state Current game state
   * @param destination Destination data from tile
   * @returns Updated game state (or state indicating castle transition)
   */
  handleStairsTransition(state: GameState, destination: Destination | undefined): GameState {
    // Validate destination exists
    if (!destination) {
      return state;
    }

    // Handle stairs_up (to castle)
    if (destination.type === 'castle') {
      // Return state with dungeon: undefined to indicate castle transition
      // Component will handle actual scene transition
      return {
        ...state,
        dungeon: undefined
      };
    }

    // Handle stairs_down (to another level)
    if (destination.level !== undefined) {
      const dungeon = this.requireDungeon(state)
      const targetX = destination.x ?? 0;
      const targetY = destination.y ?? 0;
      const targetFacing = dungeon.position.facing;

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
      };
    }

    // Fallback - no valid destination
    return state;
  },
}
