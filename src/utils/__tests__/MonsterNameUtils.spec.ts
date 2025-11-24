// src/utils/__tests__/MonsterNameUtils.spec.ts
import { getPluralMonsterName, getGroupDisplayText } from '../MonsterNameUtils'

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
})
