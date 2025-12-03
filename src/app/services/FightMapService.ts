import { RandomService } from './RandomService'

import { FixedEncounterConfig } from './EncounterTriggerService'

/**
 * Per-level encounter state tracking
 * Based on original Wizardry 1 FIGHTMAP system
 */
export interface LevelEncounterState {
  level: number
  /**
   * Tracks which tiles have had encounters (cleared)
   * Key: "x,y" string format
   * Value: true if encounter already occurred (tile cleared)
   * false/missing means encounter CAN occur
   */
  clearedTiles: Map<string, boolean>
  /**
   * Room tiles eligible for encounters
   * Corridor tiles are not tracked (no encounter eligibility)
   */
  roomTiles: Set<string>
  /**
   * Treasure room locations for this visit
   * Guaranteed encounter on entry (if not cleared)
   */
  treasureRooms: Set<string>
  /**
   * Alarm-spread tiles (clanging bells mechanic)
   * Next step on these tiles guarantees encounter
   */
  alarmTiles: Set<string>
  /**
   * Fixed encounter countdown tracking
   * Key: "x,y" string format
   * Value: Current aux0 countdown value
   * Decrements each time encounter triggers, inactive at 0
   */
  fixedEncounterCountdowns: Map<string, FixedEncounterConfig>
}

export interface RoomTileInfo {
  x: number
  y: number
  isRoom: boolean
}

const TREASURE_ROOMS_TO_SEED = 9
const MAX_SEED_ATTEMPTS = 200

/**
 * FightMapService - Per-level encounter state tracking
 *
 * The FIGHTMAP system prevents immediate repeat encounters while
 * enabling the door-kick farming mechanic beloved by Wizardry players.
 *
 * Key behaviors:
 * - Room tiles start as "not cleared" (can trigger encounters)
 * - After an encounter, tile is "cleared" (no more encounters from FIGHTMAP)
 * - Door-kick BYPASSES cleared state (12.5% chance still applies)
 * - Alarm tiles (clanging bells) ALWAYS trigger encounters
 * - All state resets when leaving dungeon entirely
 *
 * Based on: docs/research/door-kicking-encounter-mechanics.md
 */
