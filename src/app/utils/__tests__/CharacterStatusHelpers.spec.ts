import { canAct, isAlive } from '../CharacterStatusHelpers'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'

describe('CharacterStatusHelpers', () => {
  describe('canAct', () => {
    it('should return true for OK status', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK })
      expect(canAct(char)).toBe(true)
    })

    it('should return true for POISONED status', () => {
      const char = createTestCharacter({ status: CharacterStatus.POISONED })
      expect(canAct(char)).toBe(true)
    })

    it('should return false for DEAD status', () => {
      const char = createTestCharacter({ status: CharacterStatus.DEAD })
      expect(canAct(char)).toBe(false)
    })

    it('should return false for PARALYZED status', () => {
      const char = createTestCharacter({ status: CharacterStatus.PARALYZED })
      expect(canAct(char)).toBe(false)
    })

    it('should return false for STONED status', () => {
      const char = createTestCharacter({ status: CharacterStatus.STONED })
      expect(canAct(char)).toBe(false)
    })

    it('should return false for ASHES status', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASHES })
      expect(canAct(char)).toBe(false)
    })

    it('should return false for LOST status', () => {
      const char = createTestCharacter({ status: CharacterStatus.LOST })
      expect(canAct(char)).toBe(false)
    })

    it('should return false for ASLEEP status', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASLEEP })
      expect(canAct(char)).toBe(false)
    })
  })

  describe('isAlive', () => {
    it('should return true for OK status', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK })
      expect(isAlive(char)).toBe(true)
    })

    it('should return true for PARALYZED status', () => {
      const char = createTestCharacter({ status: CharacterStatus.PARALYZED })
      expect(isAlive(char)).toBe(true)
    })

    it('should return true for POISONED status', () => {
      const char = createTestCharacter({ status: CharacterStatus.POISONED })
      expect(isAlive(char)).toBe(true)
    })

    it('should return true for STONED status', () => {
      const char = createTestCharacter({ status: CharacterStatus.STONED })
      expect(isAlive(char)).toBe(true)
    })

    it('should return true for ASLEEP status', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASLEEP })
      expect(isAlive(char)).toBe(true)
    })

    it('should return false for DEAD status', () => {
      const char = createTestCharacter({ status: CharacterStatus.DEAD })
      expect(isAlive(char)).toBe(false)
    })

    it('should return false for ASHES status', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASHES })
      expect(isAlive(char)).toBe(false)
    })

    it('should return false for LOST status', () => {
      const char = createTestCharacter({ status: CharacterStatus.LOST })
      expect(isAlive(char)).toBe(false)
    })
  })
})
