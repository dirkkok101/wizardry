// src/services/__tests__/MonsterService.spec.ts
import { MonsterService } from '../MonsterService'

describe('MonsterService', () => {
  describe('loadMonster', () => {
    it('loads kobold template from JSON', () => {
      const kobold = MonsterService.loadMonster('kobold')

      expect(kobold.id).toBe('kobold')
      expect(kobold.name).toBe('Kobold')
      expect(kobold.ac).toBe(8)
      expect(kobold.hp).toEqual({ min: 3, max: 7 })
      expect(kobold.damage).toHaveLength(1)
      expect(kobold.damage[0].dice).toBe('1d4')
    })

    it('throws error for non-existent monster', () => {
      expect(() => MonsterService.loadMonster('nonexistent')).toThrow('Monster not found: nonexistent')
    })
  })

  describe('createMonsterInstance', () => {
    it('creates instance with rolled HP', () => {
      const instance = MonsterService.createMonsterInstance('kobold')

      expect(instance.id).toBeDefined()
      expect(instance.id).not.toBe('kobold')  // Unique ID
      expect(instance.monsterId).toBe('kobold')
      expect(instance.name).toBe('Kobold')
      expect(instance.hp).toBeGreaterThanOrEqual(3)
      expect(instance.hp).toBeLessThanOrEqual(7)
      expect(instance.maxHp).toBe(instance.hp)
      expect(instance.status).toBe('ALIVE')
    })

    it('rolls different HP each time', () => {
      const instances = Array.from({ length: 100 }, () =>
        MonsterService.createMonsterInstance('kobold')
      )

      // Verify all HP in range
      instances.forEach(m => {
        expect(m.hp).toBeGreaterThanOrEqual(3)
        expect(m.hp).toBeLessThanOrEqual(7)
      })

      // Verify variance (not all same HP)
      const uniqueHP = new Set(instances.map(m => m.hp))
      expect(uniqueHP.size).toBeGreaterThan(1)
    })
  })

  describe('generateMonsterGroup', () => {
    it('generates group with correct size range', () => {
      // Kobold: 3-5 monsters
      const group = MonsterService.generateMonsterGroup('kobold')

      expect(group.length).toBeGreaterThanOrEqual(3)
      expect(group.length).toBeLessThanOrEqual(5)
      expect(group.every(m => m.monsterId === 'kobold')).toBe(true)
      expect(group.every(m => m.status === 'ALIVE')).toBe(true)
    })

    it('generates unique instances', () => {
      const group = MonsterService.generateMonsterGroup('kobold')

      // All IDs should be unique
      const ids = group.map(m => m.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(group.length)
    })

    it('rolls different HP for each monster', () => {
      const runs = Array.from({ length: 20 }, () =>
        MonsterService.generateMonsterGroup('kobold')
      )

      // At least one group should have variance
      const hasVariance = runs.some(group => {
        const hps = group.map(m => m.hp)
        const unique = new Set(hps)
        return unique.size > 1
      })

      expect(hasVariance).toBe(true)
    })
  })
})
