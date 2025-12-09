// Tests for parseCombatMessage function - Pattern matching for combat visual feedback
import { parseCombatMessage } from '../floating-damage.component'

describe('parseCombatMessage', () => {
  describe('critical hit detection', () => {
    it('should recognize "decapitates" as critical instant kill', () => {
      const result = parseCombatMessage('Orc decapitates Fighter!')
      expect(result).toEqual({ value: 'INSTANT KILL!', type: 'critical' })
    })

    it('should recognize "decapitated" as critical instant kill', () => {
      const result = parseCombatMessage('Fighter was decapitated by Orc!')
      expect(result).toEqual({ value: 'INSTANT KILL!', type: 'critical' })
    })

    it('should recognize standard CRITICAL keyword with damage number', () => {
      const result = parseCombatMessage('CRITICAL hit for 15 damage!')
      expect(result).toEqual({ value: '15', type: 'critical' })
    })

    it('should recognize lowercase critical keyword', () => {
      const result = parseCombatMessage('critical strike deals 20 damage')
      expect(result).toEqual({ value: '20', type: 'critical' })
    })

    it('should return CRIT! when critical without damage number', () => {
      const result = parseCombatMessage('CRITICAL HIT!')
      expect(result).toEqual({ value: 'CRIT!', type: 'critical' })
    })
  })

  describe('miss detection', () => {
    it('should recognize "missed" as miss', () => {
      const result = parseCombatMessage('Fighter missed the target!')
      expect(result).toEqual({ value: 'MISS', type: 'miss' })
    })

    it('should recognize "misses" as miss', () => {
      const result = parseCombatMessage('The Orc misses wildly!')
      expect(result).toEqual({ value: 'MISS', type: 'miss' })
    })
  })

  describe('heal detection', () => {
    it('should recognize "healed" with HP amount', () => {
      const result = parseCombatMessage('Fighter healed for 25 HP')
      expect(result).toEqual({ value: '+25', type: 'heal' })
    })

    it('should recognize "restored" with HP amount', () => {
      const result = parseCombatMessage('Mage restored 15 hit points')
      expect(result).toEqual({ value: '+15', type: 'heal' })
    })
  })

  describe('damage detection', () => {
    it('should recognize "deals X damage" pattern', () => {
      const result = parseCombatMessage('Orc deals 8 damage!')
      expect(result).toEqual({ value: '8', type: 'damage' })
    })

    it('should recognize "for X damage" pattern', () => {
      const result = parseCombatMessage('Fighter hits for 12 damage!')
      expect(result).toEqual({ value: '12', type: 'damage' })
    })
  })

  describe('status effect detection', () => {
    it('should recognize "poisoned" status', () => {
      const result = parseCombatMessage('Fighter was poisoned!')
      expect(result).toEqual({ value: 'POISON', type: 'status' })
    })

    it('should recognize "paralyzed" status', () => {
      const result = parseCombatMessage('Mage was paralyzed!')
      expect(result).toEqual({ value: 'PARALYZE', type: 'status' })
    })

    it('should recognize "asleep" status', () => {
      const result = parseCombatMessage('Thief fell asleep!')
      expect(result).toEqual({ value: 'SLEEP', type: 'status' })
    })
  })

  describe('unrecognized patterns', () => {
    it('should return null for unrecognized messages', () => {
      const result = parseCombatMessage('The dungeon is dark.')
      expect(result).toBeNull()
    })
  })
})
