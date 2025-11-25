// Combat display settings

/**
 * Configuration for combat message display
 */
export interface CombatDisplaySettings {
  /**
   * Delay in milliseconds between each combat message
   * Set to 0 for instant display (no animation)
   * Recommended: 500-1000ms for dramatic effect
   */
  messageDelayMs: number
}

/**
 * Default combat display settings
 * Can be modified at runtime or via game options
 */
export const DEFAULT_COMBAT_SETTINGS: CombatDisplaySettings = {
  messageDelayMs: 800  // 800ms delay between messages for suspense
}

/**
 * Get the current combat message delay
 * This function allows for future extensibility (e.g., user preferences)
 */
export function getCombatMessageDelay(): number {
  return DEFAULT_COMBAT_SETTINGS.messageDelayMs
}

/**
 * Set the combat message delay
 * @param delayMs Delay in milliseconds (0 for instant)
 */
export function setCombatMessageDelay(delayMs: number): void {
  DEFAULT_COMBAT_SETTINGS.messageDelayMs = Math.max(0, delayMs)
}
