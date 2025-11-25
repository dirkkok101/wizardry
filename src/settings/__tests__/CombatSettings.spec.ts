import {
  DEFAULT_COMBAT_SETTINGS,
  getCombatMessageDelay,
  setCombatMessageDelay,
  getActionResultDelay,
  setActionResultDelay
} from '../CombatSettings'

describe('CombatSettings', () => {
  // Store original values to restore after tests
  let originalMessageDelay: number
  let originalActionResultDelay: number

  beforeEach(() => {
    originalMessageDelay = DEFAULT_COMBAT_SETTINGS.messageDelayMs
    originalActionResultDelay = DEFAULT_COMBAT_SETTINGS.actionResultDelayMs
  })

  afterEach(() => {
    // Restore original values
    DEFAULT_COMBAT_SETTINGS.messageDelayMs = originalMessageDelay
    DEFAULT_COMBAT_SETTINGS.actionResultDelayMs = originalActionResultDelay
  })

  describe('DEFAULT_COMBAT_SETTINGS', () => {
    it('has a default message delay of 1200ms', () => {
      expect(DEFAULT_COMBAT_SETTINGS.messageDelayMs).toBe(1200)
    })

    it('has a default action-result delay of 800ms', () => {
      expect(DEFAULT_COMBAT_SETTINGS.actionResultDelayMs).toBe(800)
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

  describe('getActionResultDelay', () => {
    it('returns the current action-result delay', () => {
      expect(getActionResultDelay()).toBe(DEFAULT_COMBAT_SETTINGS.actionResultDelayMs)
    })

    it('reflects changes made via setActionResultDelay', () => {
      setActionResultDelay(600)
      expect(getActionResultDelay()).toBe(600)
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

  describe('setActionResultDelay', () => {
    it('sets the action-result delay', () => {
      setActionResultDelay(1000)
      expect(DEFAULT_COMBAT_SETTINGS.actionResultDelayMs).toBe(1000)
    })

    it('allows setting delay to 0 for instant display', () => {
      setActionResultDelay(0)
      expect(DEFAULT_COMBAT_SETTINGS.actionResultDelayMs).toBe(0)
    })

    it('prevents negative delays by clamping to 0', () => {
      setActionResultDelay(-100)
      expect(DEFAULT_COMBAT_SETTINGS.actionResultDelayMs).toBe(0)
    })
  })
})
