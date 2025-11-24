import { EncounterService } from '../EncounterService'
import { MonsterDataLoader } from '../MonsterDataLoader'

// Load monster data before tests
beforeAll(async () => {
  if (!MonsterDataLoader.isLoaded()) {
    await MonsterDataLoader.loadAll()
  }
})

describe('EncounterService', () => {
  describe('rollRandomEncounter', () => {
    it('returns true approximately 10% of the time', () => {
      const rolls = Array.from({ length: 1000 }, () =>
        EncounterService.rollRandomEncounter()
      )
      const trueCount = rolls.filter(Boolean).length

      // Expect ~100 true results ± 50 (statistical variance)
      expect(trueCount).toBeGreaterThan(50)
      expect(trueCount).toBeLessThan(150)
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
})
