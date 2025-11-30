import { TempleService } from '../TempleService'
import { RandomService } from '../RandomService'
import { ServiceType } from '@models/ServiceType'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { GameState } from '@models/GameState'
import { Party } from '@models/Party'

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
    age: 1040,  // 20 years in weeks
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

    it('calculates cure paralysis tithe (100 × level) - authentic Wizardry 1', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.CURE_PARALYSIS)
      expect(tithe).toBe(500) // 100 × 5 (authentic Wizardry 1)
    })

    it('calculates cure stoned tithe (200 × level) - authentic Wizardry 1', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.CURE_STONED)
      expect(tithe).toBe(1000) // 200 × 5 (authentic Wizardry 1)
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

  describe('getServiceAgeIncrease (authentic Wizardry 1)', () => {
    it('cure poison does not age character', () => {
      expect(TempleService.getServiceAgeIncrease(ServiceType.CURE_POISON)).toBe(0)
    })

    it('cure paralysis does not age character', () => {
      expect(TempleService.getServiceAgeIncrease(ServiceType.CURE_PARALYSIS)).toBe(0)
    })

    it('cure stoned does not age character', () => {
      expect(TempleService.getServiceAgeIncrease(ServiceType.CURE_STONED)).toBe(0)
    })

    it('resurrection ages character by 1 year (52 weeks)', () => {
      expect(TempleService.getServiceAgeIncrease(ServiceType.RESURRECT)).toBe(52)
    })

    it('restoration ages character by 1 year (52 weeks)', () => {
      expect(TempleService.getServiceAgeIncrease(ServiceType.RESTORE)).toBe(52)
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
      const state = createTestGameState(1000)  // More gold for authentic cost
      state.roster.set(mockCharacter.id, paralyzedChar)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_PARALYSIS)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
      expect(result.state!.party.gold).toBe(500) // 1000 - 500 (100 × 5 authentic)
    })

    it('cures stoned character', () => {
      const stonedChar = { ...mockCharacter, status: CharacterStatus.STONED }
      const state = createTestGameState(2000)
      state.roster.set(mockCharacter.id, stonedChar)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_STONED)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
      expect(result.state!.party.gold).toBe(1000) // 2000 - 1000 (200 × 5 authentic)
    })

    it('handles resurrection with high vitality (should succeed)', () => {
      const deadChar = { ...mockCharacter, status: CharacterStatus.DEAD, vitality: 18, hp: 0 }
      const state = createTestGameState(2000)
      state.roster.set(mockCharacter.id, deadChar)

      // Queue random value: 50% < 86% (50% + 36%) = success
      RandomService.queueNextValues([0.5])

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESURRECT)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
      expect(result.state!.party.gold).toBe(750) // 2000 - 1250 (250 × 5)
    })

    it('sets HP to 1 on successful resurrection (barely alive)', () => {
      const deadChar = { ...mockCharacter, status: CharacterStatus.DEAD, vitality: 18, hp: 0, maxHp: 50 }
      const state = createTestGameState(2000)
      state.roster.set(mockCharacter.id, deadChar)

      // Queue random value for success
      RandomService.queueNextValues([0.5])

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESURRECT)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.hp).toBe(1) // Resurrected with 1 HP
      expect(updatedChar!.maxHp).toBe(50) // maxHp unchanged
    })

    it('handles resurrection failure (DEAD → ASHES)', () => {
      const deadChar = { ...mockCharacter, status: CharacterStatus.DEAD, vitality: 3, hp: 0 }
      const state = createTestGameState(2000)
      state.roster.set(mockCharacter.id, deadChar)

      // Queue random value: 90% >= 56% (50% + 6%) = failure
      RandomService.queueNextValues([0.9])

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESURRECT)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Resurrection failed. Gandalf has turned to ashes.')
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.ASHES)
      expect(updatedChar!.hp).toBe(0) // HP remains 0
      expect(result.state!.party.gold).toBe(750) // Still charged
    })

    it('handles restoration success (ASHES → OK)', () => {
      const ashesChar = { ...mockCharacter, status: CharacterStatus.ASHES, vitality: 18, hp: 0 }
      const state = createTestGameState(3000)
      state.roster.set(mockCharacter.id, ashesChar)

      // Queue random value: 30% < 58% (40% + 18%) = success
      RandomService.queueNextValues([0.3])

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESTORE)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
      expect(result.state!.party.gold).toBe(500) // 3000 - 2500 (500 × 5)
    })

    it('restores full HP on successful restoration (per original Wizardry 1)', () => {
      const ashesChar = { ...mockCharacter, status: CharacterStatus.ASHES, vitality: 18, hp: 0, maxHp: 50 }
      const state = createTestGameState(3000)
      state.roster.set(mockCharacter.id, ashesChar)

      // Queue random value for success
      RandomService.queueNextValues([0.3])

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESTORE)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.hp).toBe(50) // Full HP restored
      expect(updatedChar!.maxHp).toBe(50)
    })

    it('handles restoration failure (ASHES → LOST)', () => {
      const ashesChar = { ...mockCharacter, status: CharacterStatus.ASHES, vitality: 3, hp: 0 }
      const state = createTestGameState(3000)
      state.roster.set(mockCharacter.id, ashesChar)

      // Queue random value: 90% >= 43% (40% + 3%) = failure
      RandomService.queueNextValues([0.9])

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESTORE)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Restoration failed. Gandalf is lost forever.')
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.status).toBe(CharacterStatus.LOST)
      expect(updatedChar!.hp).toBe(0) // HP remains 0
      expect(result.state!.party.gold).toBe(500) // Still charged
    })

    it('does not change HP for cure poison service', () => {
      const poisonedChar = { ...mockCharacter, status: CharacterStatus.POISONED, hp: 15, maxHp: 25 }
      const state = createTestGameState(500)
      state.roster.set(mockCharacter.id, poisonedChar)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_POISON)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.hp).toBe(15) // HP unchanged
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
    })

    it('does not change HP for cure paralysis service', () => {
      const paralyzedChar = { ...mockCharacter, status: CharacterStatus.PARALYZED, hp: 10, maxHp: 25 }
      const state = createTestGameState(1000)  // More gold for authentic cost
      state.roster.set(mockCharacter.id, paralyzedChar)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_PARALYSIS)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.hp).toBe(10) // HP unchanged
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
    })

    it('does not change HP for cure stoned service', () => {
      const stonedChar = { ...mockCharacter, status: CharacterStatus.STONED, hp: 10, maxHp: 25 }
      const state = createTestGameState(2000)
      state.roster.set(mockCharacter.id, stonedChar)

      const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_STONED)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get(mockCharacter.id)
      expect(updatedChar!.hp).toBe(10) // HP unchanged
      expect(updatedChar!.status).toBe(CharacterStatus.OK)
    })

    describe('temple aging (authentic Wizardry 1)', () => {
      it('resurrection ages character by 1 year (52 weeks)', () => {
        const deadChar = { ...mockCharacter, status: CharacterStatus.DEAD, vitality: 18, hp: 0, age: 1040 } // 20 years
        const state = createTestGameState(2000)
        state.roster.set(mockCharacter.id, deadChar)

        RandomService.queueNextValues([0.5])  // Success

        const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESURRECT)

        expect(result.success).toBe(true)
        expect(result.ageIncrease).toBe(52)  // 1 year
        const updatedChar = result.state!.roster.get(mockCharacter.id)
        expect(updatedChar!.age).toBe(1092)  // 1040 + 52 = 21 years
      })

      it('restoration ages character by 1 year (52 weeks)', () => {
        const ashesChar = { ...mockCharacter, status: CharacterStatus.ASHES, vitality: 18, hp: 0, age: 1040 }
        const state = createTestGameState(3000)
        state.roster.set(mockCharacter.id, ashesChar)

        RandomService.queueNextValues([0.3])  // Success

        const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESTORE)

        expect(result.success).toBe(true)
        expect(result.ageIncrease).toBe(52)
        const updatedChar = result.state!.roster.get(mockCharacter.id)
        expect(updatedChar!.age).toBe(1092)
      })

      it('failed resurrection still ages character', () => {
        const deadChar = { ...mockCharacter, status: CharacterStatus.DEAD, vitality: 3, hp: 0, age: 1040 }
        const state = createTestGameState(2000)
        state.roster.set(mockCharacter.id, deadChar)

        RandomService.queueNextValues([0.9])  // Failure

        const result = TempleService.performService(state, mockCharacter.id, ServiceType.RESURRECT)

        expect(result.success).toBe(false)
        expect(result.ageIncrease).toBe(52)
        const updatedChar = result.state!.roster.get(mockCharacter.id)
        expect(updatedChar!.age).toBe(1092)  // Still aged
        expect(updatedChar!.status).toBe(CharacterStatus.ASHES)
      })

      it('cure poison does not age character', () => {
        const poisonedChar = { ...mockCharacter, status: CharacterStatus.POISONED, age: 1040 }
        const state = createTestGameState(500)
        state.roster.set(mockCharacter.id, poisonedChar)

        const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_POISON)

        expect(result.success).toBe(true)
        expect(result.ageIncrease).toBe(0)
        const updatedChar = result.state!.roster.get(mockCharacter.id)
        expect(updatedChar!.age).toBe(1040)  // Unchanged
      })

      it('cure paralysis does not age character', () => {
        const paralyzedChar = { ...mockCharacter, status: CharacterStatus.PARALYZED, age: 1040 }
        const state = createTestGameState(1000)
        state.roster.set(mockCharacter.id, paralyzedChar)

        const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_PARALYSIS)

        expect(result.success).toBe(true)
        expect(result.ageIncrease).toBe(0)
        const updatedChar = result.state!.roster.get(mockCharacter.id)
        expect(updatedChar!.age).toBe(1040)  // Unchanged
      })

      it('cure stoned does not age character', () => {
        const stonedChar = { ...mockCharacter, status: CharacterStatus.STONED, age: 1040 }
        const state = createTestGameState(2000)
        state.roster.set(mockCharacter.id, stonedChar)

        const result = TempleService.performService(state, mockCharacter.id, ServiceType.CURE_STONED)

        expect(result.success).toBe(true)
        expect(result.ageIncrease).toBe(0)
        const updatedChar = result.state!.roster.get(mockCharacter.id)
        expect(updatedChar!.age).toBe(1040)  // Unchanged
      })
    })
  })
})
