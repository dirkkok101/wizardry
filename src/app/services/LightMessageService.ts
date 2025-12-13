/**
 * LightMessageService - Centralized light state change messaging
 *
 * Consolidates light state message generation that was duplicated across:
 * - MazeComponent.executeMovement()
 * - DungeonMovementService.processLightState()
 * - MovementOrchestrationService
 *
 * Provides consistent messaging for:
 * - Entering darkness zones
 * - Exiting darkness zones
 * - Light spell expiration
 * - Light spell duration warnings
 */

import { DungeonState, LightSpellType } from '@models/Dungeon'

/**
 * Types of light state changes
 */
export type LightStateChangeType =
  | 'entered_darkness_with_light'
  | 'entered_darkness_no_light'
  | 'exited_darkness'
  | 'light_expired'
  | 'light_fading'
  | 'none'

/**
 * Light state change information
 */
export interface LightStateChange {
  type: LightStateChangeType
  hadLight?: boolean
  spellType?: LightSpellType
  remainingDuration?: number
}

/**
 * Captured light state for comparison
 */
export interface CapturedLightState {
  lightActive: boolean
  inDarknessZone: boolean
  lightDurationRemaining: number | undefined
  lightSpellType: LightSpellType | undefined
}

export const LightMessageService = {
  /**
   * Capture current light state for later comparison
   */
  captureState(dungeon: DungeonState): CapturedLightState {
    return {
      lightActive: dungeon.lightActive,
      inDarknessZone: dungeon.inDarknessZone,
      lightDurationRemaining: dungeon.lightDurationRemaining,
      lightSpellType: dungeon.lightSpellType
    }
  },

  /**
   * Detect light state change between two states
   */
  detectChange(
    before: CapturedLightState,
    after: DungeonState | undefined
  ): LightStateChange {
    if (!after) {
      return { type: 'none' }
    }

    // Case 1: Entered darkness zone with light active (light extinguished)
    if (!before.inDarknessZone && after.inDarknessZone && before.lightActive) {
      return {
        type: 'entered_darkness_with_light',
        hadLight: true,
        spellType: before.lightSpellType
      }
    }

    // Case 2: Entered darkness zone without light
    if (!before.inDarknessZone && after.inDarknessZone && !before.lightActive) {
      return {
        type: 'entered_darkness_no_light',
        hadLight: false
      }
    }

    // Case 3: Exited darkness zone
    if (before.inDarknessZone && !after.inDarknessZone) {
      return { type: 'exited_darkness' }
    }

    // Case 4: Light expired (had light, now doesn't, not in darkness)
    if (before.lightActive && !after.lightActive && !after.inDarknessZone) {
      return {
        type: 'light_expired',
        spellType: before.lightSpellType
      }
    }

    // Case 5: Light fading warning (hit warning threshold)
    if (after.lightActive && after.lightDurationRemaining === 5) {
      return {
        type: 'light_fading',
        spellType: after.lightSpellType,
        remainingDuration: 5
      }
    }

    return { type: 'none' }
  },

  /**
   * Get message for a light state change
   */
  getMessage(change: LightStateChange): string | null {
    switch (change.type) {
      case 'entered_darkness_with_light':
        return 'An unnatural darkness engulfs you! Your light spell is extinguished!'

      case 'entered_darkness_no_light':
        return 'You enter an area of impenetrable darkness.'

      case 'exited_darkness':
        return 'You emerge from the darkness.'

      case 'light_expired':
        return 'Your light spell has expired! Darkness surrounds you.'

      case 'light_fading':
        return `Your ${change.spellType} spell is fading... (${change.remainingDuration} steps remaining)`

      case 'none':
      default:
        return null
    }
  },

  /**
   * Get all messages for a light state change
   * Returns array to handle potential multiple messages
   */
  getMessages(change: LightStateChange): string[] {
    const message = this.getMessage(change)
    return message ? [message] : []
  },

  /**
   * Convenience method: detect change and get messages in one call
   */
  getStateChangeMessages(
    before: CapturedLightState,
    after: DungeonState | undefined
  ): string[] {
    const change = this.detectChange(before, after)
    return this.getMessages(change)
  },

  /**
   * Check if light is currently active
   */
  isLightActive(dungeon: DungeonState | undefined): boolean {
    return dungeon?.lightActive ?? false
  },

  /**
   * Check if currently in darkness zone
   */
  isInDarkness(dungeon: DungeonState | undefined): boolean {
    return dungeon?.inDarknessZone ?? false
  },

  /**
   * Get light status description for UI
   */
  getLightStatusDescription(dungeon: DungeonState | undefined): string {
    if (!dungeon) return 'Unknown'

    if (dungeon.inDarknessZone) {
      return 'In Darkness Zone'
    }

    if (dungeon.lightActive) {
      if (dungeon.lightDurationRemaining !== undefined) {
        return `${dungeon.lightSpellType} (${dungeon.lightDurationRemaining} steps)`
      }
      return `${dungeon.lightSpellType} (permanent)`
    }

    return 'No Light'
  },

  /**
   * Get light duration warning level
   */
  getLightWarningLevel(dungeon: DungeonState | undefined): 'none' | 'low' | 'critical' {
    if (!dungeon?.lightActive || dungeon.lightDurationRemaining === undefined) {
      return 'none'
    }

    if (dungeon.lightDurationRemaining <= 3) {
      return 'critical'
    }

    if (dungeon.lightDurationRemaining <= 5) {
      return 'low'
    }

    return 'none'
  }
} as const
