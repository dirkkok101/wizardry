import { TempleService } from '../TempleService'
import { ServiceType } from '../../types/ServiceType'
import { Character } from '../../types/Character'
import { CharacterClass } from '../../types/CharacterClass'
import { CharacterStatus } from '../../types/CharacterStatus'
import { Race } from '../../types/Race'
import { Alignment } from '../../types/Alignment'
import { GameState } from '../../types/GameState'
import { Party } from '../../types/Party'

describe('TempleService', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    race: Race.HUMAN,
    class: CharacterClass.MAGE,
    alignment: Alignment.GOOD,
    level: 5,
    hp: 20,
    maxHp: 25,
    status: CharacterStatus.POISONED,
    strength: 10,
    intelligence: 15,
    piety: 12,
    vitality: 15,
    agility: 10,
    luck: 10,
    experience: 10000,
    ac: 5,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  }

  const createTestGameState = (gold: number = 1000): GameState => {
    const party: Party = {
      members: [mockCharacter.id],
      formation: {
        frontRow: [mockCharacter.id],
        backRow: []
      },
      gold
    }

    return {
      roster: new Map([[mockCharacter.id, mockCharacter]]),
      party,
      currentScene: 'TEMPLE' as any,
      eventLog: [],
      createdAt: Date.now(),
      lastModified: Date.now()
    }
  }

  describe('calculateTithe', () => {
    it('calculates cure poison tithe (10 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.CURE_POISON)
      expect(tithe).toBe(50) // 10 × 5
    })

    it('calculates cure paralysis tithe (20 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.CURE_PARALYSIS)
      expect(tithe).toBe(100) // 20 × 5
    })

    it('calculates resurrection tithe (250 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.RESURRECT)
      expect(tithe).toBe(1250) // 250 × 5
    })

    it('calculates restoration tithe (500 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.RESTORE)
      expect(tithe).toBe(2500) // 500 × 5
    })

    it('scales tithe with character level', () => {
      const highLevelChar = { ...mockCharacter, level: 10 }
      const tithe = TempleService.calculateTithe(highLevelChar, ServiceType.RESURRECT)
      expect(tithe).toBe(2500) // 250 × 10
    })
  })

  describe('performService', () => {
    it('deducts service cost from party gold', () => {
      const state = createTestGameState(500)
      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_POISON)

      expect(result.success).toBe(true)
      expect(result.state!.party.gold).toBe(450) // 500 - 50
    })

    it('returns error if party has insufficient gold', () => {
      const state = createTestGameState(30) // Need 50 for cure poison
      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_POISON)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient party gold')
      expect(result.state).toBeUndefined()
    })

    it('returns error if character not found', () => {
      const state = createTestGameState(500)
      const result = TempleService.performService(state, 'invalid-id', ServiceType.CURE_POISON)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Character not found')
    })

    it('cures poisoned character', () => {
      const state = createTestGameState(500)
      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_POISON)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
    })

    it('cures paralyzed character', () => {
      const paralyzedChar = { ...mockCharacter, status: CharacterStatus.PARALYZED }
      const state = createTestGameState(500)
      state.roster.set(mockCharacter.id, paralyzedChar)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_PARALYSIS)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
      expect(result.state!.party.gold).toBe(400) // 500 - 100
    })

    it('handles resurrection with high vitality (should succeed)', () => {
      const deadChar = { ...mockCharacter, status: CharacterStatus.DEAD, vitality: 18 }
      const state = createTestGameState(2000)
      state.roster.set(mockCharacter.id, deadChar)

      // Mock Math.random to guarantee success
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.5) // Will succeed (50% + 36% = 86% success rate)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESURRECT)

      Math.random = originalRandom

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
      expect(result.state!.party.gold).toBe(750) // 2000 - 1250 (250 × 5)
    })

    it('handles resurrection failure (DEAD → ASHES)', () => {
      const deadChar = { ...mockCharacter, status: CharacterStatus.DEAD, vitality: 3 }
      const state = createTestGameState(2000)
      state.roster.set(mockCharacter.id, deadChar)

      // Mock Math.random to guarantee failure
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.9) // Will fail (50% + 6% = 56% success rate)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESURRECT)

      Math.random = originalRandom

      expect(result.success).toBe(false)
      expect(result.error).toBe('Resurrection failed. Gandalf has turned to ashes.')
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.ASHES)
      expect(result.state!.party.gold).toBe(750) // Still charged
    })

    it('handles restoration success (ASHES → OK)', () => {
      const ashesChar = { ...mockCharacter, status: CharacterStatus.ASHES, vitality: 18 }
      const state = createTestGameState(3000)
      state.roster.set(mockCharacter.id, ashesChar)

      // Mock Math.random to guarantee success
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.3) // Will succeed (40% + 18% = 58% success rate)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESTORE)

      Math.random = originalRandom

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
      expect(result.state!.party.gold).toBe(500) // 3000 - 2500 (500 × 5)
    })

    it('handles restoration failure (ASHES → LOST)', () => {
      const ashesChar = { ...mockCharacter, status: CharacterStatus.ASHES, vitality: 3 }
      const state = createTestGameState(3000)
      state.roster.set(mockCharacter.id, ashesChar)

      // Mock Math.random to guarantee failure
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.9) // Will fail (40% + 3% = 43% success rate)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESTORE)

      Math.random = originalRandom

      expect(result.success).toBe(false)
      expect(result.error).toBe('Restoration failed. Gandalf is lost forever.')
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.LOST)
      expect(result.state!.party.gold).toBe(500) // Still charged
    })
  })
})