export const FightMapService = {
  // Internal state - per-level encounter tracking
  _state: new Map<number, LevelEncounterState>(),

  /**
   * Initialize encounter state for a dungeon level
   * Called when entering a level for the first time this dungeon visit
   */
  initializeLevel(level: number, roomTiles: RoomTileInfo[]): void {
    const levelState: LevelEncounterState = {
      level,
      clearedTiles: new Map(),
      roomTiles: new Set(),
      treasureRooms: new Set(),
      alarmTiles: new Set(),
      fixedEncounterCountdowns: new Map()
    }

    // Mark all room tiles as encounter-eligible
    for (const tile of roomTiles) {
      if (tile.isRoom) {
        const key = `${tile.x},${tile.y}`
        levelState.roomTiles.add(key)
        levelState.clearedTiles.set(key, false) // false = not cleared = CAN encounter
      }
    }

    this._state.set(level, levelState)
  },

  /**
   * Check if an encounter can occur at position
   * Returns TRUE if encounter is possible (from FIGHTMAP perspective)
   *
   * Priority:
   * 1. Alarm tiles always return true
   * 2. Cleared tiles return false
   * 3. Uncleared room tiles return true
   * 4. Non-room tiles (corridors) return false
   */
  canEncounter(level: number, x: number, y: number): boolean {
    const levelState = this._state.get(level)
    if (!levelState) return false

    const key = `${x},${y}`

    // Alarm tiles always trigger
    if (levelState.alarmTiles.has(key)) {
      return true
    }

    // Not a room tile - no encounter
    if (!levelState.roomTiles.has(key)) {
      return false
    }

    // Check if tile hasn't been cleared
    const cleared = levelState.clearedTiles.get(key)
    return cleared === false // false = not yet cleared = can encounter
  },

  /**
   * Check if door-kick encounter is possible
   * Door-kick BYPASSES the cleared state - this is the farming mechanic
   * Only requires tile to be a room tile
   */
  canEncounterDoorKick(level: number, x: number, y: number): boolean {
    const levelState = this._state.get(level)
    if (!levelState) return false

    const key = `${x},${y}`

    // Door-kick only works on room tiles
    // But ignores cleared state - this is intentional for farming
    return levelState.roomTiles.has(key)
  },

  /**
   * Mark a tile as cleared (encounter occurred)
   * Also removes alarm status
   */
  markCleared(level: number, x: number, y: number): void {
    const levelState = this._state.get(level)
    if (!levelState) return

    const key = `${x},${y}`
    levelState.clearedTiles.set(key, true)
    levelState.alarmTiles.delete(key)
  },

  /**
   * Check if position has treasure room
   */
  hasTreasure(level: number, x: number, y: number): boolean {
    const levelState = this._state.get(level)
    if (!levelState) return false

    return levelState.treasureRooms.has(`${x},${y}`)
  },

  /**
   * Mark a tile as a treasure room
   */
  markTreasureRoom(level: number, x: number, y: number): void {
    const levelState = this._state.get(level)
    if (!levelState) return

    levelState.treasureRooms.add(`${x},${y}`)
  },

  /**
   * Set alarm on a single tile
   */
  setAlarm(level: number, x: number, y: number): void {
    const levelState = this._state.get(level)
    if (!levelState) return

    levelState.alarmTiles.add(`${x},${y}`)
  },

  /**
   * Check if tile is an alarm tile
   */
  isAlarmTile(level: number, x: number, y: number): boolean {
    const levelState = this._state.get(level)
    if (!levelState) return false

    return levelState.alarmTiles.has(`${x},${y}`)
  },

  /**
   * Spread alarm (clanging bells mechanic)
   * Sets alarm on surrounding tiles, clears center tile
   *
   * @param level - Dungeon level
   * @param centerX - Center X coordinate
   * @param centerY - Center Y coordinate
   * @param radius - Alarm spread radius
   */
  spreadAlarm(level: number, centerX: number, centerY: number, radius: number): void {
    const levelState = this._state.get(level)
    if (!levelState) return

    const size = 2 * radius + 1

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx
        const y = centerY + dy

        // Bounds check (0-19 for Wizardry maps)
        if (x < 0 || x >= 20 || y < 0 || y >= 20) continue

        const key = `${x},${y}`

        if (dx === 0 && dy === 0) {
          // Center position - clear it (no encounter here)
          levelState.clearedTiles.set(key, true)
          levelState.alarmTiles.delete(key)
        } else {
          // Surrounding tiles - mark for guaranteed encounter
          levelState.alarmTiles.add(key)
        }
      }
    }
  },

  /**
   * Seed treasure rooms for a level
   * Seeds up to 9 treasure rooms on level entry
   *
   * Algorithm from original:
   * 1. Random starting position
   * 2. Scan rightward then downward for valid room
   * 3. Mark found room as treasure
   * 4. Repeat until 9 rooms seeded (or max attempts)
   */
  seedTreasureRooms(level: number, roomTiles: RoomTileInfo[]): void {
    const levelState = this._state.get(level)
    if (!levelState) return

    const availableRooms = roomTiles.filter(t => t.isRoom)
    if (availableRooms.length === 0) return

    const toSeed = Math.min(TREASURE_ROOMS_TO_SEED, availableRooms.length)
    let seeded = 0
    let attempts = 0

    while (seeded < toSeed && attempts < MAX_SEED_ATTEMPTS) {
      attempts++

      // Random starting index
      const startIdx = Math.floor(RandomService.random(0, availableRooms.length - 1))
      const roomTile = availableRooms[startIdx]
      const key = `${roomTile.x},${roomTile.y}`

      // Check if not already a treasure room
      if (!levelState.treasureRooms.has(key)) {
        levelState.treasureRooms.add(key)
        seeded++
      }
    }
  },

  /**
   * Get level state (for debugging/testing)
   */
  getLevelState(level: number): LevelEncounterState | undefined {
    return this._state.get(level)
  },

  /**
   * Reset all state (called when leaving dungeon entirely)
   */
  resetAll(): void {
    this._state.clear()
  },

  /**
   * Initialize a fixed encounter config for a tile
   * Called when loading a level with fixed_encounter tiles
   *
   * @param level - Dungeon level
   * @param x - Tile x coordinate
   * @param y - Tile y coordinate
   * @param config - Fixed encounter AUX values from map data
   */
  initializeFixedEncounter(
    level: number,
    x: number,
    y: number,
    config: FixedEncounterConfig
  ): void {
    const levelState = this._state.get(level)
    if (!levelState) return

    const key = `${x},${y}`
    levelState.fixedEncounterCountdowns.set(key, { ...config })
  },

  /**
   * Get the fixed encounter config for a tile
   * Returns undefined if no fixed encounter or countdown exhausted
   */
  getFixedEncounterConfig(level: number, x: number, y: number): FixedEncounterConfig | undefined {
    const levelState = this._state.get(level)
    if (!levelState) return undefined

    const key = `${x},${y}`
    const config = levelState.fixedEncounterCountdowns.get(key)

    // Only return if countdown is still active
    if (config && config.aux0 > 0) {
      return config
    }

    return undefined
  },

  /**
   * Check if a fixed encounter is active at this tile
   * Active means aux0 > 0 (encounter will trigger)
   */
  hasActiveFixedEncounter(level: number, x: number, y: number): boolean {
    const config = this.getFixedEncounterConfig(level, x, y)
    return config !== undefined && config.aux0 > 0
  },

  /**
   * Decrement the fixed encounter countdown after triggering
   * When aux0 reaches 0, the encounter becomes inactive
   *
   * @returns true if countdown was decremented, false if already at 0
   */
  decrementFixedEncounter(level: number, x: number, y: number): boolean {
    const levelState = this._state.get(level)
    if (!levelState) return false

    const key = `${x},${y}`
    const config = levelState.fixedEncounterCountdowns.get(key)

    if (!config || config.aux0 <= 0) return false

    // Decrement countdown
    config.aux0--
    return true
  }
}
