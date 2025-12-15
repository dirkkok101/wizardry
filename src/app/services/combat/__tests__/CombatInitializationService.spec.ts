/**
 * CombatInitializationService Tests
 *
 * Tests for combat state initialization including:
 * - Party level calculations
 * - Surprise state determination
 * - Combat state creation
 */

import { RandomService } from '@services/RandomService'
import {
  CombatInitializationService,
  calculateAveragePartyLevel,
  calculateMinPartyLevel,
  initializeGroupMageLevels,
} from '../support/CombatInitializationService'
import { createTestCharacter } from '@testing/test-factories'
import { MonsterGroup } from '@models/Combat'

describe('CombatInitializationService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateAveragePartyLevel', () => {
    it('returns 1 for empty party', () => {
      expect(calculateAveragePartyLevel([])).toBe(1)
    })

    it('calculates average for single character', () => {
      const party = [createTestCharacter({ level: 5 })]
      expect(calculateAveragePartyLevel(party)).toBe(5)
    })

    it('calculates average for multiple characters', () => {
      const party = [
        createTestCharacter({ level: 3 }),
        createTestCharacter({ level: 5 }),
        createTestCharacter({ level: 7 }),
      ]
      // (3 + 5 + 7) / 3 = 5
      expect(calculateAveragePartyLevel(party)).toBe(5)
    })

    it('floors the average', () => {
      const party = [
        createTestCharacter({ level: 1 }),
        createTestCharacter({ level: 2 }),
      ]
      // (1 + 2) / 2 = 1.5 -> 1
      expect(calculateAveragePartyLevel(party)).toBe(1)
    })
  })

  describe('calculateMinPartyLevel', () => {
    it('returns 1 for empty party', () => {
      expect(calculateMinPartyLevel([])).toBe(1)
    })

    it('returns level for single character', () => {
      const party = [createTestCharacter({ level: 5 })]
      expect(calculateMinPartyLevel(party)).toBe(5)
    })

    it('returns minimum level from party', () => {
      const party = [
        createTestCharacter({ level: 7 }),
        createTestCharacter({ level: 3 }),
        createTestCharacter({ level: 5 }),
      ]
      expect(calculateMinPartyLevel(party)).toBe(3)
    })
  })

  describe('initializeGroupMageLevels', () => {
    it('returns empty array for empty input', () => {
      expect(initializeGroupMageLevels([])).toEqual([])
    })

    it('initializes mageLevel from first monster in group', () => {
      const groups: MonsterGroup[] = [
        {
          id: 'A',
          monsters: [
            {
              id: 'm1',
              monsterId: 'test',
              name: 'Test Monster',
              unidentifiedName: 'Monster',
              hp: 10,
              maxHp: 10,
              ac: 5,
              damage: [],
              xp: 100,
              status: 'ALIVE',
              level: 3,
              agility: 10,
              undead: false,
              mageLevel: 4,
            },
          ],
          formation: 'front',
          identified: false,
        },
      ]

      const result = initializeGroupMageLevels(groups)
      expect(result[0].currentMageLevel).toBe(4)
    })

    it('sets currentMageLevel to 0 if monster has no mageLevel', () => {
      const groups: MonsterGroup[] = [
        {
          id: 'A',
          monsters: [
            {
              id: 'm1',
              monsterId: 'test',
              name: 'Test Monster',
              unidentifiedName: 'Monster',
              hp: 10,
              maxHp: 10,
              ac: 5,
              damage: [],
              xp: 100,
              status: 'ALIVE',
              level: 3,
              agility: 10,
              undead: false,
            },
          ],
          formation: 'front',
          identified: false,
        },
      ]

      const result = initializeGroupMageLevels(groups)
      expect(result[0].currentMageLevel).toBe(0)
    })

    it('preserves other group properties', () => {
      const groups: MonsterGroup[] = [
        {
          id: 'B',
          monsters: [],
          formation: 'back',
          identified: true,
        },
      ]

      const result = initializeGroupMageLevels(groups)
      expect(result[0].id).toBe('B')
      expect(result[0].formation).toBe('back')
      expect(result[0].identified).toBe(true)
    })
  })

  describe('determineSurpriseState', () => {
    it('returns monsters when forceAmbush is true', () => {
      const result = CombatInitializationService.determineSurpriseState(true)
      expect(result).toBe('monsters')
    })

    it('returns party when party surprises', () => {
      // Queue values for surprise rolls: party roll < 20%, monsters roll >= 20%
      RandomService.queueNextValues([0.1, 0.5])
      const result = CombatInitializationService.determineSurpriseState(false)
      expect(result).toBe('party')
    })

    it('returns monsters when monsters surprise', () => {
      // Queue values: party roll >= 20%, monsters roll < 20%
      RandomService.queueNextValues([0.5, 0.1])
      const result = CombatInitializationService.determineSurpriseState(false)
      expect(result).toBe('monsters')
    })

    it('returns none when neither surprises', () => {
      // Queue values: both rolls >= 20%
      RandomService.queueNextValues([0.5, 0.5])
      const result = CombatInitializationService.determineSurpriseState(false)
      expect(result).toBe('none')
    })
  })
})
