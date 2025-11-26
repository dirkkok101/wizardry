import { CharacterCreationService } from '../CharacterCreationService'
import { Race } from '@types/Race'
import { RaceService } from '../RaceService'
import * as fs from 'fs'
import * as path from 'path'

describe('CharacterCreationService', () => {
  beforeAll(async () => {
    // Mock fetch to load real data files from data/ directory
    global.fetch = jest.fn((url: string) => {
      const urlPath = url.toString()

      // Extract filename from URL (e.g., '/assets/races/human.json' -> 'human.json')
      const match = urlPath.match(/\/(races|classes)\/([^/]+\.json)/)
      if (match) {
        const [, directory, filename] = match
        const dataPath = path.join(__dirname, '../../../../data', directory, filename)

        try {
          const fileContent = fs.readFileSync(dataPath, 'utf-8')
          const jsonData = JSON.parse(fileContent)

          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(jsonData)
          } as Response)
        } catch (error) {
          return Promise.reject(new Error(`File not found: ${dataPath}`))
        }
      }

      return Promise.reject(new Error(`Not found: ${urlPath}`))
    }) as jest.Mock

    // Initialize RaceService for tests
    await RaceService.initialize()
  })

  describe('rollStats', () => {
    it('rolls 3d6 for each attribute', () => {
      const stats = CharacterCreationService.rollStats()

      // Each stat should be between 3-18 (3d6 range)
      expect(stats.strength).toBeGreaterThanOrEqual(3)
      expect(stats.strength).toBeLessThanOrEqual(18)
      expect(stats.intelligence).toBeGreaterThanOrEqual(3)
      expect(stats.intelligence).toBeLessThanOrEqual(18)
      expect(stats.piety).toBeGreaterThanOrEqual(3)
      expect(stats.piety).toBeLessThanOrEqual(18)
      expect(stats.vitality).toBeGreaterThanOrEqual(3)
      expect(stats.vitality).toBeLessThanOrEqual(18)
      expect(stats.agility).toBeGreaterThanOrEqual(3)
      expect(stats.agility).toBeLessThanOrEqual(18)
      expect(stats.luck).toBeGreaterThanOrEqual(3)
      expect(stats.luck).toBeLessThanOrEqual(18)
    })

    it('generates random bonus points (7-29)', () => {
      const stats = CharacterCreationService.rollStats()

      expect(stats.bonusPoints).toBeGreaterThanOrEqual(7)
      expect(stats.bonusPoints).toBeLessThanOrEqual(29)
    })

    describe('rollBonusPointsOnly', () => {
      it('returns 0 for all stats', () => {
        const result = CharacterCreationService.rollBonusPointsOnly()

        expect(result.strength).toBe(0)
        expect(result.intelligence).toBe(0)
        expect(result.piety).toBe(0)
        expect(result.vitality).toBe(0)
        expect(result.agility).toBe(0)
        expect(result.luck).toBe(0)
      })

      it('rolls bonus points between 7-29', () => {
        const result = CharacterCreationService.rollBonusPointsOnly()

        expect(result.bonusPoints).toBeGreaterThanOrEqual(7)
        expect(result.bonusPoints).toBeLessThanOrEqual(29)
      })

      it('returns immutable RolledStats object', () => {
        const result = CharacterCreationService.rollBonusPointsOnly()

        expect(result).toHaveProperty('strength')
        expect(result).toHaveProperty('bonusPoints')
      })
    })
  })

  describe('applyRaceModifiers', () => {
    it('formula is raceBase + allocatedBonus (not raceBase + rolled)', () => {
      // Document the NEW formula used by bonus point allocation system
      // The stats parameter contains ALLOCATED bonus points (0-29 range)
      // NOT rolled 3d6 values (3-18 range)
      const allocatedBonuses = {
        strength: 5,      // Player allocated 5 bonus points to STR
        intelligence: 10, // Player allocated 10 bonus points to INT
        piety: 3,         // Player allocated 3 bonus points to PIE
        vitality: 7,      // Player allocated 7 bonus points to VIT
        agility: 4,       // Player allocated 4 bonus points to AGI
        luck: 0           // Player allocated 0 bonus points to LUCK
      }

      const result = CharacterCreationService.applyRaceModifiers(allocatedBonuses, Race.HUMAN)

      // Human base stats: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUCK 9
      // Formula: finalStat = raceBase + allocatedBonus
      expect(result.strength).toBe(13)     // 8 + 5
      expect(result.intelligence).toBe(18) // 8 + 10
      expect(result.piety).toBe(8)         // 5 + 3
      expect(result.vitality).toBe(15)     // 8 + 7
      expect(result.agility).toBe(12)      // 8 + 4
      expect(result.luck).toBe(9)          // 9 + 0
    })

    it('applies human modifiers using RaceService (8 base stats)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.HUMAN)

      // Human base stats: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUCK 9
      expect(result.strength).toBe(18)      // 8 + 10
      expect(result.intelligence).toBe(18)  // 8 + 10
      expect(result.piety).toBe(15)         // 5 + 10
      expect(result.vitality).toBe(18)      // 8 + 10
      expect(result.agility).toBe(18)       // 8 + 10
      expect(result.luck).toBe(19)          // 9 + 10
    })

    it('applies elf modifiers using RaceService (7/10/10/6/9/6)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.ELF)

      // Elf: STR 7, INT 10, PIE 10, VIT 6, AGI 9, LUCK 6
      expect(result.strength).toBe(17)     // 7 + 10
      expect(result.intelligence).toBe(20) // 10 + 10
      expect(result.piety).toBe(20)        // 10 + 10
      expect(result.vitality).toBe(16)     // 6 + 10
      expect(result.agility).toBe(19)      // 9 + 10
      expect(result.luck).toBe(16)         // 6 + 10
    })

    it('applies dwarf modifiers using RaceService (10/7/10/10/5/6)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.DWARF)

      // Dwarf: STR 10, INT 7, PIE 10, VIT 10, AGI 5, LUCK 6
      expect(result.strength).toBe(20)     // 10 + 10
      expect(result.intelligence).toBe(17) // 7 + 10
      expect(result.piety).toBe(20)        // 10 + 10
      expect(result.vitality).toBe(20)     // 10 + 10
      expect(result.agility).toBe(15)      // 5 + 10
      expect(result.luck).toBe(16)         // 6 + 10
    })
  })

  describe('allocateBonusPoints', () => {
    it('adds bonus points to specified stat', () => {
      const stats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 5
      }

      const result = CharacterCreationService.allocateBonusPoints(stats, 'strength', 3)

      expect(result.strength).toBe(13)
      expect(result.bonusPoints).toBe(2)
    })

    it('throws error when not enough bonus points', () => {
      const stats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 2
      }

      expect(() => {
        CharacterCreationService.allocateBonusPoints(stats, 'strength', 5)
      }).toThrow('Not enough bonus points')
    })
  })

  describe('resetAllocations', () => {
    it('returns all allocated points to pool', () => {
      const stats = {
        strength: 5,
        intelligence: 3,
        piety: 2,
        vitality: 4,
        agility: 1,
        luck: 0,
        bonusPoints: 7
      }

      const result = CharacterCreationService.resetAllocations(stats)

      // 5 + 3 + 2 + 4 + 1 + 0 = 15 allocated
      // 7 remaining + 15 allocated = 22 total
      expect(result.bonusPoints).toBe(22)
    })

    it('zeros all stat allocations', () => {
      const stats = {
        strength: 5,
        intelligence: 3,
        piety: 2,
        vitality: 4,
        agility: 1,
        luck: 0,
        bonusPoints: 7
      }

      const result = CharacterCreationService.resetAllocations(stats)

      expect(result.strength).toBe(0)
      expect(result.intelligence).toBe(0)
      expect(result.piety).toBe(0)
      expect(result.vitality).toBe(0)
      expect(result.agility).toBe(0)
      expect(result.luck).toBe(0)
    })

    it('returns new immutable RolledStats object', () => {
      const stats = {
        strength: 5,
        intelligence: 3,
        piety: 2,
        vitality: 4,
        agility: 1,
        luck: 0,
        bonusPoints: 7
      }

      const result = CharacterCreationService.resetAllocations(stats)

      expect(result).not.toBe(stats)
      expect(result).toHaveProperty('strength')
      expect(result).toHaveProperty('bonusPoints')
    })
  })
})
