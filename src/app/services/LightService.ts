/**
 * LightService - Pure functions for light and darkness mechanics
 *
 * Handles:
 * - Light spell activation and duration tracking
 * - View distance calculations based on light state
 * - Darkness zone mechanics (extinguish light, prevent casting)
 * - Ambient light levels for rendering
 */

import { DungeonState, LightSpellType, TileType } from '@models/Dungeon'
import { RandomService } from './RandomService'

// View distance constants (in tiles)
const VIEW_DISTANCE = {
  NO_LIGHT_NORMAL: 2,      // No light spell in normal zone (current tile + 1 ahead)
  NO_LIGHT_DARKNESS: 1,    // No light spell in darkness zone (barely see current tile)
  MILWA_NORMAL: 3,         // MILWA in normal zone
  MILWA_DARKNESS: 2,       // MILWA in darkness zone (reduced)
  LOMILWA_NORMAL: 5,       // LOMILWA in normal zone (full visibility)
  LOMILWA_DARKNESS: 3      // LOMILWA in darkness zone (reduced)
}

// Duration constants (in steps/movements)
const SPELL_DURATION = {
  MILWA_MIN: 15,
  MILWA_MAX: 29,
  LOMILWA: 32000  // Effectively permanent for one dungeon expedition
}

// Warning threshold for expiring light
const LIGHT_WARNING_THRESHOLD = 5

/**
 * Result from processing light duration decrement
 */
export interface LightDecrementResult {
  state: DungeonState
  message?: string
  lightExpired: boolean
}

/**
 * Result from entering/exiting darkness zone
 */
export interface DarknessZoneResult {
  state: DungeonState
  message?: string
  lightExtinguished: boolean
}

/**
 * Result from checking if light spell can be cast
 */
export interface CanCastLightResult {
  canCast: boolean
  reason?: string
}

/**
 * Get effective view distance based on light state, spell type, and darkness zone
 */
function getEffectiveViewDistance(state: DungeonState): number {
  const hasLight = state.lightActive
  const inDarkness = state.inDarknessZone
  const isLomilwa = state.lightSpellType === 'LOMILWA'

  if (!hasLight) {
    return inDarkness ? VIEW_DISTANCE.NO_LIGHT_DARKNESS : VIEW_DISTANCE.NO_LIGHT_NORMAL
  }

  // Has light - check spell type
  if (isLomilwa) {
    return inDarkness ? VIEW_DISTANCE.LOMILWA_DARKNESS : VIEW_DISTANCE.LOMILWA_NORMAL
  }
  // MILWA
  return inDarkness ? VIEW_DISTANCE.MILWA_DARKNESS : VIEW_DISTANCE.MILWA_NORMAL
}

/**
 * Get ambient light level for WebGL rendering
 * Returns values between 0.0 (pitch black) and 1.0 (fully lit)
 */
function getAmbientLightLevel(state: DungeonState): number {
  if (state.lightActive) {
    return 1.0  // Fully lit when light spell active
  }
  if (state.inDarknessZone) {
    return 0.05  // Nearly pitch black in darkness zones without light
  }
  return 0.3  // Dim in normal zones without spell
}

/**
 * Roll random duration for MILWA spell (15-29 steps)
 */
function rollMilwaDuration(): number {
  return RandomService.random(SPELL_DURATION.MILWA_MIN, SPELL_DURATION.MILWA_MAX)
}

/**
 * Get LOMILWA spell duration (32000 steps - effectively permanent)
 */
function getLomilwaDuration(): number {
  return SPELL_DURATION.LOMILWA
}

/**
 * Check if a tile type is a darkness zone
 */
function isDarknessTile(tileType: TileType | undefined): boolean {
  return tileType === 'darkness' || tileType === 'darkness_zone_start'
}

/**
 * Check if party can cast a light spell (MILWA/LOMILWA)
 */
function canCastLightSpell(state: DungeonState): CanCastLightResult {
  if (state.inDarknessZone) {
    return {
      canCast: false,
      reason: 'Cannot cast light spells in the darkness zone!'
    }
  }
  return { canCast: true }
}

/**
 * Activate a light spell with appropriate duration
 */
function activateLightSpell(
  state: DungeonState,
  spellType: LightSpellType
): DungeonState {
  const duration = spellType === 'MILWA'
    ? rollMilwaDuration()
    : getLomilwaDuration()

  const lightRadius = spellType === 'LOMILWA' ? 3 : 2

  return {
    ...state,
    lightActive: true,
    lightRadius,
    lightSpellType: spellType,
    lightDurationRemaining: duration
  }
}

