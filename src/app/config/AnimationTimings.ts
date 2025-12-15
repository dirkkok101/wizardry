/**
 * Shared animation timing constants for maze scene components.
 * Centralizes magic numbers for consistent timing and easier maintenance.
 */
export const ANIMATION_TIMINGS = {
  // Combat Victory
  VICTORY_REWARD_DISPLAY: 2500,
  VICTORY_TRANSITION_DELAY: 500,

  // Combat Defeat
  DEFEAT_ACKNOWLEDGEMENT: 2000,
  DEFEAT_TRANSITION_DELAY: 500,

  // Chest Playback (Trap animations)
  TRAP_LETTERBOX_DELAY: 300,
  TRAP_EFFECTS_PANEL_DELAY: 1000,
  TRAP_APPLICATION_DELAY: 1000,
  TRAP_STATUS_DELAY: 500,
  TRAP_COMBAT_TRANSITION: 1500,
  TRAP_REWARDS_TRANSITION: 1000,

  // Chest Rewards
  CHEST_BANNER_DELAY: 200,
  CHEST_REWARDS_PANEL_DELAY: 800,
  CHEST_CONTINUE_PROMPT_DELAY: 1500
} as const;

export type AnimationTimingKey = keyof typeof ANIMATION_TIMINGS;
