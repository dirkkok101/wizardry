// src/services/__tests__/MonsterDataLoader.spec.ts
import { MonsterDataLoader } from '../MonsterDataLoader'

describe('MonsterDataLoader', () => {
  beforeEach(() => {
    // Clear cache before each test
    MonsterDataLoader.clearCache()
  })

  describe('loadAllMonsters', () => {
    it('loads all monster JSON files from data/monsters directory', async () => {
      const monsters = await MonsterDataLoader.loadAllMonsters()

      expect(monsters.size).toBeGreaterThan(0)
      expect(MonsterDataLoader.isLoaded()).toBe(true)
      expect(MonsterDataLoader.isLoading()).toBe(false)
    })

    it('validates monsters with Zod schema', async () => {
      await MonsterDataLoader.loadAllMonsters()

      // Check that loaded monsters have required properties
      const kobold = MonsterDataLoader.getMonster('kobold')
      expect(kobold).toBeDefined()
      expect(kobold?.id).toBe('kobold')
      expect(kobold?.name).toBe('Kobold')
      expect(kobold?.hp).toBeDefined()
      expect(kobold?.ac).toBeDefined()
      expect(kobold?.xp).toBeDefined()
    })

    it('caches loaded monsters on subsequent calls', async () => {
      const monsters1 = await MonsterDataLoader.loadAllMonsters()
      const monsters2 = await MonsterDataLoader.loadAllMonsters()

      // Should return same cached instance
      expect(monsters1).toBe(monsters2)
    })

    it('handles multiple concurrent load calls', async () => {
      // Start multiple loads at the same time
      const [monsters1, monsters2, monsters3] = await Promise.all([
        MonsterDataLoader.loadAllMonsters(),
        MonsterDataLoader.loadAllMonsters(),
        MonsterDataLoader.loadAllMonsters()
      ])

      // All should return the same cached instance
      expect(monsters1).toBe(monsters2)
      expect(monsters2).toBe(monsters3)
    })

    it('loads expected number of monsters', async () => {
      await MonsterDataLoader.loadAllMonsters()

      const count = MonsterDataLoader.getLoadedCount()
      // Should load 96 monsters from Wizardry 1
      expect(count).toBeGreaterThanOrEqual(90) // Allow for some flexibility
      expect(count).toBeLessThanOrEqual(100)
    })

    it('gracefully handles validation failures', async () => {
      await MonsterDataLoader.loadAllMonsters()

      const failedMonsters = MonsterDataLoader.getFailedMonsters()
      // Some monsters might fail validation during development
      // but the loader should continue loading others
      expect(failedMonsters).toBeDefined()
    })
  })

  describe('getMonster', () => {
    beforeEach(async () => {
      await MonsterDataLoader.loadAllMonsters()
    })

    it('returns monster template by ID', () => {
      const kobold = MonsterDataLoader.getMonster('kobold')

      expect(kobold).toBeDefined()
      expect(kobold?.id).toBe('kobold')
      expect(kobold?.name).toBe('Kobold')
    })

    it('returns undefined for non-existent monster', () => {
      const result = MonsterDataLoader.getMonster('fake_monster')

      expect(result).toBeUndefined()
    })

    it('throws error if monsters not loaded first', () => {
      MonsterDataLoader.clearCache()

      expect(() => {
        MonsterDataLoader.getMonster('kobold')
      }).toThrow('Monsters not loaded')
    })
  })

  describe('getAllMonsters', () => {
    beforeEach(async () => {
      await MonsterDataLoader.loadAllMonsters()
    })

    it('returns all loaded monsters', () => {
      const monsters = MonsterDataLoader.getAllMonsters()

      expect(monsters).toBeInstanceOf(Map)
      expect(monsters.size).toBeGreaterThan(0)
    })

    it('throws error if monsters not loaded first', () => {
      MonsterDataLoader.clearCache()

      expect(() => {
        MonsterDataLoader.getAllMonsters()
      }).toThrow('Monsters not loaded')
    })
  })

  describe('state tracking', () => {
    it('tracks loading state', async () => {
      expect(MonsterDataLoader.isLoading()).toBe(false)
      expect(MonsterDataLoader.isLoaded()).toBe(false)

      const loadPromise = MonsterDataLoader.loadAllMonsters()

      // May or may not be loading depending on timing
      // Just verify it completes
      await loadPromise

      expect(MonsterDataLoader.isLoading()).toBe(false)
      expect(MonsterDataLoader.isLoaded()).toBe(true)
    })

    it('provides error state', async () => {
      await MonsterDataLoader.loadAllMonsters()

      const error = MonsterDataLoader.getError()
      expect(error).toBeNull()
    })
  })

  describe('statistics', () => {
    beforeEach(async () => {
      await MonsterDataLoader.loadAllMonsters()
    })

    it('provides loaded count', () => {
      const count = MonsterDataLoader.getLoadedCount()
      expect(count).toBeGreaterThan(0)
    })

    it('provides total count', () => {
      const total = MonsterDataLoader.getTotalCount()
      expect(total).toBeGreaterThanOrEqual(MonsterDataLoader.getLoadedCount())
    })

    it('provides failed monsters map', () => {
      const failed = MonsterDataLoader.getFailedMonsters()
      expect(failed).toBeDefined()
      expect(failed).toBeInstanceOf(Map)
    })

    it('provides loaded monster IDs', () => {
      const ids = MonsterDataLoader.getLoadedMonsterIds()
      expect(ids).toBeInstanceOf(Array)
      expect(ids.length).toBeGreaterThan(0)
      expect(ids).toContain('kobold')
    })
  })

  describe('hasMonster', () => {
    beforeEach(async () => {
      await MonsterDataLoader.loadAllMonsters()
    })

    it('returns true for loaded monster', () => {
      expect(MonsterDataLoader.hasMonster('kobold')).toBe(true)
    })

    it('returns false for non-existent monster', () => {
      expect(MonsterDataLoader.hasMonster('fake_monster')).toBe(false)
    })

    it('returns false before loading', () => {
      MonsterDataLoader.clearCache()
      expect(MonsterDataLoader.hasMonster('kobold')).toBe(false)
    })
  })

  describe('clearCache', () => {
    it('clears all cached data', async () => {
      await MonsterDataLoader.loadAllMonsters()
      expect(MonsterDataLoader.isLoaded()).toBe(true)

      MonsterDataLoader.clearCache()

      expect(MonsterDataLoader.isLoaded()).toBe(false)
      expect(MonsterDataLoader.getLoadedCount()).toBe(0)
      expect(MonsterDataLoader.getError()).toBeNull()
    })
  })

  describe('data validation', () => {
    beforeEach(async () => {
      await MonsterDataLoader.loadAllMonsters()
    })

    it('loads key monsters correctly', () => {
      // Level 1 basic monster
      const kobold = MonsterDataLoader.getMonster('kobold')
      expect(kobold?.level).toBe(1)
      expect(kobold?.type).toBe('humanoid')

      // Level 1 boss
      const murphy = MonsterDataLoader.getMonster('murphy_ghost')
      expect(murphy?.isBoss).toBe(true)
      expect(murphy?.type).toBe('undead')

      // Final boss
      const werdna = MonsterDataLoader.getMonster('werdna')
      expect(werdna?.isFinalBoss).toBe(true)
      expect(werdna?.isUnique).toBe(true)
    })

    it('loads monsters with special abilities', () => {
      // Spellcaster
      const mage = MonsterDataLoader.getMonster('lvl_1_mage')
      expect(mage?.specialAbilities).toContain('spellcasting')
      expect(mage?.spellLevels).toBeDefined()

      // Breath weapon
      const dragonZombie = MonsterDataLoader.getMonster('dragon_zombie')
      expect(dragonZombie?.specialAbilities).toContain('breath_weapon')
      expect(dragonZombie?.breathWeapon).toBeDefined()

      // Regeneration
      const troll = MonsterDataLoader.getMonster('troll')
      expect(troll?.specialAbilities).toContain('regeneration')
      expect(troll?.regeneration).toBeGreaterThan(0)
    })
  })
})