/**
 * Decrement light duration after a movement step
 * Returns warning message at 5 steps remaining, expiration message at 0
 */
function decrementLightDuration(state: DungeonState): LightDecrementResult {
  // No active light spell to decrement
  if (!state.lightActive || state.lightDurationRemaining === undefined) {
    return { state, lightExpired: false }
  }

  // Don't decrement in darkness zones (light is already extinguished there)
  if (state.inDarknessZone) {
    return { state, lightExpired: false }
  }

  const newDuration = state.lightDurationRemaining - 1

  // Light expired
  if (newDuration <= 0) {
    return {
      state: {
        ...state,
        lightActive: false,
        lightRadius: VIEW_DISTANCE.NO_LIGHT_NORMAL,
        lightSpellType: undefined,
        lightDurationRemaining: undefined
      },
      message: 'Your light spell has expired! Darkness surrounds you.',
      lightExpired: true
    }
  }

  // Warning at threshold
  if (newDuration === LIGHT_WARNING_THRESHOLD) {
    return {
      state: {
        ...state,
        lightDurationRemaining: newDuration
      },
      message: `Your ${state.lightSpellType} spell is fading... (${newDuration} steps remaining)`,
      lightExpired: false
    }
  }

  // Normal decrement
  return {
    state: {
      ...state,
      lightDurationRemaining: newDuration
    },
    lightExpired: false
  }
}

/**
 * Handle entering a darkness zone - extinguishes active light
 */
function enterDarknessZone(state: DungeonState): DarknessZoneResult {
  const hadLight = state.lightActive

  const newState: DungeonState = {
    ...state,
    inDarknessZone: true,
    lightActive: false,
    lightSpellType: undefined,
    lightDurationRemaining: undefined,
    lightRadius: VIEW_DISTANCE.NO_LIGHT_DARKNESS
  }

  if (hadLight) {
    return {
      state: newState,
      message: 'An unnatural darkness engulfs you! Your light spell is extinguished!',
      lightExtinguished: true
    }
  }

  return {
    state: newState,
    message: 'You enter an area of impenetrable darkness.',
    lightExtinguished: false
  }
}

/**
 * Handle exiting a darkness zone
 */
function exitDarknessZone(state: DungeonState): DungeonState {
  return {
    ...state,
    inDarknessZone: false,
    lightRadius: VIEW_DISTANCE.NO_LIGHT_NORMAL
  }
}

/**
 * Process light state after movement to a new tile
 * Handles darkness zone transitions and duration decrement
 */
function processLightOnMovement(
  state: DungeonState,
  previousTileType: TileType | undefined,
  newTileType: TileType | undefined
): { state: DungeonState; messages: string[] } {
  const messages: string[] = []
  let currentState = state

  const wasInDarkness = isDarknessTile(previousTileType) || state.inDarknessZone
  const nowInDarkness = isDarknessTile(newTileType)

  // Entering darkness zone
  if (!wasInDarkness && nowInDarkness) {
    const result = enterDarknessZone(currentState)
    currentState = result.state
    if (result.message) {
      messages.push(result.message)
    }
  }
  // Exiting darkness zone
  else if (wasInDarkness && !nowInDarkness) {
    currentState = exitDarknessZone(currentState)
    messages.push('You emerge from the darkness.')
  }
  // Normal movement (not in darkness zone) - decrement light duration
  else if (!nowInDarkness) {
    const result = decrementLightDuration(currentState)
    currentState = result.state
    if (result.message) {
      messages.push(result.message)
    }
  }

  return { state: currentState, messages }
}

/**
 * Get spell duration for display purposes
 */
function getSpellDurationDisplay(state: DungeonState): string | undefined {
  if (!state.lightActive || state.lightDurationRemaining === undefined) {
    return undefined
  }

  // For LOMILWA with very high duration, show as "permanent"
  if (state.lightDurationRemaining > 1000) {
    return 'permanent'
  }

  return `${state.lightDurationRemaining} steps`
}

export const LightService = {
  // View distance
  getEffectiveViewDistance,
  getAmbientLightLevel,

  // Duration
  rollMilwaDuration,
  getLomilwaDuration,

  // Spell casting
  canCastLightSpell,
  activateLightSpell,

  // Duration management
  decrementLightDuration,

  // Darkness zones
  isDarknessTile,
  enterDarknessZone,
  exitDarknessZone,

  // Movement processing
  processLightOnMovement,

  // Display
  getSpellDurationDisplay,

  // Constants (exposed for tests)
  VIEW_DISTANCE,
  SPELL_DURATION,
  LIGHT_WARNING_THRESHOLD
}
