// src/services/__tests__/VictoryService.spec.ts
import { VictoryService } from '../VictoryService'
import { createTestMonster, createTestCharacter } from '../../test-helpers/test-factories'

describe('VictoryService', () => {
  describe('calculateVictoryRewards', () => {
    it('calculates total XP from all monsters', () => {
      const monsters = [
        createTestMonster({ xp: 50 }),
        createTestMonster({ xp: 50 }),
        createTestMonster({ xp: 50 })
      ]

      const result = VictoryService.calculateVictoryRewards(monsters, 6)

      expect(result.totalXP).toBe(150)
      expect(result.xpPerCharacter).toBe(25)  // 150 / 6
    })

    it('calculates total gold from all monsters', () => {
      const monsters = [
        createTestMonster({ gold: 10 }),
        createTestMonster({ gold: 20 }),
        createTestMonster({ gold: 30 })
      ]

      const result = VictoryService.calculateVictoryRewards(monsters, 6)

      expect(result.totalGold).toBe(60)
    })

    it('handles monsters with no gold', () => {
      const monsters = [
        createTestMonster({ gold: undefined }),
        createTestMonster({ gold: 0 }),
        createTestMonster({ gold: 10 })
      ]

      const result = VictoryService.calculateVictoryRewards(monsters, 3)

      expect(result.totalGold).toBe(10)
    })

    it('divides XP evenly rounded down', () => {
      const monsters = [createTestMonster({ xp: 100 })]

      const result = VictoryService.calculateVictoryRewards(monsters, 3)

      expect(result.xpPerCharacter).toBe(33)  // floor(100/3)
    })

    it('handles empty monster array', () => {
      const result = VictoryService.calculateVictoryRewards([], 1)
      expect(result).toEqual({ totalXP: 0, xpPerCharacter: 0, totalGold: 0 })
    })
  })

  describe('distributeRewards', () => {
    it('adds XP to all party members', () => {
      const char1 = createTestCharacter({ id: 'c1', experience: 100 })
      const char2 = createTestCharacter({ id: 'c2', experience: 200 })
      const roster = new Map([
        ['c1', char1],
        ['c2', char2]
      ])
      const partyMembers = ['c1', 'c2']

      const newRoster = VictoryService.distributeRewards(roster, partyMembers, 50, 100)

      expect(newRoster.get('c1')!.experience).toBe(150)
      expect(newRoster.get('c2')!.experience).toBe(250)
    })

    it('returns new Map instance (immutable)', () => {
      const roster = new Map([['c1', createTestCharacter()]])
      const partyMembers = ['c1']

      const newRoster = VictoryService.distributeRewards(roster, partyMembers, 10, 10)

      expect(newRoster).not.toBe(roster)
    })

    it('skips party members not in roster', () => {
      const char1 = createTestCharacter({ id: 'c1', experience: 100 })
      const roster = new Map([['c1', char1]])
      const partyMembers = ['c1', 'c2', 'c3']  // c2, c3 don't exist

      const newRoster = VictoryService.distributeRewards(roster, partyMembers, 10, 0)

      expect(newRoster.size).toBe(1)  // Only c1 updated
      expect(newRoster.has('c2')).toBe(false)
      expect(newRoster.get('c1')!.experience).toBe(110)  // c1 got XP
    })
  })
})
