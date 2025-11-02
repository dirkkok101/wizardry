import { Race, RaceData, parseSavingThrowBonus } from '../Race'

describe('Race Type System', () => {
  describe('RaceData interface', () => {
    it('matches JSON structure for Human', () => {
      const human: RaceData = {
        id: 'human',
        name: 'Human',
        baseStats: {
          str: 8,
          int: 8,
          pie: 5,
          vit: 8,
          agi: 8,
          luc: 9
        },
        savingThrowBonus: {
          death: -1
        },
        statTotal: 46,
        description: 'Test',
        strengths: [],
        weaknesses: [],
        bestClasses: []
      }

      expect(human.baseStats.str).toBe(8)
      expect(human.savingThrowBonus.death).toBe(-1)
    })

    it('matches JSON structure for Elf', () => {
      const elf: RaceData = {
        id: 'elf',
        name: 'Elf',
        baseStats: {
          str: 7,
          int: 10,
          pie: 10,
          vit: 6,
          agi: 9,
          luc: 6
        },
        savingThrowBonus: {
          wand: -2
        },
        statTotal: 48,
        description: 'Test',
        strengths: [],
        weaknesses: [],
        bestClasses: []
      }

      expect(elf.savingThrowBonus.wand).toBe(-2)
    })
  })

  describe('parseSavingThrowBonus', () => {
    it('parses death bonus correctly', () => {
      const bonus = parseSavingThrowBonus({ death: -1 })
      expect(bonus.death).toBe(-1)
      expect(bonus.wand).toBeUndefined()
    })

    it('handles empty saving throw bonuses', () => {
      const bonus = parseSavingThrowBonus({})
      expect(bonus).toEqual({})
    })
  })
})
