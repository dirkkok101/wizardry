// src/services/__tests__/MonsterService.spec.ts
import { MonsterService } from '../MonsterService'
import { validateMonster } from '../../validation/MonsterSchema'

describe('MonsterService', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure isolation
    MonsterService.clearCache()
  })

  describe('loadMonster', () => {
    it('loads and validates a basic monster (Bubbly Slime)', async () => {
      const monster = await MonsterService.loadMonster('bubbly_slime')

      expect(monster.id).toBe('bubbly_slime')
      expect(monster.name).toBe('Bubbly Slime')
      expect(monster.level).toBe(1)
      expect(monster.hp.min).toBe(2)
      expect(monster.hp.max).toBe(4)
      expect(monster.ac).toBe(12)
      expect(monster.xp).toBe(55)
      expect(monster.type).toBe('normal')
      expect(monster.isBoss).toBe(false)
    })

    it('loads and validates a boss monster (Murphy\'s Ghost)', async () => {
      const monster = await MonsterService.loadMonster('murphy_ghost')

      expect(monster.id).toBe('murphy_ghost')
      expect(monster.name).toBe('Murphy\'s Ghost')
      expect(monster.isBoss).toBe(true)
      expect(monster.type).toBe('undead')
      expect(monster.regeneration).toBe(1)
      expect(monster.specialAbilities).toContain('regeneration')
      expect(monster.fixedEncounter).toBe(true)
      expect(monster.location).toEqual({ level: 1, x: 13, y: 5 })
    })

    it('loads and validates a spellcaster (Lvl 1 Mage)', async () => {
      const monster = await MonsterService.loadMonster('lvl_1_mage')

      expect(monster.id).toBe('lvl_1_mage')
      expect(monster.class).toBe('mage')
      expect(monster.specialAbilities).toContain('spellcasting')
      expect(monster.spellLevels).toEqual({ mage: 1 })
      expect(monster.spells).toBeDefined()
      expect(monster.spells!.length).toBeGreaterThan(0)
    })

    it('loads and validates final boss (Werdna)', async () => {
      const monster = await MonsterService.loadMonster('werdna')

      expect(monster.id).toBe('werdna')
      expect(monster.name).toBe('W*E*R*D*N*A')
      expect(monster.isBoss).toBe(true)
      expect(monster.isUnique).toBe(true)
      expect(monster.isFinalBoss).toBe(true)
      expect(monster.hp.min).toBe(210)
      expect(monster.hp.max).toBe(300)
      expect(monster.ac).toBe(-7)
      expect(monster.regeneration).toBe(5)
      expect(monster.resistances).toContainEqual({ type: 'magic', value: 70 })
      expect(monster.specialAbilities).toContain('magic_resistance')
      expect(monster.dropItems).toContain('werdna_amulet')
    })

    it('loads and validates monster with breath weapon (Frost Giant)', async () => {
      const monster = await MonsterService.loadMonster('frost_giant')

      expect(monster.id).toBe('frost_giant')
      expect(monster.level).toBe(9)
      expect(monster.hp.min).toBe(51)
      expect(monster.hp.max).toBe(58)
      expect(monster.resistances).toContainEqual({ type: 'magic', value: 95 })
      expect(monster.resistances).toContainEqual({ type: 'cold', value: 100 })
    })

    it('loads and validates monster with poison breath (Poison Giant)', async () => {
      const monster = await MonsterService.loadMonster('poison_giant')

      expect(monster.id).toBe('poison_giant')
      expect(monster.specialAbilities).toContain('breath_weapon')
      expect(monster.breathWeapon).toBeDefined()
      expect(monster.breathWeapon!.type).toBe('poison')
      expect(monster.breathWeapon!.target).toBe('party')
    })

    it('caches loaded monsters', async () => {
      const monster1 = await MonsterService.loadMonster('kobold')
      const monster2 = await MonsterService.loadMonster('kobold')

      // Should return the same cached instance
      expect(monster1).toBe(monster2)
    })

    it('throws error for non-existent monster', async () => {
      await expect(MonsterService.loadMonster('fake_monster')).rejects.toThrow()
    })
  })

  describe('createMonsterInstance', () => {
    it('creates monster instance with randomized HP', async () => {
      const instance = await MonsterService.createMonsterInstance('kobold')

      expect(instance.id).toBeDefined()
      expect(instance.monsterId).toBe('kobold')
      expect(instance.name).toBe('Kobold')
      expect(instance.hp).toBeGreaterThanOrEqual(3)
      expect(instance.hp).toBeLessThanOrEqual(7)
      expect(instance.maxHp).toBe(instance.hp)
      expect(instance.ac).toBe(8)
      expect(instance.status).toBe('ALIVE')
      expect(instance.level).toBe(1)
      expect(instance.undead).toBe(false)
    })

    it('creates undead monster with undead flag', async () => {
      const instance = await MonsterService.createMonsterInstance('murphy_ghost')

      expect(instance.undead).toBe(true)
      expect(instance.monsterId).toBe('murphy_ghost')
    })

    it('creates unique monster instances with different IDs', async () => {
      const instance1 = await MonsterService.createMonsterInstance('kobold')
      const instance2 = await MonsterService.createMonsterInstance('kobold')

      expect(instance1.id).not.toBe(instance2.id)
    })

    it('creates boss monster correctly', async () => {
      const instance = await MonsterService.createMonsterInstance('werdna')

      expect(instance.monsterId).toBe('werdna')
      expect(instance.name).toBe('W*E*R*D*N*A')
      expect(instance.hp).toBeGreaterThanOrEqual(210)
      expect(instance.hp).toBeLessThanOrEqual(300)
      expect(instance.ac).toBe(-7)
    })
  })

  describe('generateMonsterGroupAsync', () => {
    it('generates group with randomized count', async () => {
      const group = await MonsterService.generateMonsterGroupAsync('kobold')

      // Kobold numberAppearing is 3-5
      expect(group.length).toBeGreaterThanOrEqual(3)
      expect(group.length).toBeLessThanOrEqual(5)
      expect(group.every(m => m.monsterId === 'kobold')).toBe(true)
    })

    it('generates unique instances in group', async () => {
      const group = await MonsterService.generateMonsterGroupAsync('kobold')

      const ids = group.map(m => m.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('generates single monster for unique encounters', async () => {
      const group = await MonsterService.generateMonsterGroupAsync('werdna')

      expect(group.length).toBe(1)
      expect(group[0].monsterId).toBe('werdna')
    })
  })

  describe('generateMonsterGroup (synchronous)', () => {
    it('generates group from preloaded monster', async () => {
      await MonsterService.preloadMonsters(['kobold'])
      const group = MonsterService.generateMonsterGroup('kobold')

      // Kobold numberAppearing is 3-5
      expect(group.length).toBeGreaterThanOrEqual(3)
      expect(group.length).toBeLessThanOrEqual(5)
      expect(group.every(m => m.monsterId === 'kobold')).toBe(true)
    })

    it('throws error if monster not preloaded', () => {
      expect(() => MonsterService.generateMonsterGroup('fake_monster')).toThrow()
    })
  })

  describe('preloadMonsters', () => {
    it('preloads specific monsters', async () => {
      await MonsterService.preloadMonsters(['kobold', 'orc', 'zombie'])

      const cachedIds = MonsterService.getCachedMonsterIds()
      expect(cachedIds).toContain('kobold')
      expect(cachedIds).toContain('orc')
      expect(cachedIds).toContain('zombie')
    })

    it('allows synchronous access to preloaded monsters', async () => {
      await MonsterService.preloadMonsters(['kobold'])

      const monster = MonsterService.getCachedMonster('kobold')
      expect(monster.id).toBe('kobold')
    })

    it('throws error when accessing non-preloaded monster', () => {
      expect(() => MonsterService.getCachedMonster('werdna')).toThrow()
    })
  })

  describe('cache management', () => {
    it('clears cache', async () => {
      await MonsterService.loadMonster('kobold')
      expect(MonsterService.getCachedMonsterIds().length).toBe(1)

      MonsterService.clearCache()
      expect(MonsterService.getCachedMonsterIds().length).toBe(0)
    })

    it('returns cached monster IDs', async () => {
      await MonsterService.loadMonster('kobold')
      await MonsterService.loadMonster('orc')

      const ids = MonsterService.getCachedMonsterIds()
      expect(ids).toContain('kobold')
      expect(ids).toContain('orc')
    })
  })

  describe('data validation against research', () => {
    it('validates Level 1 monsters match research data', async () => {
      // Murphy's Ghost - Level 1 boss
      const murphyGhost = await MonsterService.loadMonster('murphy_ghost')
      expect(murphyGhost.hp).toEqual({ min: 20, max: 110 })
      expect(murphyGhost.ac).toBe(-3)
      expect(murphyGhost.xp).toBe(4450)
      expect(murphyGhost.regeneration).toBe(1)

      // Kobold
      const kobold = await MonsterService.loadMonster('kobold')
      expect(kobold.numberAppearing).toEqual({ min: 3, max: 5 })
      expect(kobold.hp).toEqual({ min: 3, max: 7 })
      expect(kobold.ac).toBe(8)
      expect(kobold.xp).toBe(415)
      expect(kobold.resistances).toContainEqual({ type: 'cold', value: 100 })
    })

    it('validates Level 9-10 boss monsters match research data', async () => {
      // Frost Giant
      const frostGiant = await MonsterService.loadMonster('frost_giant')
      expect(frostGiant.hp).toEqual({ min: 51, max: 58 })
      expect(frostGiant.ac).toBe(6)
      expect(frostGiant.xp).toBe(41355)
      expect(frostGiant.resistances).toContainEqual({ type: 'magic', value: 95 })

      // Poison Giant
      const poisonGiant = await MonsterService.loadMonster('poison_giant')
      expect(poisonGiant.hp).toEqual({ min: 81, max: 81 })
      expect(poisonGiant.ac).toBe(3)
      expect(poisonGiant.xp).toBe(41320)

      // Greater Demon
      const greaterDemon = await MonsterService.loadMonster('greater_demon')
      expect(greaterDemon.hp).toEqual({ min: 11, max: 88 })
      expect(greaterDemon.ac).toBe(-3)
      expect(greaterDemon.xp).toBe(44570)
      expect(greaterDemon.damage.length).toBe(5) // 5 attacks
    })

    it('validates all special abilities are properly defined', async () => {
      // Vorpal Bunny - decapitate
      const vorpalBunny = await MonsterService.loadMonster('vorpal_bunny')
      expect(vorpalBunny.specialAbilities).toContain('decapitate')

      // Vampire Lord - level drain
      const vampireLord = await MonsterService.loadMonster('vampire_lord')
      expect(vampireLord.specialAbilities).toContain('level_drain')
      expect(vampireLord.levelDrain).toBe(4)

      // Dragon Zombie - breath weapon + spellcasting
      const dragonZombie = await MonsterService.loadMonster('dragon_zombie')
      expect(dragonZombie.specialAbilities).toContain('breath_weapon')
      expect(dragonZombie.specialAbilities).toContain('spellcasting')
      expect(dragonZombie.breathWeapon).toBeDefined()
    })
  })
})
