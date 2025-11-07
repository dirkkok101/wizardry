import { GameState } from '../types/GameState'
import { Position, Direction, DungeonState, TileData, TileType, LevelData } from '../types/Dungeon'
import { DungeonService } from './DungeonService'

export const NavigationService = {
  /**
   * Type guard to check if dungeon is DungeonState
   */
  isDungeonState(dungeon: any): dungeon is DungeonState {
    return dungeon && 'position' in dungeon
  },

  /**
   * Move party forward one tile (immutable state update)
   */
  moveForward(state: GameState): GameState {
    if (!state.dungeon || !this.isDungeonState(state.dungeon)) {
      throw new Error('Dungeon state not initialized or not in maze')
    }

    const currentPos = state.dungeon.position
    const nextPos = this.getNextPosition(currentPos, currentPos.facing, false)

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: nextPos
      }
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

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: {
          ...nextPos,
          facing: currentPos.facing // Preserve original facing
        }
      }
    }
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

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: {
          ...nextPos,
          facing: currentPos.facing // Preserve original facing
        }
      }
    }
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

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: nextPos
      }
    }
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
      entryPosition = { ...state.dungeon!.position }
    }

    // Maintain facing direction
    entryPosition.facing = state.dungeon!.position.facing

    return {
      ...state,
      dungeon: {
        ...state.dungeon!,
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
      if (tile.type === type) {
        return { x: tile.x, y: tile.y, facing: 'NORTH' }
      }
    }
    return undefined
  },

  /**
   * Handle special tile effects (teleporters, spinners, chutes, etc.)
   * Called after every movement
   */
  handleSpecialTile(state: GameState, tile: TileData): GameState {
    // Reset teleport count for non-teleporter tiles
    if (tile.type !== 'teleporter' && state.dungeon!.teleportCount > 0) {
      state = {
        ...state,
        dungeon: { ...state.dungeon!, teleportCount: 0 }
      }
    }

    switch (tile.type) {
      case 'teleporter':
        return this.handleTeleporter(state, tile)

      case 'spinner':
        return this.handleSpinner(state)

      case 'chute':
        return this.handleChute(state)

      case 'pit':
        return this.handlePit(state)

      case 'stairs_up':
        if (state.dungeon!.currentLevel > 1) {
          return this.enterLevel(state, state.dungeon!.currentLevel - 1, 'STAIRS_UP')
        }
        return state

      case 'stairs_down':
        if (state.dungeon!.currentLevel < 10) {
          return this.enterLevel(state, state.dungeon!.currentLevel + 1, 'STAIRS_DOWN')
        }
        return state

      case 'elevator':
        // UI handles level selection, MazeComponent calls enterLevel
        return state

      case 'darkness':
      case 'anti_magic':
      case 'message':
        // These tiles don't modify game state directly
        // Their effects are checked by MazeComponent:
        // - darkness: Override lightRadius in computed signal
        // - anti_magic: Prevent spell casting
        // - message: Display tile.message
        return state

      case 'searchable':
      case 'fixed_encounter':
        // No auto-action - handled explicitly by MazeComponent
        // searchable: Requires I key press
        // fixed_encounter: MazeComponent checks defeatedEncounters list
        return state

      // More cases will be added in subsequent tasks
      default:
        return state
    }
  },

  /**
   * Handle teleporter tile - instant transport with loop prevention
   */
  handleTeleporter(state: GameState, tile: TileData): GameState {
    // Prevent infinite loops - max 3 consecutive teleports
    if (state.dungeon!.teleportCount >= 3) {
      return state
    }

    if (!tile.destination) {
      return state
    }

    return {
      ...state,
      dungeon: {
        ...state.dungeon!,
        position: {
          ...state.dungeon!.position,
          x: tile.destination.x!,
          y: tile.destination.y!,
        },
        teleportCount: state.dungeon!.teleportCount + 1,
      }
    }
  },

  /**
   * Handle spinner tile - randomize facing direction
   */
  handleSpinner(state: GameState): GameState {
    const directions: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST']
    const randomDirection = directions[Math.floor(Math.random() * directions.length)]

    return {
      ...state,
      dungeon: {
        ...state.dungeon!,
        position: {
          ...state.dungeon!.position,
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
    // Roll for fall distance (1-3 levels)
    const levelsFallen = Math.floor(Math.random() * 3) + 1
    const newLevel = Math.min(10, state.dungeon!.currentLevel + levelsFallen)

    // Calculate damage (1d6 per level fallen)
    const actualFall = newLevel - state.dungeon!.currentLevel
    const damagePerCharacter: Map<string, number> = new Map()

    for (const memberId of state.party.members) {
      let totalDamage = 0
      for (let i = 0; i < actualFall; i++) {
        totalDamage += Math.floor(Math.random() * 6) + 1 // 1d6
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
        ...state.dungeon!,
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
    const newRoster = new Map(state.roster);

    for (const memberId of state.party.members) {
      const character = newRoster.get(memberId)!;

      // Calculate avoidance chance: (AGI - Level) × 4%
      const avoidanceChance = (character.agility - state.dungeon!.currentLevel) * 4;
      const roll = Math.random() * 100;

      // Failed avoidance - take 1d6 damage
      if (roll >= avoidanceChance) {
        const damage = Math.floor(Math.random() * 6) + 1;
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
}
