// src/utils/__tests__/MonsterNameUtils.spec.ts
import {
  getPluralMonsterName,
  getGroupDisplayText,
  getMonsterDisplayName,
  getIdentifiedGroupDisplayText
} from '../MonsterNameUtils'
import { createTestMonster } from '@testing/test-factories'

describe('MonsterNameUtils', () => {
  describe('getPluralMonsterName', () => {
    it('adds S to regular names', () => {
      expect(getPluralMonsterName('Orc')).toBe('ORCS')
      expect(getPluralMonsterName('Kobold')).toBe('KOBOLDS')
      expect(getPluralMonsterName('Dragon')).toBe('DRAGONS')
    })

    it('handles names ending in Y (consonant before Y)', () => {
      expect(getPluralMonsterName('Zombie')).toBe('ZOMBIES')
      expect(getPluralMonsterName('Creeping Crudy')).toBe('CREEPING CRUDIES')
    })

    it('handles names ending in Y (vowel before Y)', () => {
      expect(getPluralMonsterName('Gas Delay')).toBe('GAS DELAYS')
    })

    it('handles names ending in S, X, Z', () => {
      expect(getPluralMonsterName('Gas')).toBe('GASES')
      expect(getPluralMonsterName('Sphinx')).toBe('SPHINXES')
    })

    it('handles names ending in CH, SH', () => {
      expect(getPluralMonsterName('Lich')).toBe('LICHES')
      expect(getPluralMonsterName('Bush')).toBe('BUSHES')
    })

    it('handles irregular plurals', () => {
      expect(getPluralMonsterName('Werewolf')).toBe('WEREWOLVES')
      expect(getPluralMonsterName('Wolf')).toBe('WOLVES')
      expect(getPluralMonsterName('Elf')).toBe('ELVES')
      expect(getPluralMonsterName('Dwarf')).toBe('DWARVES')
    })

    it('converts to uppercase', () => {
      expect(getPluralMonsterName('orc')).toBe('ORCS')
      expect(getPluralMonsterName('ORC')).toBe('ORCS')
      expect(getPluralMonsterName('OrC')).toBe('ORCS')
    })

    it('handles multi-word names', () => {
      expect(getPluralMonsterName('Gas Dragon')).toBe('GAS DRAGONS')
      expect(getPluralMonsterName('Greater Demon')).toBe('GREATER DEMONS')
    })
  })

  describe('getGroupDisplayText', () => {
    it('formats single monster correctly', () => {
      expect(getGroupDisplayText(1, 'Orc')).toBe('1 ORC')
      expect(getGroupDisplayText(1, 'Zombie')).toBe('1 ZOMBIE')
    })

    it('formats multiple monsters with plural names', () => {
      expect(getGroupDisplayText(3, 'Orc')).toBe('3 ORCS')
      expect(getGroupDisplayText(5, 'Zombie')).toBe('5 ZOMBIES')
      expect(getGroupDisplayText(7, 'Gas Dragon')).toBe('7 GAS DRAGONS')
    })

    it('handles zero monsters', () => {
      expect(getGroupDisplayText(0, 'Orc')).toBe('0 ORCS')
    })

    it('handles large numbers', () => {
      expect(getGroupDisplayText(99, 'Kobold')).toBe('99 KOBOLDS')
    })
  })

  describe('getMonsterDisplayName', () => {
    it('returns real name when identified', () => {
      const monster = createTestMonster({
        name: 'Kobold',
        unidentifiedName: 'Small Humanoid'
      })

      expect(getMonsterDisplayName(monster, true)).toBe('Kobold')
    })

    it('returns unidentified name when not identified', () => {
      const monster = createTestMonster({
        name: 'Kobold',
        unidentifiedName: 'Small Humanoid'
      })

      expect(getMonsterDisplayName(monster, false)).toBe('Small Humanoid')
    })
  })

  describe('getIdentifiedGroupDisplayText', () => {
    it('uses real name when identified and pluralizes correctly', () => {
      const monster = createTestMonster({
        name: 'Kobold',
        unidentifiedName: 'Small Humanoid'
      })

      expect(getIdentifiedGroupDisplayText(1, monster, true)).toBe('1 KOBOLD')
      expect(getIdentifiedGroupDisplayText(3, monster, true)).toBe('3 KOBOLDS')
    })

    it('uses unidentified name when not identified and pluralizes correctly', () => {
      const monster = createTestMonster({
        name: 'Kobold',
        unidentifiedName: 'Small Humanoid'
      })

      expect(getIdentifiedGroupDisplayText(1, monster, false)).toBe('1 SMALL HUMANOID')
      expect(getIdentifiedGroupDisplayText(3, monster, false)).toBe('3 SMALL HUMANOIDS')
    })

    it('handles various unidentified name formats', () => {
      // Test different unidentified name patterns
      const undead = createTestMonster({
        name: 'Vampire',
        unidentifiedName: 'Undead'
      })
      expect(getIdentifiedGroupDisplayText(2, undead, false)).toBe('2 UNDEADS')

      const dragon = createTestMonster({
        name: 'Fire Dragon',
        unidentifiedName: 'Large Dragon'
      })
      expect(getIdentifiedGroupDisplayText(1, dragon, false)).toBe('1 LARGE DRAGON')
      expect(getIdentifiedGroupDisplayText(2, dragon, false)).toBe('2 LARGE DRAGONS')
    })
  })
})
