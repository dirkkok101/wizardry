import { ResurrectionService } from '../ResurrectionService';
import { ServiceType } from '@models/ServiceType';
import { Character } from '@models/Character';
import { CharacterClass } from '@models/CharacterClass';
import { CharacterStatus } from '@models/CharacterStatus';
import { Race } from '@models/Race';
import { Alignment } from '@models/Alignment';

describe('ResurrectionService', () => {
  const createChar = (vitality: number): Character => ({
    id: 'char-1',
    name: 'Test',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    level: 5,
    maxLev: 5,
    hp: 0,
    maxHp: 30,
    status: CharacterStatus.DEAD,
    strength: 15,
    intelligence: 10,
    piety: 10,
    vitality,
    agility: 12,
    luck: 10,
    experience: 5000,
    age: 18 * 52,
    ac: 5,
    vim: { current: vitality, max: vitality },
    knownSpells: [],
    inventory: [],
    gold: 100,
    deathCount: 1,
    monsterKills: 0,
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now(),
  });

  describe('getSuccessRate', () => {
    describe('cure services', () => {
      it('returns 100% for cure poison (always succeeds)', () => {
        const char = createChar(10);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.CURE_POISON);
        expect(rate).toBe(100);
      });

      it('returns 100% for cure paralysis (always succeeds)', () => {
        const char = createChar(10);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.CURE_PARALYSIS);
        expect(rate).toBe(100);
      });
    });

    describe('resurrection (DEAD → OK)', () => {
      it('calculates success rate: (vitality × 4%) - authentic Wizardry 1', () => {
        const char = createChar(10);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT);
        expect(rate).toBe(40); // 10 × 4 = 40%
      });

      it('handles low vitality characters', () => {
        const char = createChar(3);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT);
        expect(rate).toBe(12); // 3 × 4 = 12%
      });

      it('handles high vitality characters', () => {
        const char = createChar(18);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT);
        expect(rate).toBe(72); // 18 × 4 = 72%
      });
    });

    describe('restoration (ASHES → OK)', () => {
      it('calculates success rate: (vitality × 4%) - same as resurrect per docs', () => {
        const char = createChar(10);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESTORE);
        expect(rate).toBe(40); // 10 × 4 = 40%
      });

      it('has same success rate as resurrection (both use vitality × 4)', () => {
        const char = createChar(15);
        const resurrectRate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT);
        const restoreRate = ResurrectionService.getSuccessRate(char, ServiceType.RESTORE);
        expect(restoreRate).toBe(resurrectRate);
      });
    });
  });

  describe('attemptService', () => {
    it('returns success/failure based on success rate', () => {
      const char = createChar(10);

      const results = Array.from({ length: 100 }, () =>
        ResurrectionService.attemptService(char, ServiceType.RESURRECT),
      );

      const successCount = results.filter(Boolean).length;

      expect(successCount).toBeGreaterThan(20);
      expect(successCount).toBeLessThan(60);
    });

    it('always succeeds for cure services', () => {
      const char = createChar(10);

      // Run 10 times, all should succeed
      for (let i = 0; i < 10; i++) {
        expect(ResurrectionService.attemptService(char, ServiceType.CURE_POISON)).toBe(true);
      }
    });
  });
});
