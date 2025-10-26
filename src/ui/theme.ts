/**
 * UI Theme System
 * Centralized design tokens for consistent styling across all scenes
 */

export const COLORS = {
  // Backgrounds
  BACKGROUND: '#000',
  BUTTON_NORMAL_BG: 'rgba(0, 0, 0, 0.7)',
  BUTTON_HOVER_BG: 'rgba(40, 40, 40, 0.8)',
  BUTTON_DISABLED_BG: 'rgba(0, 0, 0, 0.6)',

  // Borders
  BUTTON_BORDER_READY: 'rgba(255, 255, 255, 0.9)',
  BUTTON_BORDER_DISABLED: 'rgba(255, 255, 255, 0.3)',

  // Text
  TEXT_PRIMARY: 'rgba(255, 255, 255, 1)',
  TEXT_SECONDARY: 'rgba(170, 170, 170, 1)',
  TEXT_DISABLED: 'rgba(255, 255, 255, 0.4)',
} as const

export const TYPOGRAPHY = {
  FAMILIES: {
    PRIMARY: 'monospace',
  },
  SIZES: {
    TITLE: 32,
    MENU: 24,
    BUTTON: 28,
    BODY: 16,
    SMALL: 14,
  },
  WEIGHTS: {
    NORMAL: 'normal' as const,
    BOLD: 'bold' as const,
  },
} as const

export const BUTTON_SIZES = {
  LARGE: { width: 250, height: 60 },
  MEDIUM: { width: 200, height: 50 },
  SMALL: { width: 150, height: 40 },
} as const

export const ANIMATION = {
  PULSE: {
    BASE_ALPHA: 0.3,
    ALPHA_VARIATION: 0.2,
    BASE_SIZE: 5,
    SIZE_VARIATION: 10,
    PERIOD: 500,
  },
  FADE_DURATION: 300,
} as const
