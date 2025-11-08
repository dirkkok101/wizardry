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
})
