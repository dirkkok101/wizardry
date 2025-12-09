import { PoisonService } from '../PoisonService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'
import { RandomService } from '../RandomService'

describe('PoisonService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('applyMazePoison', () => {
    it('applies 1 HP damage to poisoned character on successful 25% roll', () => {
      // Queue value < 0.25 to trigger poison
      RandomService.queueNextValues([0.1])

      const char = createTestCharacter({
        id: 'poisoned1',
        name: 'PoisonedChar',
        status: CharacterStatus.POISONED,
        hp: 10
      })

      const result = PoisonService.applyMazePoison([char])

      expect(result.updatedCharacters.get('poisoned1')?.hp).toBe(9)
      expect(result.messages).toContain('PoisonedChar takes poison damage!')
      expect(result.anyDamaged).toBe(true)
    })

    it('does not damage when 25% roll fails', () => {
      // Queue value > 0.25 - no damage
      RandomService.queueNextValues([0.5])

      const char = createTestCharacter({
        id: 'poisoned1',
        status: CharacterStatus.POISONED,
        hp: 10
      })

      const result = PoisonService.applyMazePoison([char])

      expect(result.updatedCharacters.size).toBe(0)
      expect(result.messages).toHaveLength(0)
      expect(result.anyDamaged).toBe(false)
    })

    it('kills character when HP reaches 0', () => {
      RandomService.queueNextValues([0.1])

      const char = createTestCharacter({
        id: 'dying',
        name: 'DyingChar',
        status: CharacterStatus.POISONED,
        hp: 1
      })

      const result = PoisonService.applyMazePoison([char])

      const updated = result.updatedCharacters.get('dying')
      expect(updated?.hp).toBe(0)
      expect(updated?.status).toBe(CharacterStatus.DEAD)
      expect(result.messages).toContain('DyingChar succumbs to poison!')
    })

    it('ignores non-poisoned characters', () => {
      RandomService.queueNextValues([0.1])

      const char = createTestCharacter({
        id: 'healthy',
        status: CharacterStatus.OK,
        hp: 10
      })

      const result = PoisonService.applyMazePoison([char])

      expect(result.updatedCharacters.size).toBe(0)
      expect(result.anyDamaged).toBe(false)
    })

    it('ignores already dead characters', () => {
      RandomService.queueNextValues([0.1])

      const char = createTestCharacter({
        id: 'dead',
        status: CharacterStatus.POISONED,
        hp: 0
      })

      const result = PoisonService.applyMazePoison([char])

      expect(result.updatedCharacters.size).toBe(0)
      expect(result.anyDamaged).toBe(false)
    })

    it('handles multiple poisoned characters independently', () => {
      // First triggers, second fails, third triggers
      RandomService.queueNextValues([0.1, 0.5, 0.1])

      const party = [
        createTestCharacter({ id: 'p1', name: 'Char1', status: CharacterStatus.POISONED, hp: 10 }),
        createTestCharacter({ id: 'p2', name: 'Char2', status: CharacterStatus.POISONED, hp: 10 }),
        createTestCharacter({ id: 'p3', name: 'Char3', status: CharacterStatus.POISONED, hp: 10 })
      ]

      const result = PoisonService.applyMazePoison(party)

      expect(result.updatedCharacters.get('p1')?.hp).toBe(9)
      expect(result.updatedCharacters.has('p2')).toBe(false)
      expect(result.updatedCharacters.get('p3')?.hp).toBe(9)
      expect(result.messages).toHaveLength(2)
      expect(result.anyDamaged).toBe(true)
    })

    it('handles empty party', () => {
      const result = PoisonService.applyMazePoison([])

      expect(result.updatedCharacters.size).toBe(0)
      expect(result.messages).toHaveLength(0)
      expect(result.anyDamaged).toBe(false)
    })
  })

  describe('isPartyWiped', () => {
    it('returns true when all characters are dead', () => {
      const party = [
        createTestCharacter({ id: 'c1', status: CharacterStatus.DEAD, hp: 0 }),
        createTestCharacter({ id: 'c2', status: CharacterStatus.DEAD, hp: 0 })
      ]

      expect(PoisonService.isPartyWiped(party, new Map())).toBe(true)
    })

    it('returns false when some characters are alive', () => {
      const party = [
        createTestCharacter({ id: 'c1', status: CharacterStatus.DEAD, hp: 0 }),
        createTestCharacter({ id: 'c2', status: CharacterStatus.OK, hp: 10 })
      ]

      expect(PoisonService.isPartyWiped(party, new Map())).toBe(false)
    })

    it('considers updated characters from poison damage', () => {
      const party = [
        createTestCharacter({ id: 'c1', status: CharacterStatus.OK, hp: 10 }),
        createTestCharacter({ id: 'c2', status: CharacterStatus.POISONED, hp: 1 })
      ]
      const updated = new Map([
        ['c1', { ...party[0], status: CharacterStatus.DEAD, hp: 0 }],
        ['c2', { ...party[1], status: CharacterStatus.DEAD, hp: 0 }]
      ])

      expect(PoisonService.isPartyWiped(party, updated)).toBe(true)
    })

    it('returns true for ASHES status', () => {
      const party = [
        createTestCharacter({ id: 'c1', status: CharacterStatus.ASHES, hp: 0 })
      ]

      expect(PoisonService.isPartyWiped(party, new Map())).toBe(true)
    })

    it('returns true for LOST status', () => {
      const party = [
        createTestCharacter({ id: 'c1', status: CharacterStatus.LOST, hp: 0 })
      ]

      expect(PoisonService.isPartyWiped(party, new Map())).toBe(true)
    })

    it('returns false for poisoned character still alive', () => {
      const party = [
        createTestCharacter({ id: 'c1', status: CharacterStatus.POISONED, hp: 5 })
      ]

      expect(PoisonService.isPartyWiped(party, new Map())).toBe(false)
    })
  })
})
