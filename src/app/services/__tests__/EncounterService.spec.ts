import { EncounterService } from '../EncounterService'
import { RandomService } from '../RandomService'
import { ENCOUNTER_CONFIG } from '@models/Combat'
import { loadMonstersForTests } from '@testing/test-data-loader'

// Load monster data before tests (cached for all tests in this file)
beforeAll(async () => {
  await loadMonstersForTests()
})

describe('EncounterService', () => {
  describe('rollRandomEncounter', () => {
    it('returns true approximately 1% of the time (authentic Wizardry 1)', () => {
      const rolls = Array.from({ length: 10000 }, () =>
        EncounterService.rollRandomEncounter()
      )
      const trueCount = rolls.filter(Boolean).length

      // Expect ~101 true results (1/99 = 1.01%) with reasonable variance
      // Over 10000 rolls, expect approximately 101 triggers
      expect(trueCount).toBeGreaterThan(50)
      expect(trueCount).toBeLessThan(200)
    })

    it('returns boolean value', () => {
      const result = EncounterService.rollRandomEncounter()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getEncounterTable', () => {
    it('loads level 1 encounter table', () => {
      const table = EncounterService.getEncounterTable(1)

      expect(table.levelId).toBe('level_1_monsters')
      expect(table.encounterRate).toBe(0.10)
      expect(table.monsters.length).toBeGreaterThan(0)
    })

    it('includes kobold in level 1 monsters', () => {
      const table = EncounterService.getEncounterTable(1)
      const kobold = table.monsters.find(m => m.monsterId === 'kobold')

      expect(kobold).toBeDefined()
      expect(kobold?.weight).toBeGreaterThan(0)
    })

    it('loads level 2 encounter table', () => {
      const table = EncounterService.getEncounterTable(2)

      expect(table.levelId).toBe('level_2_monsters')
    })

    it('throws error for invalid level', () => {
      expect(() => EncounterService.getEncounterTable(0)).toThrow()
      expect(() => EncounterService.getEncounterTable(11)).toThrow()
    })
  })

  describe('selectMonster', () => {
    it('selects monster from level 1 table', () => {
      const table = EncounterService.getEncounterTable(1)
      const monsterId = EncounterService.selectMonster(table)

      const validMonsters = table.monsters.map(m => m.monsterId)
      expect(validMonsters).toContain(monsterId)
    })

    it('respects weight distribution over many selections', () => {
      const table = EncounterService.getEncounterTable(1)

      // Kobold has weight 20, Lvl 1 Mage has weight 1
      // Over 1000 selections, kobold should appear much more frequently
      const selections = Array.from({ length: 1000 }, () =>
        EncounterService.selectMonster(table)
      )

      const koboldCount = selections.filter(id => id === 'kobold').length
      const mageCount = selections.filter(id => id === 'lvl_1_mage').length

      expect(koboldCount).toBeGreaterThan(mageCount)
    })
  })

  describe('generateEncounter', () => {
    describe('group count limits by level', () => {
      it('generates 1-2 groups for level 1', () => {
        // Run 100 times to test randomness
        for (let i = 0; i < 100; i++) {
          const groups = EncounterService.generateEncounter(1)
          expect(groups.length).toBeGreaterThanOrEqual(1)
          expect(groups.length).toBeLessThanOrEqual(2)
        }
      })

      it('generates 1-3 groups for level 2', () => {
        for (let i = 0; i < 100; i++) {
          const groups = EncounterService.generateEncounter(2)
          expect(groups.length).toBeGreaterThanOrEqual(1)
          expect(groups.length).toBeLessThanOrEqual(3)
        }
      })

      it('generates 1-4 groups for level 3+', () => {
        for (let i = 0; i < 100; i++) {
          const groups = EncounterService.generateEncounter(5)
          expect(groups.length).toBeGreaterThanOrEqual(1)
          expect(groups.length).toBeLessThanOrEqual(4)
        }
      })
    })

    describe('weighted group count distribution', () => {
      it('generates single group on level 1 when random falls in 85% range', () => {
        // Queue value at 0.5 (50%) which is within the 85% single-group threshold
        RandomService.queueNextValues([0.5])
        const groups = EncounterService.generateEncounter(1)
        expect(groups.length).toBe(1)
      })

      it('generates two groups on level 1 when random falls in 15% range', () => {
        // Queue value at 0.90 (90%) which exceeds the 85% threshold
        RandomService.queueNextValues([0.90])
        const groups = EncounterService.generateEncounter(1)
        expect(groups.length).toBe(2)
      })

      it('statistically favors single groups on level 1 (~85%)', () => {
        // Generate 200 encounters and check distribution
        const groupCounts = Array.from({ length: 200 }, () =>
          EncounterService.generateEncounter(1).length
        )

        const singleGroupCount = groupCounts.filter(c => c === 1).length
        const twoGroupCount = groupCounts.filter(c => c === 2).length

        // With 85/15 weights, expect ~170 single groups (allow ±30 for variance)
        expect(singleGroupCount).toBeGreaterThan(140)
        expect(singleGroupCount).toBeLessThan(200)
        expect(twoGroupCount).toBeGreaterThan(0)
        expect(twoGroupCount).toBeLessThan(60)
      })

      it('has more varied distribution on deeper levels', () => {
        // Generate 200 encounters on level 5 and check for all group sizes
        const groupCounts = Array.from({ length: 200 }, () =>
          EncounterService.generateEncounter(5).length
        )

        // Level 4+ has 25/35/25/15 weights, so all sizes should appear
        const uniqueSizes = new Set(groupCounts)
        expect(uniqueSizes.size).toBeGreaterThanOrEqual(3) // Should see at least 3 different group sizes
      })
    })

    describe('ENCOUNTER_CONFIG.getGroupCountWeights', () => {
      it('returns JSON weights when no party level override', () => {
        const jsonWeights = [85, 15]
        expect(ENCOUNTER_CONFIG.getGroupCountWeights(jsonWeights)).toEqual([85, 15])
      })

      it('returns JSON weights when party level >= 4', () => {
        const jsonWeights = [60, 30, 10]
        expect(ENCOUNTER_CONFIG.getGroupCountWeights(jsonWeights, 4)).toEqual([60, 30, 10])
        expect(ENCOUNTER_CONFIG.getGroupCountWeights(jsonWeights, 5)).toEqual([60, 30, 10])
        expect(ENCOUNTER_CONFIG.getGroupCountWeights(jsonWeights, 10)).toEqual([60, 30, 10])
      })

      it('returns [100] for low-level parties (< level 4) to force single group', () => {
        const jsonWeights = [25, 35, 25, 15]
        expect(ENCOUNTER_CONFIG.getGroupCountWeights(jsonWeights, 1)).toEqual([100])
        expect(ENCOUNTER_CONFIG.getGroupCountWeights(jsonWeights, 2)).toEqual([100])
        expect(ENCOUNTER_CONFIG.getGroupCountWeights(jsonWeights, 3)).toEqual([100])
      })

      it('encounter tables have weights that sum to 100', () => {
        // Test that encounter table JSON data is valid
        const table1 = EncounterService.getEncounterTable(1)
        const table4 = EncounterService.getEncounterTable(4)

        const sum1 = table1.groupCountWeights.reduce((a, b) => a + b, 0)
        const sum4 = table4.groupCountWeights.reduce((a, b) => a + b, 0)

        expect(sum1).toBe(100)
        expect(sum4).toBe(100)
      })
    })

    describe('group ID assignment', () => {
      it('assigns unique group IDs (A, B, C, D)', () => {
        const groups = EncounterService.generateEncounter(10)
        const ids = groups.map(g => g.id)

        // All IDs should be unique
        expect(new Set(ids).size).toBe(ids.length)

        // All IDs should be valid
        expect(ids.every(id => ['A', 'B', 'C', 'D'].includes(id))).toBe(true)
      })

      it('assigns IDs in order (A, then B, then C, then D)', () => {
        // Generate many encounters until we get 4 groups
        let groups
        for (let i = 0; i < 100; i++) {
          groups = EncounterService.generateEncounter(10)
          if (groups.length === 4) break
        }

        expect(groups).toBeDefined()
        expect(groups![0].id).toBe('A')
        expect(groups![1].id).toBe('B')
        expect(groups![2].id).toBe('C')
        expect(groups![3].id).toBe('D')
      })
    })

    describe('monster count limits per group', () => {
      it('respects 5 monster limit for level 1', () => {
        // Run 50 times to test various monster types
        for (let i = 0; i < 50; i++) {
          const groups = EncounterService.generateEncounter(1)
          for (const group of groups) {
            expect(group.monsters.length).toBeGreaterThanOrEqual(1)
            expect(group.monsters.length).toBeLessThanOrEqual(5)
          }
        }
      })

      it('respects 6 monster limit for level 2', () => {
        for (let i = 0; i < 50; i++) {
          const groups = EncounterService.generateEncounter(2)
          for (const group of groups) {
            expect(group.monsters.length).toBeGreaterThanOrEqual(1)
            expect(group.monsters.length).toBeLessThanOrEqual(6)
          }
        }
      })

      it('respects 9 monster limit for level 5+', () => {
        for (let i = 0; i < 50; i++) {
          const groups = EncounterService.generateEncounter(5)
          for (const group of groups) {
            expect(group.monsters.length).toBeGreaterThanOrEqual(1)
            expect(group.monsters.length).toBeLessThanOrEqual(9)
          }
        }
      })
    })

    describe('formation assignment', () => {
      it('assigns formation to each group', () => {
        const groups = EncounterService.generateEncounter(5)

        for (const group of groups) {
          expect(group.formation).toBeDefined()
          expect(['front', 'back']).toContain(group.formation)
        }
      })

      it('assigns varied formations over multiple encounters', () => {
        const formations: string[] = []

        // Generate 100 encounters and collect all formations
        for (let i = 0; i < 100; i++) {
          const groups = EncounterService.generateEncounter(5)
          formations.push(...groups.map(g => g.formation))
        }

        // Should have both front and back row groups
        expect(formations.includes('front')).toBe(true)
        expect(formations.includes('back')).toBe(true)
      })
    })

    describe('monster instances', () => {
      it('creates valid monster instances in each group', () => {
        const groups = EncounterService.generateEncounter(5)

        for (const group of groups) {
          expect(group.monsters.length).toBeGreaterThan(0)

          for (const monster of group.monsters) {
            expect(monster.id).toBeDefined()
            expect(monster.monsterId).toBeDefined()
            expect(monster.name).toBeDefined()
            expect(monster.hp).toBeGreaterThan(0)
            expect(monster.maxHp).toBeGreaterThan(0)
            expect(monster.hp).toBeLessThanOrEqual(monster.maxHp)
            expect(monster.status).toBe('ALIVE')
          }
        }
      })

      it('creates unique monster IDs within and across groups', () => {
        const groups = EncounterService.generateEncounter(10)
        const allMonsterIds = groups.flatMap(g => g.monsters.map(m => m.id))

        // All monster IDs should be unique
        expect(new Set(allMonsterIds).size).toBe(allMonsterIds.length)
      })
    })

    describe('encounter variety', () => {
      it('generates varied encounters over multiple runs', () => {
        const encounterSummaries: string[] = []

        // Generate 50 encounters and summarize them
        for (let i = 0; i < 50; i++) {
          const groups = EncounterService.generateEncounter(5)
          const summary = groups
            .map(g => `${g.id}:${g.monsters[0].monsterId}:${g.monsters.length}`)
            .join('|')
          encounterSummaries.push(summary)
        }

        // Should have at least 10 different encounter configurations
        const uniqueEncounters = new Set(encounterSummaries)
        expect(uniqueEncounters.size).toBeGreaterThanOrEqual(10)
      })
    })
  })

  describe('determineFormation', () => {
    it('returns front or back', () => {
      const monsters = [{ id: '1' }, { id: '2' }] as any

      const formation = EncounterService.determineFormation(monsters)
      expect(['front', 'back']).toContain(formation)
    })

    it('returns varied results over multiple calls', () => {
      const formations = Array.from({ length: 100 }, () =>
        EncounterService.determineFormation([{ id: '1' }] as any)
      )

      // Should have both front and back
      expect(formations.includes('front')).toBe(true)
      expect(formations.includes('back')).toBe(true)

      // Distribution should be roughly 50/50 (within 20-80 range)
      const frontCount = formations.filter(f => f === 'front').length
      expect(frontCount).toBeGreaterThan(20)
      expect(frontCount).toBeLessThan(80)
    })
  })

  describe('checkFriendlyEncounter', () => {
    it('returns false for evil-aligned parties', () => {
      const result = EncounterService.checkFriendlyEncounter('evil', 'dragon')

      expect(result).toBe(false)
    })

    it('returns false for neutral-aligned parties', () => {
      const result = EncounterService.checkFriendlyEncounter('neutral', 'dragon')

      expect(result).toBe(false)
    })

    it('checks 26% chance for dragon class with good party', () => {
      RandomService.queueNextValues([0.2])  // 20% < 26% = friendly

      const result = EncounterService.checkFriendlyEncounter('good', 'dragon')

      expect(result).toBe(true)
    })

    it('checks 11% chance for fighter class with good party', () => {
      RandomService.queueNextValues([0.1])  // 10% < 11% = friendly

      const result = EncounterService.checkFriendlyEncounter('good', 'fighter')

      expect(result).toBe(true)
    })

    it('checks 1% chance for undead class with good party', () => {
      RandomService.queueNextValues([0.005])  // 0.5% < 1% = friendly

      const result = EncounterService.checkFriendlyEncounter('good', 'undead')

      expect(result).toBe(true)
    })

    it('fails friendly check when roll exceeds chance', () => {
      RandomService.queueNextValues([0.5])  // 50% > 26% = not friendly

      const result = EncounterService.checkFriendlyEncounter('good', 'dragon')

      expect(result).toBe(false)
    })
  })

  describe('LATUMAPIC identification', () => {
    describe('generateEncounter', () => {
      it('generates unidentified groups when latumapicActive is false', () => {
        const groups = EncounterService.generateEncounter(1, false)

        for (const group of groups) {
          expect(group.identified).toBe(false)
        }
      })

      it('generates identified groups when latumapicActive is true', () => {
        const groups = EncounterService.generateEncounter(1, true)

        for (const group of groups) {
          expect(group.identified).toBe(true)
        }
      })

      it('defaults to unidentified when latumapicActive is not provided', () => {
        const groups = EncounterService.generateEncounter(1)

        for (const group of groups) {
          expect(group.identified).toBe(false)
        }
      })
    })

    describe('generateFixedEncounter', () => {
      it('generates unidentified groups when latumapicActive is false', () => {
        const groups = EncounterService.generateFixedEncounter(1, { encounterId: 'kobold' }, false)

        expect(groups.length).toBe(1)
        expect(groups[0].identified).toBe(false)
      })

      it('generates identified groups when latumapicActive is true', () => {
        const groups = EncounterService.generateFixedEncounter(1, { encounterId: 'kobold' }, true)

        expect(groups.length).toBe(1)
        expect(groups[0].identified).toBe(true)
      })

      it('defaults to unidentified when latumapicActive is not provided', () => {
        const groups = EncounterService.generateFixedEncounter(1, { encounterId: 'kobold' })

        expect(groups.length).toBe(1)
        expect(groups[0].identified).toBe(false)
      })
    })
  })
})
