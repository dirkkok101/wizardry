import { ClassService } from '../ClassService';
import { CharacterClass } from '@models/CharacterClass';
import { Alignment } from '@models/Alignment';
import { loadClassesForTests, clearGameDataCaches } from '@testing/test-data-loader';

describe('ClassService', () => {
  beforeAll(async () => {
    await loadClassesForTests();
  });

  afterAll(() => {
    clearGameDataCaches();
  });

  describe('getClassData', () => {
    it('returns class data for Fighter', () => {
      const data = ClassService.getClassData(CharacterClass.FIGHTER);

      expect(data.name).toBe('Fighter');
      expect(data.hitDice).toBe('1d10');
      expect(data.requirements.str).toBe(11);
    });

    it('returns class data for Bishop', () => {
      const data = ClassService.getClassData(CharacterClass.BISHOP);

      expect(data.name).toBe('Bishop');
      expect(data.requirements.int).toBe(12);
      expect(data.requirements.pie).toBe(12);
      expect(data.requirements.str).toBeUndefined();
    });
  });

  describe('getXpForLevel', () => {
    it('returns correct XP for Fighter level 2', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 2);
      expect(xp).toBe(1000);
    });

    it('returns correct XP for Fighter level 12', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 12);
      expect(xp).toBe(232044);
    });

    it('returns 0 for level 1', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 1);
      expect(xp).toBe(0);
    });
  });

  describe('getAttacksPerRound', () => {
    it('returns 1 attack for Fighter level 1', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 1);
      expect(attacks).toBe(1);
    });

    it('returns 2 attacks for Fighter level 5', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 5);
      expect(attacks).toBe(2);
    });

    it('returns 3 attacks for Fighter level 10', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 10);
      expect(attacks).toBe(3);
    });

    it('returns 2 attacks for Ninja level 1', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.NINJA, 1);
      expect(attacks).toBe(2);
    });

    it('returns 3 attacks for Ninja level 5', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.NINJA, 5);
      expect(attacks).toBe(3);
    });
  });

  describe('isAlignmentAllowed', () => {
    it('allows any alignment for Fighter', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.GOOD)).toBe(true);
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.NEUTRAL)).toBe(true);
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.EVIL)).toBe(true);
    });

    it('allows only Good/Evil for Bishop', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.GOOD)).toBe(true);
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.NEUTRAL)).toBe(false);
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.EVIL)).toBe(true);
    });

    it('allows only Evil for Ninja', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.GOOD)).toBe(false);
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.NEUTRAL)).toBe(false);
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.EVIL)).toBe(true);
    });
  });
});
