// Combat display settings

/**
 * Configuration for combat message display
 */
export interface CombatDisplaySettings {
  /**
   * Delay in milliseconds between each combat message/action
   * Set to 0 for instant display (no animation)
   * Recommended: 800-1200ms for dramatic effect
   */
  messageDelayMs: number

  /**
   * Delay in milliseconds between action and result messages
   * For example: "Kobold attacks Fred" -> delay -> "Kobold misses!"
   * Recommended: 600-1000ms for suspense
   */
  actionResultDelayMs: number

  /**
   * Enable combat audit logging to console
   * Shows real-time action execution synchronized with UI
   */
  auditEnabled: boolean
}

/**
 * Default combat display settings
 * Can be modified at runtime or via game options
 */
export const DEFAULT_COMBAT_SETTINGS: CombatDisplaySettings = {
  messageDelayMs: 1000,      // 1000ms delay between different actions for readability
  actionResultDelayMs: 600,  // 600ms delay between action and its result for suspense
  auditEnabled: true         // Combat audit logging enabled by default
}

/**
 * Get the current combat message delay (between different actions)
 * This function allows for future extensibility (e.g., user preferences)
 */
export function getCombatMessageDelay(): number {
  return DEFAULT_COMBAT_SETTINGS.messageDelayMs
}

/**
 * Get the delay between action and result messages
 */
export function getActionResultDelay(): number {
  return DEFAULT_COMBAT_SETTINGS.actionResultDelayMs
}

/**
 * Set the combat message delay
 * @param delayMs Delay in milliseconds (0 for instant)
 */
export function setCombatMessageDelay(delayMs: number): void {
  DEFAULT_COMBAT_SETTINGS.messageDelayMs = Math.max(0, delayMs)
}

/**
 * Set the action-result delay
 * @param delayMs Delay in milliseconds (0 for instant)
 */
export function setActionResultDelay(delayMs: number): void {
  DEFAULT_COMBAT_SETTINGS.actionResultDelayMs = Math.max(0, delayMs)
}

/**
 * Check if combat audit logging is enabled
 */
export function isCombatAuditEnabled(): boolean {
  return DEFAULT_COMBAT_SETTINGS.auditEnabled
}

/**
 * Enable or disable combat audit logging
 * When enabled, logs action execution to console in real-time
 * @param enabled Whether to enable audit logging
 */
export function setCombatAuditEnabled(enabled: boolean): void {
  DEFAULT_COMBAT_SETTINGS.auditEnabled = enabled
}
