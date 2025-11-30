// src/app/config/__tests__/MonsterSpellTables.spec.ts
import {
  selectMonsterMageSpell,
  selectMonsterPriestSpell,
  rollSpellLevelDegradation,
  MONSTER_MAGE_SPELL_TABLE,
  MONSTER_PRIEST_SPELL_TABLE
} from '../MonsterSpellTables'

describe('MonsterSpellTables', () => {
  describe('selectMonsterMageSpell', () => {
    it('selects spell A (katino) for level 1 with roll < 0.66', () => {
      expect(selectMonsterMageSpell(1, 0.5)).toBe('katino')
    })

    it('selects spell B (halito) for level 1 with roll >= 0.66', () => {
      expect(selectMonsterMageSpell(1, 0.7)).toBe('halito')
    })

    it('selects tiltowait for level 7 regardless of roll', () => {
      expect(selectMonsterMageSpell(7, 0.1)).toBe('tiltowait')
      expect(selectMonsterMageSpell(7, 0.9)).toBe('tiltowait')
    })

    it('clamps level to 1-7 range', () => {
      expect(selectMonsterMageSpell(0, 0.5)).toBe('katino') // clamped to 1
      expect(selectMonsterMageSpell(10, 0.5)).toBe('tiltowait') // clamped to 7
    })

    it('uses correct spells for each level', () => {
      // Level 2: dilto / halito
      expect(selectMonsterMageSpell(2, 0.5)).toBe('dilto')
      expect(selectMonsterMageSpell(2, 0.7)).toBe('halito')

      // Level 3: molito / mahalito
      expect(selectMonsterMageSpell(3, 0.5)).toBe('molito')
      expect(selectMonsterMageSpell(3, 0.7)).toBe('mahalito')

      // Level 4: dalto / lahalito
      expect(selectMonsterMageSpell(4, 0.5)).toBe('dalto')
      expect(selectMonsterMageSpell(4, 0.7)).toBe('lahalito')

      // Level 5: lahalito / madalto
      expect(selectMonsterMageSpell(5, 0.5)).toBe('lahalito')
      expect(selectMonsterMageSpell(5, 0.7)).toBe('madalto')

      // Level 6: madalto / zilwan
      expect(selectMonsterMageSpell(6, 0.5)).toBe('madalto')
      expect(selectMonsterMageSpell(6, 0.7)).toBe('zilwan')
    })
  })

  describe('selectMonsterPriestSpell', () => {
    it('selects badios for level 1', () => {
      expect(selectMonsterPriestSpell(1, 0.5)).toBe('badios')
      expect(selectMonsterPriestSpell(1, 0.9)).toBe('badios') // both A and B are badios
    })

    it('selects montino for level 2', () => {
      expect(selectMonsterPriestSpell(2, 0.5)).toBe('montino')
      expect(selectMonsterPriestSpell(2, 0.9)).toBe('montino')
    })

    it('selects mabadi for level 7', () => {
      expect(selectMonsterPriestSpell(7, 0.5)).toBe('mabadi')
    })

    it('uses correct spells for level 3-6', () => {
      // Level 3: badios / badial
      expect(selectMonsterPriestSpell(3, 0.5)).toBe('badios')
      expect(selectMonsterPriestSpell(3, 0.7)).toBe('badial')

      // Level 4: badial / badial
      expect(selectMonsterPriestSpell(4, 0.5)).toBe('badial')

      // Level 5: badialma / badi
      expect(selectMonsterPriestSpell(5, 0.5)).toBe('badialma')
      expect(selectMonsterPriestSpell(5, 0.7)).toBe('badi')

      // Level 6: lorto / mabadi
      expect(selectMonsterPriestSpell(6, 0.5)).toBe('lorto')
      expect(selectMonsterPriestSpell(6, 0.7)).toBe('mabadi')
    })

    it('clamps level to 1-7 range', () => {
      expect(selectMonsterPriestSpell(0, 0.5)).toBe('badios') // clamped to 1
      expect(selectMonsterPriestSpell(10, 0.5)).toBe('mabadi') // clamped to 7
    })
  })

  describe('rollSpellLevelDegradation', () => {
    it('returns 0 for rolls in first 71%', () => {
      expect(rollSpellLevelDegradation(0.0)).toBe(0)
      expect(rollSpellLevelDegradation(0.7)).toBe(0)
    })

    it('returns 1 for rolls in ~71-91% range', () => {
      expect(rollSpellLevelDegradation(0.75)).toBe(1)
    })

    it('returns higher degradation for rare rolls', () => {
      expect(rollSpellLevelDegradation(0.99)).toBeGreaterThan(0)
    })
  })

  describe('spell table completeness', () => {
    it('mage table has all 7 levels', () => {
      for (let level = 1; level <= 7; level++) {
        expect(MONSTER_MAGE_SPELL_TABLE[level]).toBeDefined()
        expect(MONSTER_MAGE_SPELL_TABLE[level].spellA).toBeTruthy()
        expect(MONSTER_MAGE_SPELL_TABLE[level].spellB).toBeTruthy()
      }
    })

    it('priest table has all 7 levels', () => {
      for (let level = 1; level <= 7; level++) {
        expect(MONSTER_PRIEST_SPELL_TABLE[level]).toBeDefined()
        expect(MONSTER_PRIEST_SPELL_TABLE[level].spellA).toBeTruthy()
        expect(MONSTER_PRIEST_SPELL_TABLE[level].spellB).toBeTruthy()
      }
    })
  })
})
