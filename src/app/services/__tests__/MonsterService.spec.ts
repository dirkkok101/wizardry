// src/services/__tests__/MonsterService.spec.ts
import { MonsterService } from '../MonsterService'
import { MonsterDataLoader } from '../MonsterDataLoader'
import { RandomService } from '../RandomService'
import { MonsterTemplate } from '@validation/MonsterSchema'

describe('MonsterService', () => {
  // Monsters are preloaded in setup-jest.ts via MonsterDataLoader.loadAllMonsters()
  // This follows the same pattern as SpellDataLoader

  describe('createMonsterInstance', () => {
    it('creates monster instance with randomized HP', () => {
      const instance = MonsterService.createMonsterInstance('kobold')

      expect(instance.id).toBeDefined()
      expect(instance.monsterId).toBe('kobold')
      expect(instance.name).toBe('Kobold')
      expect(instance.hp).toBeGreaterThanOrEqual(3)
      expect(instance.hp).toBeLessThanOrEqual(7)
      expect(instance.maxHp).toBe(instance.hp)
      expect(instance.ac).toBe(8)
      expect(instance.status).toBe('ALIVE')
      expect(instance.level).toBe(2) // Kobold is level 2 based on 2d3+1 HP dice
      expect(instance.undead).toBe(false)
    })

    it('creates undead monster with undead flag', () => {
      const instance = MonsterService.createMonsterInstance('murphy_ghost')

      expect(instance.undead).toBe(true)
      expect(instance.monsterId).toBe('murphy_ghost')
    })

    it('creates unique monster instances with different IDs', () => {
      const instance1 = MonsterService.createMonsterInstance('kobold')
      const instance2 = MonsterService.createMonsterInstance('kobold')

      expect(instance1.id).not.toBe(instance2.id)
    })

    it('creates boss monster correctly', () => {
      const instance = MonsterService.createMonsterInstance('werdna')

      expect(instance.monsterId).toBe('werdna')
      expect(instance.name).toBe('W E R D N A')
      expect(instance.hp).toBeGreaterThanOrEqual(30) // 10d10+20 = min 30
      expect(instance.hp).toBeLessThanOrEqual(120) // 10d10+20 = max 120
      expect(instance.ac).toBe(-7)
    })

    it('throws error for non-existent monster', () => {
      expect(() => {
        MonsterService.createMonsterInstance('fake_monster')
      }).toThrow('Monster not found')
    })
  })

  describe('generateMonsterGroup', () => {
    it('generates group with randomized count', () => {
      const group = MonsterService.generateMonsterGroup('kobold')

      // Kobold numberAppearing is 3-5
      expect(group.length).toBeGreaterThanOrEqual(3)
      expect(group.length).toBeLessThanOrEqual(5)
      expect(group.every(m => m.monsterId === 'kobold')).toBe(true)
    })

    it('generates unique instances in group', () => {
      const group = MonsterService.generateMonsterGroup('kobold')

      const ids = group.map(m => m.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('generates single monster for unique encounters', () => {
      const group = MonsterService.generateMonsterGroup('werdna')

      expect(group.length).toBe(1)
      expect(group[0].monsterId).toBe('werdna')
    })

    it('throws error for non-existent monster', () => {
      expect(() => {
        MonsterService.generateMonsterGroup('fake_monster')
      }).toThrow('Monster not found')
    })
  })

  describe('getMonsterTemplate', () => {
    it('returns monster template by ID', () => {
      const template = MonsterService.getMonsterTemplate('kobold')

      expect(template).toBeDefined()
      expect(template?.id).toBe('kobold')
      expect(template?.name).toBe('Kobold')
      expect(template?.hp).toBeDefined()
      expect(template?.ac).toBe(8)
    })

    it('returns undefined for non-existent monster', () => {
      const template = MonsterService.getMonsterTemplate('fake_monster')

      expect(template).toBeUndefined()
    })
  })

  describe('hasMonster', () => {
    it('returns true for loaded monster', () => {
      expect(MonsterService.hasMonster('kobold')).toBe(true)
    })

    it('returns false for non-existent monster', () => {
      expect(MonsterService.hasMonster('fake_monster')).toBe(false)
    })
  })

  describe('getLoadedMonsterIds', () => {
    it('returns array of loaded monster IDs', () => {
      const ids = MonsterService.getLoadedMonsterIds()

      expect(ids).toBeInstanceOf(Array)
      expect(ids.length).toBeGreaterThan(0)
      expect(ids).toContain('kobold')
      expect(ids).toContain('werdna')
    })
  })

  describe('createMonsterInstanceFromTemplate', () => {
    it('creates instance from template with randomized HP', () => {
      const template = MonsterDataLoader.getMonster('kobold')!
      const instance = MonsterService.createMonsterInstanceFromTemplate(template)

      expect(instance.monsterId).toBe('kobold')
      expect(instance.hp).toBeGreaterThanOrEqual(3)
      expect(instance.hp).toBeLessThanOrEqual(7)
      expect(instance.maxHp).toBe(instance.hp)
    })

    it('creates multiple instances with different HP', () => {
      const template = MonsterDataLoader.getMonster('kobold')!
      const instances = Array.from({ length: 20 }, () =>
        MonsterService.createMonsterInstanceFromTemplate(template)
      )

      // Should have some variety in HP rolls
      const uniqueHP = new Set(instances.map(i => i.hp))
      expect(uniqueHP.size).toBeGreaterThan(1)
    })
  })

  describe('data validation against research', () => {
    it('validates Level 1 monsters match research data', () => {
      // Murphy's Ghost - Level 1 boss
      const murphyTemplate = MonsterService.getMonsterTemplate('murphy_ghost')
      expect(murphyTemplate?.hp).toEqual({ min: 20, max: 110 })
      expect(murphyTemplate?.ac).toBe(-3)
      expect(murphyTemplate?.xp).toBe(4450)
      expect(murphyTemplate?.regeneration).toBe(1)

      // Kobold
      const koboldTemplate = MonsterService.getMonsterTemplate('kobold')
      expect(koboldTemplate?.numberAppearing).toEqual({ min: 3, max: 5 })
      expect(koboldTemplate?.hp).toEqual({ min: 3, max: 7 })
      expect(koboldTemplate?.ac).toBe(8)
      expect(koboldTemplate?.xp).toBe(415)
      expect(koboldTemplate?.resistances).toContainEqual({ type: 'cold', value: 100 })
    })

    it('validates Level 9-10 boss monsters match research data', () => {
      // Frost Giant - research values from Apple II source
      const frostGiant = MonsterService.getMonsterTemplate('frost_giant')
      expect(frostGiant?.hp).toEqual({ min: 51, max: 58 }) // 1d8+50
      expect(frostGiant?.ac).toBe(6)
      expect(frostGiant?.xp).toBe(40875) // Research-accurate XP
      expect(frostGiant?.resistances).toContainEqual({ type: 'cold', value: 100 })

      // Poison Giant - research values
      const poisonGiant = MonsterService.getMonsterTemplate('poison_giant')
      expect(poisonGiant?.hp).toEqual({ min: 81, max: 81 }) // 1d1+80
      expect(poisonGiant?.ac).toBe(3)
      expect(poisonGiant?.xp).toBe(40840) // Research-accurate XP

      // Greater Demon - research values
      const greaterDemon = MonsterService.getMonsterTemplate('greater_demon')
      expect(greaterDemon?.hp).toEqual({ min: 11, max: 88 }) // 11d8
      expect(greaterDemon?.ac).toBe(-3)
      expect(greaterDemon?.xp).toBe(44090) // Research-accurate XP
      expect(greaterDemon?.damage.length).toBe(5) // 5 attacks
    })

    it('validates all special abilities are properly defined', () => {
      // Vorpal Bunny - critical hit (research calls it "Critical")
      const vorpalBunny = MonsterService.getMonsterTemplate('vorpal_bunny')
      expect(vorpalBunny?.specialAbilities).toContain('critical_hit')

      // Vampire Lord - level drain
      const vampireLord = MonsterService.getMonsterTemplate('vampire_lord')
      expect(vampireLord?.specialAbilities).toContain('level_drain')
      expect(vampireLord?.levelDrain).toBe(4)

      // Dragon Zombie - breath weapon + spellcasting
      const dragonZombie = MonsterService.getMonsterTemplate('dragon_zombie')
      expect(dragonZombie?.specialAbilities).toContain('breath_weapon')
      expect(dragonZombie?.specialAbilities).toContain('spellcasting')
      expect(dragonZombie?.breathWeapon).toBeDefined()
    })
  })

  describe('generateEncounterWithPartners', () => {
    // Helper to create minimal template for testing
    const createTestTemplate = (overrides: Partial<MonsterTemplate>): MonsterTemplate => ({
      id: 'test_monster',
      numericId: 0,
      name: 'Test Monster',
      level: 1,
      numberAppearing: { min: 1, max: 1 },
      hp: { min: 1, max: 10 },
      ac: 10,
      damage: [],
      xp: 100,
      monsterClass: 'animal',
      specialAbilities: [],
      resistances: [],
      regeneration: 0,
      isBoss: false,
      canFlee: false,
      ...overrides
    } as MonsterTemplate)

    it('generates primary group when no partner', () => {
      // Dragon Fly has no partner in Apple II source
      const groups = MonsterService.generateEncounterWithPartners('dragon_fly')

      expect(groups.length).toBe(1)
      expect(groups[0].monsterId).toBe('dragon_fly')
      expect(groups[0].monsters.length).toBeGreaterThan(0)
    })

    it('generates partner groups when chance succeeds', () => {
      // Mock monster templates with partner chain for this test
      const originalGetMonster = MonsterDataLoader.getMonster
      jest.spyOn(MonsterDataLoader, 'getMonster').mockImplementation((id) => {
        if (id === 'test_orc') {
          return createTestTemplate({
            id: 'test_orc',
            name: 'Test Orc',
            numberAppearing: { min: 1, max: 1 },
            partner: { monsterId: 'test_kobold', chance: 100 }  // 100% for test
          })
        }
        if (id === 'test_kobold') {
          return createTestTemplate({
            id: 'test_kobold',
            name: 'Test Kobold',
            numberAppearing: { min: 1, max: 1 }
            // No partner - chain ends
          })
        }
        return originalGetMonster(id)
      })

      try {
        RandomService.queueNextValues([0.5])  // For partner chance check

        const groups = MonsterService.generateEncounterWithPartners('test_orc')

        expect(groups.length).toBe(2)
        expect(groups[0].monsterId).toBe('test_orc')
        expect(groups[1].monsterId).toBe('test_kobold')
      } finally {
        jest.restoreAllMocks()
      }
    })

    it('limits to maximum 4 groups', () => {
      // Set up infinite chain (test_ghost -> test_ghost)
      jest.spyOn(MonsterDataLoader, 'getMonster').mockReturnValue(
        createTestTemplate({
          id: 'test_ghost',
          name: 'Test Ghost',
          numberAppearing: { min: 1, max: 1 },
          partner: { monsterId: 'test_ghost', chance: 100 }
        })
      )

      try {
        // Queue enough random values for 10 attempts
        RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])

        const groups = MonsterService.generateEncounterWithPartners('test_ghost')

        expect(groups.length).toBeLessThanOrEqual(4)
      } finally {
        jest.restoreAllMocks()
      }
    })

    it('stops when partner chance fails', () => {
      jest.spyOn(MonsterDataLoader, 'getMonster').mockImplementation((id) => {
        if (id === 'test_orc') {
          return createTestTemplate({
            id: 'test_orc',
            name: 'Test Orc',
            numberAppearing: { min: 1, max: 1 },
            partner: { monsterId: 'test_kobold', chance: 10 }  // 10% chance
          })
        }
        return createTestTemplate({
          id: 'test_kobold',
          name: 'Test Kobold',
          numberAppearing: { min: 1, max: 1 }
        })
      })

      try {
        RandomService.queueNextValues([0.5])  // 50% > 10% = partner fails

        const groups = MonsterService.generateEncounterWithPartners('test_orc')

        expect(groups.length).toBe(1)
        expect(groups[0].monsterId).toBe('test_orc')
      } finally {
        jest.restoreAllMocks()
      }
    })
  })
})
