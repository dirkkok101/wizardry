import {
  DEFAULT_COMBAT_SETTINGS,
  getCombatMessageDelay,
  setCombatMessageDelay
} from '../CombatSettings'

describe('CombatSettings', () => {
  // Store original value to restore after tests
  let originalDelay: number

  beforeEach(() => {
    originalDelay = DEFAULT_COMBAT_SETTINGS.messageDelayMs
  })

  afterEach(() => {
    // Restore original value
    DEFAULT_COMBAT_SETTINGS.messageDelayMs = originalDelay
  })

  describe('DEFAULT_COMBAT_SETTINGS', () => {
    it('has a default message delay of 800ms', () => {
      expect(DEFAULT_COMBAT_SETTINGS.messageDelayMs).toBe(800)
    })
  })

  describe('getCombatMessageDelay', () => {
    it('returns the current message delay', () => {
      expect(getCombatMessageDelay()).toBe(DEFAULT_COMBAT_SETTINGS.messageDelayMs)
    })

    it('reflects changes made via setCombatMessageDelay', () => {
      setCombatMessageDelay(500)
      expect(getCombatMessageDelay()).toBe(500)
    })
  })

  describe('setCombatMessageDelay', () => {
    it('sets the message delay', () => {
      setCombatMessageDelay(1000)
      expect(DEFAULT_COMBAT_SETTINGS.messageDelayMs).toBe(1000)
    })

    it('allows setting delay to 0 for instant display', () => {
      setCombatMessageDelay(0)
      expect(DEFAULT_COMBAT_SETTINGS.messageDelayMs).toBe(0)
    })

    it('prevents negative delays by clamping to 0', () => {
      setCombatMessageDelay(-100)
      expect(DEFAULT_COMBAT_SETTINGS.messageDelayMs).toBe(0)
    })

    it('allows typical values like 500ms', () => {
      setCombatMessageDelay(500)
      expect(DEFAULT_COMBAT_SETTINGS.messageDelayMs).toBe(500)
    })

    it('allows longer delays for dramatic effect', () => {
      setCombatMessageDelay(2000)
      expect(DEFAULT_COMBAT_SETTINGS.messageDelayMs).toBe(2000)
    })
  })
})
