import { InnService, RoomType } from '../InnService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('InnService', () => {
  describe('getRoomCost', () => {
    it('returns 0 for STABLES', () => {
      expect(InnService.getRoomCost(RoomType.STABLES)).toBe(0)
    })

    it('returns 10 for BARRACKS', () => {
      expect(InnService.getRoomCost(RoomType.BARRACKS)).toBe(10)
    })

    it('returns 50 for DOUBLE', () => {
      expect(InnService.getRoomCost(RoomType.DOUBLE)).toBe(50)
    })

    it('returns 200 for PRIVATE', () => {
      expect(InnService.getRoomCost(RoomType.PRIVATE)).toBe(200)
    })

    it('returns 500 for ROYAL_SUITE', () => {
      expect(InnService.getRoomCost(RoomType.ROYAL_SUITE)).toBe(500)
    })
  })

  describe('getRoomHealRate', () => {
    it('returns 0 HP/week for STABLES', () => {
      expect(InnService.getRoomHealRate(RoomType.STABLES)).toBe(0)
    })

    it('returns 1 HP/week for BARRACKS', () => {
      expect(InnService.getRoomHealRate(RoomType.BARRACKS)).toBe(1)
    })

    it('returns 3 HP/week for DOUBLE', () => {
      expect(InnService.getRoomHealRate(RoomType.DOUBLE)).toBe(3)
    })

    it('returns 7 HP/week for PRIVATE', () => {
      expect(InnService.getRoomHealRate(RoomType.PRIVATE)).toBe(7)
    })

    it('returns 10 HP/week for ROYAL_SUITE', () => {
      expect(InnService.getRoomHealRate(RoomType.ROYAL_SUITE)).toBe(10)
    })
  })

  describe('canAffordRoom', () => {
    it('returns true when character has enough gold', () => {
      const character = createTestCharacter({ gold: 100 })

      const result = InnService.canAffordRoom(character, RoomType.BARRACKS)

      expect(result.allowed).toBe(true)
    })

    it('returns false when character lacks gold', () => {
      const character = createTestCharacter({ gold: 5 })

      const result = InnService.canAffordRoom(character, RoomType.BARRACKS)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Not enough gold. Need 10, have 5.')
    })

    it('always allows STABLES (free)', () => {
      const character = createTestCharacter({ gold: 0 })

      const result = InnService.canAffordRoom(character, RoomType.STABLES)

      expect(result.allowed).toBe(true)
    })
  })

  describe('restOneWeek', () => {
    it('heals character by room heal rate', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.BARRACKS)

      expect(result.updatedCharacter.hp).toBe(11) // 10 + 1 (barracks)
    })

    it('does not exceed max HP', () => {
      const character = createTestCharacter({
        hp: 19,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.DOUBLE)

      expect(result.updatedCharacter.hp).toBe(20) // Capped at max HP
    })

    it('deducts room cost from gold', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.BARRACKS)

      expect(result.updatedCharacter.gold).toBe(90) // 100 - 10
    })

    it('returns isFullyHealed true when HP reaches max', () => {
      const character = createTestCharacter({
        hp: 19,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.BARRACKS)

      expect(result.isFullyHealed).toBe(true)
    })

    it('returns isFullyHealed false when HP not at max', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.BARRACKS)

      expect(result.isFullyHealed).toBe(false)
    })
  })
})
