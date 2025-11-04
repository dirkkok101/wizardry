import {
  formatHP,
  getStatusColorClass,
  getDefaultActionLabel,
  formatStatValue
} from '../CharacterDisplayHelpers';
import { CharacterStatus } from '../../types/CharacterStatus';
import { createTestCharacter } from '../../test-helpers/test-factories';
import { Race } from '../../types/Race';
import { CharacterClass } from '../../types/CharacterClass';
import { Alignment } from '../../types/Alignment';

describe('CharacterDisplayHelpers', () => {
  describe('formatHP', () => {
    it('formats HP as current/max', () => {
      expect(formatHP(12, 20)).toBe('12/20');
    });

    it('handles zero values', () => {
      expect(formatHP(0, 15)).toBe('0/15');
    });

    it('handles full HP', () => {
      expect(formatHP(25, 25)).toBe('25/25');
    });
  });

  describe('getStatusColorClass', () => {
    it('returns status-ok for OK status', () => {
      expect(getStatusColorClass(CharacterStatus.OK)).toBe('status-ok');
    });

    it('returns status-dead for DEAD status', () => {
      expect(getStatusColorClass(CharacterStatus.DEAD)).toBe('status-dead');
    });

    it('returns status-ashes for ASHES status', () => {
      expect(getStatusColorClass(CharacterStatus.ASHES)).toBe('status-ashes');
    });

    it('returns status-lost for LOST status', () => {
      expect(getStatusColorClass(CharacterStatus.LOST)).toBe('status-lost');
    });

    it('returns status-afflicted for PARALYZED status', () => {
      expect(getStatusColorClass(CharacterStatus.PARALYZED)).toBe('status-afflicted');
    });

    it('returns status-afflicted for POISONED status', () => {
      expect(getStatusColorClass(CharacterStatus.POISONED)).toBe('status-afflicted');
    });

    it('returns status-afflicted for ASLEEP status', () => {
      expect(getStatusColorClass(CharacterStatus.ASLEEP)).toBe('status-afflicted');
    });

    it('returns status-ashes for STONED status', () => {
      expect(getStatusColorClass(CharacterStatus.STONED)).toBe('status-ashes');
    });
  });

  describe('getDefaultActionLabel', () => {
    it('returns "Inspect" for inspect action', () => {
      expect(getDefaultActionLabel('inspect')).toBe('Inspect');
    });

    it('returns "Add" for add action', () => {
      expect(getDefaultActionLabel('add')).toBe('Add');
    });

    it('returns "Remove" for remove action', () => {
      expect(getDefaultActionLabel('remove')).toBe('Remove');
    });

    it('returns "Delete" for delete action', () => {
      expect(getDefaultActionLabel('delete')).toBe('Delete');
    });

    it('returns "↑" for moveUp action', () => {
      expect(getDefaultActionLabel('moveUp')).toBe('↑');
    });

    it('returns "↓" for moveDown action', () => {
      expect(getDefaultActionLabel('moveDown')).toBe('↓');
    });

    it('returns capitalized type for unknown action', () => {
      expect(getDefaultActionLabel('custom')).toBe('Custom');
    });
  });

  describe('formatStatValue', () => {
    const char = createTestCharacter({
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      level: 5,
      hp: 30,
      maxHp: 40,
      ac: 3,
      alignment: Alignment.GOOD
    });

    it('formats race field', () => {
      expect(formatStatValue('race', char)).toBe('HUMAN');
    });

    it('formats class field', () => {
      expect(formatStatValue('class', char)).toBe('FIGHTER');
    });

    it('formats level field', () => {
      expect(formatStatValue('level', char)).toBe('5');
    });

    it('formats hp field as current/max', () => {
      expect(formatStatValue('hp', char)).toBe('30/40');
    });

    it('formats ac field', () => {
      expect(formatStatValue('ac', char)).toBe('3');
    });

    it('formats alignment field', () => {
      expect(formatStatValue('alignment', char)).toBe('GOOD');
    });
  });
});
