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
})
