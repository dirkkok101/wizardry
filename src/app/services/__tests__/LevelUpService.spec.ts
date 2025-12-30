import { LevelUpService } from '../LevelUpService';
import { RandomService } from '../RandomService';
import { createTestCharacter } from '@testing/test-factories';
import { CharacterClass } from '@models/CharacterClass';
import { loadCharacterCreationDataForTests } from '@testing/test-data-loader';

beforeAll(async () => {
  await loadCharacterCreationDataForTests();
});

describe('LevelUpService', () => {
  describe('getXPRequirement', () => {
    it('calculates XP requirement for Fighter level 2 (authentic table)', () => {
      const xp = LevelUpService.getXPRequirement(2, CharacterClass.FIGHTER);

      // Authentic Wizardry 1 XP table: Fighter level 2 = 1000
      expect(xp).toBe(1000);
    });

    it('calculates XP requirement for Mage level 2 (authentic table)', () => {
      const xp = LevelUpService.getXPRequirement(2, CharacterClass.MAGE);

      // Authentic Wizardry 1 XP table: Mage level 2 = 1100
      expect(xp).toBe(1100);
    });

    it('calculates increasing XP for higher levels', () => {
      const level2 = LevelUpService.getXPRequirement(2, CharacterClass.FIGHTER);
      const level3 = LevelUpService.getXPRequirement(3, CharacterClass.FIGHTER);
      const level4 = LevelUpService.getXPRequirement(4, CharacterClass.FIGHTER);

      expect(level3).toBeGreaterThan(level2);
      expect(level4).toBeGreaterThan(level3);
    });
  });

  describe('canLevelUp', () => {
    it('returns true when character has enough XP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
      });

      const result = LevelUpService.canLevelUp(character);

      expect(result).toBe(true);
    });

    it('returns false when character lacks XP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 500, // Fighter level 2 requires 1000 XP in authentic tables
        class: CharacterClass.FIGHTER,
      });

      const result = LevelUpService.canLevelUp(character);

      expect(result).toBe(false);
    });

    it('returns false when already at max level (13)', () => {
      const character = createTestCharacter({
        level: 13,
        experience: 999999,
        class: CharacterClass.FIGHTER,
      });

      const result = LevelUpService.canLevelUp(character);

      expect(result).toBe(false);
    });
  });

  describe('rollHPIncrease', () => {
    it('rolls HP increase for Fighter (d10 hit die)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        vitality: 18,
      });

      const hpIncrease = LevelUpService.rollHPIncrease(character);

      // d10 + 3 VIT bonus (VIT 18 = +3) = 4-13 HP
      expect(hpIncrease).toBeGreaterThanOrEqual(4);
      expect(hpIncrease).toBeLessThanOrEqual(13);
    });

    it('rolls HP increase for Mage (d4 hit die)', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        vitality: 10, // +0 bonus
      });

      const hpIncrease = LevelUpService.rollHPIncrease(character);

      // d4 + 0 VIT bonus = 1-4 HP
      expect(hpIncrease).toBeGreaterThanOrEqual(1);
      expect(hpIncrease).toBeLessThanOrEqual(4);
    });

    it('guarantees minimum 1 HP even with negative VIT bonus', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        vitality: 3, // -3 bonus
      });

      const hpIncrease = LevelUpService.rollHPIncrease(character);

      expect(hpIncrease).toBeGreaterThanOrEqual(1);
    });

    it('applies maximum vitality bonus for VIT 18', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        vitality: 18, // +4 bonus
      });

      const hpIncrease = LevelUpService.rollHPIncrease(character);

      // d10 + 4 VIT bonus = 5-14
      expect(hpIncrease).toBeGreaterThanOrEqual(5);
      expect(hpIncrease).toBeLessThanOrEqual(14);
    });
  });

  describe('rollStatChanges', () => {
    // Age is now stored in weeks: years * 52 = weeks
    // e.g., 20 years = 1040 weeks, 50 years = 2600 weeks

    it('returns stat changes object', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 20 * 52, // 20 years in weeks
      });

      const statChanges = LevelUpService.rollStatChanges(character);

      expect(statChanges).toBeDefined();
      expect(typeof statChanges).toBe('object');
    });

    it('changes stats by at most 1 point each (increase or decrease)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 50 * 52, // Middle age (50 years) for balanced chances
      });

      const statChanges = LevelUpService.rollStatChanges(character);

      Object.values(statChanges).forEach((change) => {
        expect(change).toBeLessThanOrEqual(1);
        expect(change).toBeGreaterThanOrEqual(-1);
      });
    });

    it('young characters (age 20) almost always gain stats', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 20 * 52, // Young (20 years): 130-20=110% capped to 95%
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
      });

      // Queue values: all stats checked (below 75%), all rolls at 50 (below 95% threshold)
      // Format: 6 pairs of (check roll, change roll) for each stat
      RandomService.queueNextValues([
        0.5,
        0.5, // STR: checked (50% < 75%), roll 50 < 95% = increase
        0.5,
        0.5, // INT: checked, roll 50 < 95% = increase
        0.5,
        0.5, // PIE: checked, roll 50 < 95% = increase
        0.5,
        0.5, // VIT: checked, roll 50 < 95% = increase
        0.5,
        0.5, // AGI: checked, roll 50 < 95% = increase
        0.5,
        0.5, // LUC: checked, roll 50 < 95% = increase
      ]);

      const statChanges = LevelUpService.rollStatChanges(character);

      // All stats should increase for young character with favorable rolls
      expect(statChanges.strength).toBe(1);
      expect(statChanges.intelligence).toBe(1);
      expect(statChanges.piety).toBe(1);
      expect(statChanges.vitality).toBe(1);
      expect(statChanges.agility).toBe(1);
      expect(statChanges.luck).toBe(1);
    });

    it('old characters (age 80) often lose stats', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 80 * 52, // Old (80 years): 130-80=50%
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
      });

      // Queue values: all stats checked (below 75%), all rolls at 60 (above 50% threshold)
      RandomService.queueNextValues([
        0.5,
        0.6, // STR: checked, roll 60 > 50% = decrease
        0.5,
        0.6, // INT: decrease
        0.5,
        0.6, // PIE: decrease
        0.5,
        0.6, // VIT: decrease
        0.5,
        0.6, // AGI: decrease
        0.5,
        0.6, // LUC: decrease
      ]);

      const statChanges = LevelUpService.rollStatChanges(character);

      // All stats should decrease for old character with unfavorable rolls
      expect(statChanges.strength).toBe(-1);
      expect(statChanges.intelligence).toBe(-1);
      expect(statChanges.piety).toBe(-1);
      expect(statChanges.vitality).toBe(-1);
      expect(statChanges.agility).toBe(-1);
      expect(statChanges.luck).toBe(-1);
    });

    it('respects stat cap of 18 (no increase above 18)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 20 * 52, // 20 years in weeks
        strength: 18, // Already at cap
      });

      // Queue favorable rolls for increase
      RandomService.queueNextValues([
        0.5,
        0.1, // STR: checked, roll would increase but capped
      ]);

      const statChanges = LevelUpService.rollStatChanges(character);

      // Strength shouldn't be in changes since it's already at max
      expect(statChanges.strength).toBeUndefined();
    });

    it('respects stat floor of 3 (no decrease below 3)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 90 * 52, // Very old (90 years)
        strength: 3, // Already at floor
      });

      // Queue unfavorable rolls for decrease
      RandomService.queueNextValues([
        0.5,
        0.95, // STR: checked, roll would decrease but floored
      ]);

      const statChanges = LevelUpService.rollStatChanges(character);

      // Strength shouldn't be in changes since it's already at min
      expect(statChanges.strength).toBeUndefined();
    });

    it('75% chance each stat is checked for modification', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 30 * 52, // 30 years in weeks
      });

      // Queue value above 75% threshold - stat should NOT be checked
      RandomService.queueNextValues([0.8]); // 80% > 75%, not checked

      const statChanges = LevelUpService.rollStatChanges(character);

      // First stat (strength) should not be modified
      expect(statChanges.strength).toBeUndefined();
    });

    describe('Level 18 stat protection (authentic Wizardry 1)', () => {
      // Stats at 18 have 5/6 (83.3%) chance to resist decrease on level-up
      // Roll 1d6: only decrease if roll is 1

      it('stat at 18 resists decrease when d6 roll is not 1', () => {
        const character = createTestCharacter({
          class: CharacterClass.FIGHTER,
          age: 80 * 52, // Old character (80 years): 130-80=50% threshold
          strength: 18, // At cap
        });

        // Queue: stat check (below 75%), roll (above 50% = decrease), d6 roll (not 1)
        RandomService.queueNextValues([
          0.5, // STR: checked (50% < 75%)
          0.6, // Roll 60 > 50% threshold = would decrease
          0.5, // d6 roll: 0.5 maps to 3 (not 1) = resist decrease
        ]);

        const statChanges = LevelUpService.rollStatChanges(character);

        // Stat should NOT decrease due to 5/6 protection
        expect(statChanges.strength).toBeUndefined();
      });

      it('stat at 18 decreases when d6 roll is 1 (1/6 chance)', () => {
        const character = createTestCharacter({
          class: CharacterClass.FIGHTER,
          age: 80 * 52, // Old character
          strength: 18,
        });

        // Queue: stat check, roll (decrease), d6 roll is 1
        RandomService.queueNextValues([
          0.5, // STR: checked
          0.6, // Roll > 50% threshold = would decrease
          0.01, // d6 roll: 0.01 maps to 1 = decrease applies
        ]);

        const statChanges = LevelUpService.rollStatChanges(character);

        // Stat SHOULD decrease (rolled 1 on d6)
        expect(statChanges.strength).toBe(-1);
      });

      it('stat below 18 decreases normally without d6 protection roll', () => {
        const character = createTestCharacter({
          class: CharacterClass.FIGHTER,
          age: 80 * 52,
          strength: 17, // Not at 18
        });

        // Queue: stat check, roll (decrease) - no d6 roll needed for stats below 18
        RandomService.queueNextValues([
          0.5, // STR: checked
          0.6, // Roll > 50% threshold = decrease (no protection)
        ]);

        const statChanges = LevelUpService.rollStatChanges(character);

        // Stat should decrease immediately (no protection for stats below 18)
        expect(statChanges.strength).toBe(-1);
      });

      it('multiple stats at 18 each get independent protection rolls', () => {
        const character = createTestCharacter({
          class: CharacterClass.FIGHTER,
          age: 80 * 52,
          strength: 18,
          intelligence: 18,
          piety: 10, // Not at 18
        });

        // Queue values for all three stats
        RandomService.queueNextValues([
          0.5,
          0.6,
          0.01, // STR: checked, decrease, d6=1 (decreases)
          0.5,
          0.6,
          0.5, // INT: checked, decrease, d6=3 (protected)
          0.5,
          0.6, // PIE: checked, decrease (no protection for 10)
        ]);

        const statChanges = LevelUpService.rollStatChanges(character);

        expect(statChanges.strength).toBe(-1); // Failed protection roll
        expect(statChanges.intelligence).toBeUndefined(); // Protected
        expect(statChanges.piety).toBe(-1); // No protection
      });
    });
  });

  describe('rollStatIncreases (deprecated)', () => {
    it('delegates to rollStatChanges for backwards compatibility', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 30,
      });

      const result = LevelUpService.rollStatIncreases(character);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('performLevelUp', () => {
    it('increases character level by 1', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 10,
        maxHp: 10,
      });

      const result = LevelUpService.performLevelUp(character);

      expect(result.updatedCharacter.level).toBe(2);
    });

    it('uses HP reroll system (keeps higher of current or new roll)', () => {
      RandomService.queueNextValues([0.9, 0.9]);
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 5,
        maxHp: 5,
        maxLev: 1,
        vitality: 18,
      });

      const result = LevelUpService.performLevelUp(character);

      expect(result.updatedCharacter.maxHp).toBeGreaterThan(5);
      expect(result.updatedCharacter.maxLev).toBe(2);
      expect(result.levelUpData.hpIncrease).toBe(result.updatedCharacter.maxHp - 5);
    });

    it('sets HP to new max HP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
      });

      const result = LevelUpService.performLevelUp(character);

      expect(result.updatedCharacter.hp).toBe(result.updatedCharacter.maxHp);
    });

    it('applies stat changes to character (age-based)', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        age: 20 * 52, // Young (20 years) for better stat growth
        strength: 14,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 10,
      });

      // Queue HP roll, then pairs for stat checks (check%, roll%)
      // Young character (age 20) has 95% threshold, so roll of 50% = increase
      RandomService.queueNextValues([
        0.5, // HP roll
        0.5,
        0.5, // STR: checked, increase
        0.5,
        0.5, // INT: checked, increase
        0.5,
        0.5, // PIE: checked, increase
        0.5,
        0.5, // VIT: checked, increase
        0.5,
        0.5, // AGI: checked, increase
        0.5,
        0.5, // LUC: checked, increase
      ]);

      const result = LevelUpService.performLevelUp(character);

      // All stats should increase for young character
      expect(result.updatedCharacter.strength).toBe(15);
      expect(result.updatedCharacter.intelligence).toBe(11);
      expect(result.levelUpData.statChanges.strength).toBe(1);
    });

    it('can decrease stats for old characters', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        age: 80 * 52, // Old (80 years): 130-80=50% threshold
        strength: 14,
      });

      // Queue HP roll, then stat check with roll above 50% threshold
      RandomService.queueNextValues([
        0.5, // HP roll
        0.5,
        0.6, // STR: checked, roll 60 > 50% = decrease
      ]);

      const result = LevelUpService.performLevelUp(character);

      // Strength should decrease
      expect(result.updatedCharacter.strength).toBe(13);
      expect(result.levelUpData.statChanges.strength).toBe(-1);
    });

    it('returns level up data for UI display', () => {
      // Use low maxHP to ensure reroll gives increase
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 5,
        maxHp: 5,
        maxLev: 1,
        age: 30 * 52, // Age in weeks
      });

      const result = LevelUpService.performLevelUp(character);

      expect(result.levelUpData.newLevel).toBe(2);
      // With reroll system, hpIncrease >= 0 (0 if old was higher)
      expect(result.levelUpData.hpIncrease).toBeGreaterThanOrEqual(0);
      expect(result.levelUpData.statChanges).toBeDefined();
    });

    it('increases spell points for Mage on level up', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 5000,
        class: CharacterClass.MAGE,
        hp: 8,
        maxHp: 8,
        age: 20 * 52, // 20 years in weeks
        spellPoints: {
          mage: {
            level1: { current: 2, max: 2 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 },
          },
        },
      });

      const result = LevelUpService.performLevelUp(character);

      // Level 2 mage should have more level 1 spell points
      expect(result.updatedCharacter.spellPoints?.mage?.level1.max).toBeGreaterThan(2);
    });

    it('increases spell points for Priest on level up', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 5000,
        class: CharacterClass.PRIEST,
        hp: 10,
        maxHp: 10,
        age: 20 * 52, // 20 years in weeks
        spellPoints: {
          priest: {
            level1: { current: 2, max: 2 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 },
          },
        },
      });

      const result = LevelUpService.performLevelUp(character);

      // Level 2 priest should have more level 1 spell points
      expect(result.updatedCharacter.spellPoints?.priest?.level1.max).toBeGreaterThan(2);
    });

    it('unlocks spell level 2 points at character level 3', () => {
      const character = createTestCharacter({
        level: 2,
        experience: 10000,
        class: CharacterClass.MAGE,
        hp: 12,
        maxHp: 12,
        age: 20 * 52, // 20 years in weeks
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 },
          },
        },
      });

      const result = LevelUpService.performLevelUp(character);

      // Level 3 mage should unlock spell level 2 points
      expect(result.updatedCharacter.spellPoints?.mage?.level2.max).toBeGreaterThan(0);
    });

    it('does not modify spell points for non-caster (Fighter)', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 5000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        age: 20,
      });

      const result = LevelUpService.performLevelUp(character);

      // Fighter should have no spell points
      expect(result.updatedCharacter.spellPoints).toBeUndefined();
    });
  });

  describe('getXPRequirement - all classes (authentic tables)', () => {
    it('calculates correct XP for all basic classes at level 2', () => {
      // Authentic Wizardry 1 XP tables
      // Thief - fastest to level
      expect(LevelUpService.getXPRequirement(2, CharacterClass.THIEF)).toBe(900);
      // Fighter
      expect(LevelUpService.getXPRequirement(2, CharacterClass.FIGHTER)).toBe(1000);
      // Priest
      expect(LevelUpService.getXPRequirement(2, CharacterClass.PRIEST)).toBe(1050);
      // Mage
      expect(LevelUpService.getXPRequirement(2, CharacterClass.MAGE)).toBe(1100);
    });

    it('calculates correct XP for elite classes at level 2', () => {
      expect(LevelUpService.getXPRequirement(2, CharacterClass.BISHOP)).toBe(1200);
      expect(LevelUpService.getXPRequirement(2, CharacterClass.SAMURAI)).toBe(1200);
      expect(LevelUpService.getXPRequirement(2, CharacterClass.LORD)).toBe(1300);
      expect(LevelUpService.getXPRequirement(2, CharacterClass.NINJA)).toBe(1450);
    });

    it('all classes can level up with sufficient XP', () => {
      const allClasses = [
        CharacterClass.FIGHTER,
        CharacterClass.THIEF,
        CharacterClass.PRIEST,
        CharacterClass.MAGE,
        CharacterClass.SAMURAI,
        CharacterClass.LORD,
        CharacterClass.NINJA,
        CharacterClass.BISHOP,
      ];

      for (const charClass of allClasses) {
        const xpNeeded = LevelUpService.getXPRequirement(2, charClass);
        const character = createTestCharacter({
          level: 1,
          experience: xpNeeded,
          class: charClass,
        });

        expect(LevelUpService.canLevelUp(character)).toBe(true);
      }
    });
  });
});
