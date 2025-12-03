import { LightService } from '../LightService'
import { DungeonState } from '@models/Dungeon'
import { RandomService } from '../RandomService'

describe('LightService', () => {
  // Helper to create a base dungeon state
  const createDungeonState = (overrides: Partial<DungeonState> = {}): DungeonState => ({
    currentLevel: 1,
    position: { x: 5, y: 5, facing: 'NORTH' },
    lightActive: false,
    lightRadius: 3,
    lightSpellType: undefined,
    lightDurationRemaining: undefined,
    inDarknessZone: false,
    teleportCount: 0,
    visitedTiles: new Set(),
    defeatedEncounters: [],
    unlockedDoors: new Set(),
    openDoors: new Set(),
    ...overrides
  })

  describe('getEffectiveViewDistance', () => {
    it('returns 2 tiles for no light in normal zone (current + 1 ahead)', () => {
      const state = createDungeonState({ lightActive: false, inDarknessZone: false })
      expect(LightService.getEffectiveViewDistance(state)).toBe(2)
    })

    it('returns 1 tile for no light in darkness zone', () => {
      const state = createDungeonState({ lightActive: false, inDarknessZone: true })
      expect(LightService.getEffectiveViewDistance(state)).toBe(1)
    })

    it('returns 3 tiles for MILWA in normal zone', () => {
      const state = createDungeonState({ lightActive: true, lightSpellType: 'MILWA', inDarknessZone: false })
      expect(LightService.getEffectiveViewDistance(state)).toBe(3)
    })

    it('returns 2 tiles for MILWA in darkness zone', () => {
      const state = createDungeonState({ lightActive: true, lightSpellType: 'MILWA', inDarknessZone: true })
      expect(LightService.getEffectiveViewDistance(state)).toBe(2)
    })

    it('returns 5 tiles for LOMILWA in normal zone', () => {
      const state = createDungeonState({ lightActive: true, lightSpellType: 'LOMILWA', inDarknessZone: false })
      expect(LightService.getEffectiveViewDistance(state)).toBe(5)
    })

    it('returns 3 tiles for LOMILWA in darkness zone', () => {
      const state = createDungeonState({ lightActive: true, lightSpellType: 'LOMILWA', inDarknessZone: true })
      expect(LightService.getEffectiveViewDistance(state)).toBe(3)
    })
  })

  describe('getAmbientLightLevel', () => {
    it('returns 1.0 when light is active', () => {
      const state = createDungeonState({ lightActive: true })
      expect(LightService.getAmbientLightLevel(state)).toBe(1.0)
    })

    it('returns 0.05 in darkness zone without light (nearly pitch black)', () => {
      const state = createDungeonState({ lightActive: false, inDarknessZone: true })
      expect(LightService.getAmbientLightLevel(state)).toBe(0.05)
    })

    it('returns 0.15 in normal zone without light (dim)', () => {
      const state = createDungeonState({ lightActive: false, inDarknessZone: false })
      expect(LightService.getAmbientLightLevel(state)).toBe(0.15)
    })
  })

  describe('rollMilwaDuration', () => {
    it('returns value between 15 and 29', () => {
      // Test with deterministic random
      RandomService.queueNextValues([0.0])  // Should give minimum (15)
      expect(LightService.rollMilwaDuration()).toBe(15)

      RandomService.queueNextValues([0.99])  // Should give near maximum (29)
      expect(LightService.rollMilwaDuration()).toBe(29)

      RandomService.queueNextValues([0.5])  // Should give middle value (~22)
      const midValue = LightService.rollMilwaDuration()
      expect(midValue).toBeGreaterThanOrEqual(15)
      expect(midValue).toBeLessThanOrEqual(29)
    })
  })

  describe('getLomilwaDuration', () => {
    it('returns 32000 (effectively permanent)', () => {
      expect(LightService.getLomilwaDuration()).toBe(32000)
    })
  })

  describe('isDarknessTile', () => {
    it('returns true for darkness tile', () => {
      expect(LightService.isDarknessTile(['darkness'])).toBe(true)
    })

    it('returns true for darkness_zone_start tile', () => {
      expect(LightService.isDarknessTile(['darkness_zone_start'])).toBe(true)
    })

    it('returns false for other tile types', () => {
      expect(LightService.isDarknessTile(['stairs_up'])).toBe(false)
      expect(LightService.isDarknessTile(['teleporter'])).toBe(false)
      expect(LightService.isDarknessTile(undefined)).toBe(false)
    })

    it('returns true when darkness is one of multiple types', () => {
      expect(LightService.isDarknessTile(['room', 'darkness'])).toBe(true)
      expect(LightService.isDarknessTile(['darkness', 'searchable'])).toBe(true)
    })
  })

  describe('canCastLightSpell', () => {
    it('returns canCast: true in normal zone', () => {
      const state = createDungeonState({ inDarknessZone: false })
      const result = LightService.canCastLightSpell(state)
      expect(result.canCast).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('returns canCast: false in darkness zone with reason', () => {
      const state = createDungeonState({ inDarknessZone: true })
      const result = LightService.canCastLightSpell(state)
      expect(result.canCast).toBe(false)
      expect(result.reason).toContain('Cannot cast light spells')
    })
  })

  describe('activateLightSpell', () => {
    it('activates MILWA with random duration 15-29', () => {
      RandomService.queueNextValues([0.5])  // Queue a value for random duration
      const state = createDungeonState()
      const result = LightService.activateLightSpell(state, 'MILWA')

      expect(result.lightActive).toBe(true)
      expect(result.lightSpellType).toBe('MILWA')
      expect(result.lightRadius).toBe(2)
      expect(result.lightDurationRemaining).toBeGreaterThanOrEqual(15)
      expect(result.lightDurationRemaining).toBeLessThanOrEqual(29)
    })

    it('activates LOMILWA with 32000 duration', () => {
      const state = createDungeonState()
      const result = LightService.activateLightSpell(state, 'LOMILWA')

      expect(result.lightActive).toBe(true)
      expect(result.lightSpellType).toBe('LOMILWA')
      expect(result.lightRadius).toBe(3)
      expect(result.lightDurationRemaining).toBe(32000)
    })

    it('preserves other state properties', () => {
      const state = createDungeonState({
        currentLevel: 3,
        position: { x: 10, y: 10, facing: 'SOUTH' }
      })
      const result = LightService.activateLightSpell(state, 'MILWA')

      expect(result.currentLevel).toBe(3)
      expect(result.position.x).toBe(10)
    })
  })

  describe('decrementLightDuration', () => {
    it('decrements duration by 1 on each call', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 20
      })
      const result = LightService.decrementLightDuration(state)

      expect(result.state.lightDurationRemaining).toBe(19)
      expect(result.lightExpired).toBe(false)
      expect(result.message).toBeUndefined()
    })

    it('returns warning message at 5 steps remaining', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 6
      })
      const result = LightService.decrementLightDuration(state)

      expect(result.state.lightDurationRemaining).toBe(5)
      expect(result.lightExpired).toBe(false)
      expect(result.message).toContain('fading')
      expect(result.message).toContain('5 steps')
    })

    it('expires light at 0 duration', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 1
      })
      const result = LightService.decrementLightDuration(state)

      expect(result.state.lightActive).toBe(false)
      expect(result.state.lightSpellType).toBeUndefined()
      expect(result.state.lightDurationRemaining).toBeUndefined()
      expect(result.lightExpired).toBe(true)
      expect(result.message).toContain('expired')
    })

    it('does not decrement when no light is active', () => {
      const state = createDungeonState({ lightActive: false })
      const result = LightService.decrementLightDuration(state)

      expect(result.state).toEqual(state)
      expect(result.lightExpired).toBe(false)
    })

    it('does not decrement when in darkness zone', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 20,
        inDarknessZone: true
      })
      const result = LightService.decrementLightDuration(state)

      expect(result.state.lightDurationRemaining).toBe(20)
      expect(result.lightExpired).toBe(false)
    })
  })

  describe('enterDarknessZone', () => {
    it('sets inDarknessZone to true', () => {
      const state = createDungeonState()
      const result = LightService.enterDarknessZone(state)

      expect(result.state.inDarknessZone).toBe(true)
    })

    it('extinguishes active light spell', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 15
      })
      const result = LightService.enterDarknessZone(state)

      expect(result.state.lightActive).toBe(false)
      expect(result.state.lightSpellType).toBeUndefined()
      expect(result.state.lightDurationRemaining).toBeUndefined()
      expect(result.lightExtinguished).toBe(true)
      expect(result.message).toContain('extinguished')
    })

    it('returns appropriate message without light', () => {
      const state = createDungeonState({ lightActive: false })
      const result = LightService.enterDarknessZone(state)

      expect(result.lightExtinguished).toBe(false)
      expect(result.message).toContain('darkness')
    })

    it('sets lightRadius to minimum', () => {
      const state = createDungeonState({ lightRadius: 5 })
      const result = LightService.enterDarknessZone(state)

      expect(result.state.lightRadius).toBe(1)
    })
  })

  describe('exitDarknessZone', () => {
    it('sets inDarknessZone to false', () => {
      const state = createDungeonState({ inDarknessZone: true })
      const result = LightService.exitDarknessZone(state)

      expect(result.inDarknessZone).toBe(false)
    })

    it('restores default lightRadius (2 tiles without light)', () => {
      const state = createDungeonState({
        inDarknessZone: true,
        lightRadius: 1
      })
      const result = LightService.exitDarknessZone(state)

      expect(result.lightRadius).toBe(2)
    })

    it('does not reactivate light spell', () => {
      const state = createDungeonState({
        inDarknessZone: true,
        lightActive: false
      })
      const result = LightService.exitDarknessZone(state)

      expect(result.lightActive).toBe(false)
    })
  })

  describe('processLightOnMovement', () => {
    it('enters darkness zone when moving into darkness tile', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 20
      })
      const result = LightService.processLightOnMovement(state, undefined, ['darkness'])

      expect(result.state.inDarknessZone).toBe(true)
      expect(result.state.lightActive).toBe(false)
      expect(result.messages.length).toBeGreaterThan(0)
    })

    it('exits darkness zone when moving out', () => {
      const state = createDungeonState({ inDarknessZone: true })
      const result = LightService.processLightOnMovement(state, ['darkness'], undefined)

      expect(result.state.inDarknessZone).toBe(false)
      expect(result.messages).toContain('You emerge from the darkness.')
    })

    it('decrements light duration on normal movement', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 20
      })
      const result = LightService.processLightOnMovement(state, undefined, undefined)

      expect(result.state.lightDurationRemaining).toBe(19)
    })

    it('does not decrement duration when moving within darkness zone', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 20,
        inDarknessZone: true
      })
      const result = LightService.processLightOnMovement(state, ['darkness'], ['darkness'])

      expect(result.state.lightDurationRemaining).toBe(20)
    })

    it('handles darkness_zone_start same as darkness', () => {
      const state = createDungeonState({ lightActive: true, lightSpellType: 'MILWA', lightDurationRemaining: 20 })
      const result = LightService.processLightOnMovement(state, undefined, ['darkness_zone_start'])

      expect(result.state.inDarknessZone).toBe(true)
    })
  })

  describe('getDarknessFactorForDepth', () => {
    it('returns 1.0 for darknessDepth 0 (normal tile)', () => {
      expect(LightService.getDarknessFactorForDepth(0)).toBe(1.0)
    })

    it('returns 0.3 for darknessDepth 1 (first darkness tile)', () => {
      expect(LightService.getDarknessFactorForDepth(1)).toBe(0.3)
    })

    it('returns 0.1 for darknessDepth 2 (second darkness tile)', () => {
      expect(LightService.getDarknessFactorForDepth(2)).toBe(0.1)
    })

    it('returns 0.0 for darknessDepth > 2 (beyond visibility)', () => {
      expect(LightService.getDarknessFactorForDepth(3)).toBe(0.0)
      expect(LightService.getDarknessFactorForDepth(10)).toBe(0.0)
    })
  })

  describe('getSpellDurationDisplay', () => {
    it('returns undefined when no light active', () => {
      const state = createDungeonState({ lightActive: false })
      expect(LightService.getSpellDurationDisplay(state)).toBeUndefined()
    })

    it('returns "permanent" for LOMILWA with high duration', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'LOMILWA',
        lightDurationRemaining: 32000
      })
      expect(LightService.getSpellDurationDisplay(state)).toBe('permanent')
    })

    it('returns step count for MILWA', () => {
      const state = createDungeonState({
        lightActive: true,
        lightSpellType: 'MILWA',
        lightDurationRemaining: 15
      })
      expect(LightService.getSpellDurationDisplay(state)).toBe('15 steps')
    })
  })
})
