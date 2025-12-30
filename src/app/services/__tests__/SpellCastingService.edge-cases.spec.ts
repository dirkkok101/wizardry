import { SpellCastingService } from '../SpellCastingService';
import { createTestCharacter, createTestMonster } from '@testing/test-factories';
import {
  loadSpellsForTests,
  loadMonstersForTests,
  clearGameDataCaches,
} from '@testing/test-data-loader';

beforeAll(async () => {
  await Promise.all([loadSpellsForTests(), loadMonstersForTests()]);
});

afterAll(() => {
  clearGameDataCaches();
});

describe('SpellCastingService - Edge Cases', () => {
  describe('Insufficient spell points', () => {
    it('returns error when casting spell with 0 spell points', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 0, max: 3 },
          },
        },
      });

      const result = SpellCastingService.canCastSpell(caster, 'dumapic');
      expect(result.canCast).toBe(false);
      expect(result.reason).toContain('spell points');
    });

    it('does not deduct spell points if character has none', () => {
      const caster = createTestCharacter({
        spellPoints: {
          priest: {
            level1: { current: 0, max: 3 },
          },
        },
      });

      const canCast = SpellCastingService.canCastSpell(caster, 'kalki');
      expect(canCast.canCast).toBe(false);

      // Verify deduct would not work
      const updatedCaster = SpellCastingService.deductSpellPoints(caster, 'kalki');
      expect(updatedCaster.spellPoints?.priest?.level1.current).toBe(0);
    });
  });

  describe('Empty target arrays', () => {
    it('handles empty target array for group damage spell', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 2, max: 2 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('molito', caster, []);
      expect(effect.damage).toBeDefined();
      expect(effect.damage).toHaveLength(0);
    });

    it('handles empty target array for AC buff spell', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level2: { current: 2, max: 2 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('matu', caster, []);
      expect(effect.acBuffs).toBeDefined();
      expect(effect.acBuffs).toHaveLength(0);
    });

    it('handles empty target array for instant death spell (BADI)', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level5: { current: 1, max: 1 } } },
      });

      // BADI is an instant death spell (MABADI is HP reduction, not instant death)
      const effect = SpellCastingService.resolveSpellEffect('badi', caster, []);
      expect(effect.instantDeath).toBeDefined();
      expect(effect.instantDeath).toHaveLength(0);
    });
  });

  describe('Undead-only spells', () => {
    it('ZILWAN has undeadOnly flag set', () => {
      // ZILWAN targets undead only - check spell data structure
      const spell = SpellCastingService.getSpell('zilwan');
      expect(spell?.undeadOnly).toBe(true);
    });

    it('BADIOS deals divine damage to any target', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level1: { current: 1, max: 1 } } },
      });
      const target = createTestMonster({ id: 'target1' });

      // BADIOS is NOT undead-only - it's a basic divine damage spell
      const effect = SpellCastingService.resolveSpellEffect('badios', caster, [target]);
      expect(effect.damage).toBeDefined();
      expect(effect.damage!.length).toBeGreaterThan(0);
    });

    it('BADIOS damages multiple targets', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level1: { current: 1, max: 1 } } },
      });
      const target1 = createTestMonster({ id: 'target1' });
      const target2 = createTestMonster({ id: 'target2' });

      const effect = SpellCastingService.resolveSpellEffect('badios', caster, [target1, target2]);
      expect(effect.damage).toBeDefined();
      expect(effect.damage!.length).toBe(2); // Both targets take damage
    });
  });

  describe('Unknown spell handling', () => {
    it('returns error message for unknown spell ID', () => {
      const caster = createTestCharacter();

      const effect = SpellCastingService.resolveSpellEffect('unknownspell', caster, []);
      expect(effect.message).toBe('Unknown spell');
    });

    it('canCastSpell returns false for unknown spell', () => {
      const caster = createTestCharacter();

      const result = SpellCastingService.canCastSpell(caster, 'unknownspell');
      expect(result.canCast).toBe(false);
      expect(result.reason).toContain('Unknown');
    });

    it('getSpell returns undefined for unknown spell', () => {
      const spell = SpellCastingService.getSpell('unknownspell');
      expect(spell).toBeUndefined();
    });
  });

  describe('Level 1 caster edge cases', () => {
    it('LOKTOFEIT has 2% success rate at level 1', () => {
      const caster = createTestCharacter({
        level: 1,
        spellPoints: { mage: { level6: { current: 1, max: 1 } } },
      });

      // Run 1000 times to verify 2% success rate (expect ~20 successes)
      const results = Array.from({ length: 1000 }, () =>
        SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster]),
      );

      const successes = results.filter((r) => r.recall?.success).length;
      // At 2% rate, expect between 5 and 50 successes out of 1000 (allowing variance)
      expect(successes).toBeGreaterThan(5);
      expect(successes).toBeLessThan(50);
    });

    it('High level caster approaches 100% success cap for LOKTOFEIT', () => {
      const caster = createTestCharacter({
        level: 50, // 1 + (50 * 2) = 101%, capped at 100%
        spellPoints: { mage: { level6: { current: 1, max: 1 } } },
      });

      // Run multiple times to verify success rate is very high (100% cap)
      const results = Array.from({ length: 100 }, () =>
        SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster]),
      );

      const successes = results.filter((r) => r.recall?.success).length;
      expect(successes).toBeGreaterThan(90); // Should be ~100%
    });

    it('LOKTOFEIT success includes equipment/gold loss consequences', () => {
      const caster = createTestCharacter({
        level: 50, // High level for guaranteed success
        spellPoints: { priest: { level6: { current: 1, max: 1 } } },
      });

      // Force success by using high level
      const results = Array.from({ length: 20 }, () =>
        SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster]),
      );

      // At least some should succeed
      const successResults = results.filter((r) => r.recall?.success);
      expect(successResults.length).toBeGreaterThan(0);

      // Successful results should include consequences
      for (const result of successResults) {
        expect(result.recall!.equipmentLost).toBe(true);
        expect(result.recall!.goldLostPercent).toBe(90);
        expect(result.message).toContain('equipment');
      }
    });

    it('LOKTOFEIT failure has no consequences', () => {
      const caster = createTestCharacter({
        level: 1, // Low level for likely failure
        spellPoints: { priest: { level6: { current: 1, max: 1 } } },
      });

      // Run many times - some should fail
      const results = Array.from({ length: 200 }, () =>
        SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster]),
      );

      const failedResults = results.filter((r) => !r.recall?.success);
      expect(failedResults.length).toBeGreaterThan(0);

      // Failed results should NOT include consequences
      for (const result of failedResults) {
        expect(result.recall!.equipmentLost).toBeUndefined();
        expect(result.recall!.goldLostPercent).toBeUndefined();
      }
    });
  });

  describe('Character without spell points', () => {
    it('Fighter cannot cast mage spells', () => {
      const fighter = createTestCharacter({
        // No spellPoints property at all
      });

      const result = SpellCastingService.canCastSpell(fighter, 'dumapic');
      expect(result.canCast).toBe(false);
    });

    it('Character without priest spell points cannot cast priest spells', () => {
      const character = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
          },
          // No priest spell points
        },
      });

      const result = SpellCastingService.canCastSpell(character, 'kalki');
      expect(result.canCast).toBe(false);
    });
  });

  describe('Random effect spell edge cases', () => {
    it('HAMAN has random effects with level drain cost', () => {
      const spell = SpellCastingService.getSpell('haman');

      // HAMAN has random effects, costs 1 level
      expect(spell?.randomEffects).toBeDefined();
      expect(spell?.randomEffects?.length).toBe(5); // 5 possible effects
      expect(spell?.cost?.experienceLevels).toBe(1);
      expect(spell?.cost?.mustRelearn).toBe(false); // HAMAN doesn't require relearning
    });

    it('MAHAMAN has random effects with level drain cost', () => {
      const spell = SpellCastingService.getSpell('mahaman');

      // MAHAMAN has random effects, not transformation
      expect(spell?.randomEffects).toBeDefined();
      expect(spell?.randomEffects?.length).toBe(3); // 3 possible effects
      expect(spell?.cost?.experienceLevels).toBe(1); // Costs 1 level
      expect(spell?.cost?.mustRelearn).toBe(true); // Must relearn spell after casting
    });

    it('HAMAN resolveSpellEffect returns random effect result', () => {
      const caster = createTestCharacter({
        level: 13, // Minimum level to cast HAMAN
        spellPoints: { mage: { level6: { current: 1, max: 1 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('haman', caster, []);

      expect(effect.randomEffect).toBeDefined();
      expect(effect.randomEffect!.effectId).toBeGreaterThanOrEqual(1);
      expect(effect.randomEffect!.effectId).toBeLessThanOrEqual(5);
      expect(effect.randomEffect!.levelDrain).toBe(1);
      expect(effect.randomEffect!.mustRelearn).toBe(false);
      expect(effect.message).toContain('HAMAN');
    });

    it('MAHAMAN resolveSpellEffect returns random effect with mustRelearn', () => {
      const caster = createTestCharacter({
        level: 13,
        spellPoints: { mage: { level7: { current: 1, max: 1 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('mahaman', caster, []);

      expect(effect.randomEffect).toBeDefined();
      expect(effect.randomEffect!.effectId).toBeGreaterThanOrEqual(1);
      expect(effect.randomEffect!.effectId).toBeLessThanOrEqual(3);
      expect(effect.randomEffect!.levelDrain).toBe(1);
      expect(effect.randomEffect!.mustRelearn).toBe(true); // MAHAMAN must be relearned
      expect(effect.message).toContain('MAHAMAN');
    });
  });

  describe('Anti-undead spell edge cases', () => {
    it('ZILWAN is an undead-only massive damage spell', () => {
      const spell = SpellCastingService.getSpell('zilwan');

      // ZILWAN does massive holy damage (10d200) to undead only
      expect(spell?.undeadOnly).toBe(true);
      expect(spell?.damage?.dice).toBe('10d200');
      expect(spell?.damage?.type).toBe('holy');
    });
  });

  describe('Teleport spell structure', () => {
    it('MALOR has teleport utility with safe combat escape', () => {
      const spell = SpellCastingService.getSpell('malor');

      // MALOR teleport is handled by MazeScene, not resolveSpellEffect
      expect(spell?.utility).toBe('teleport');
      expect(spell?.combatBehavior?.type).toBe('random_escape');
      expect(spell?.combatBehavior?.safe).toBe(true); // Combat escape is safe
      expect(spell?.campBehavior?.type).toBe('coordinate_teleport');
      // Camp mode has dangers (solid rock death)
      expect(spell?.campBehavior?.dangers?.solidRock).toBe('instant_party_death');
    });

    it('MALOR combat mode is always safe and successful', () => {
      const caster = createTestCharacter({
        level: 1,
        spellPoints: { mage: { level7: { current: 1, max: 1 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('malor', caster, [], 'combat');

      expect(effect.teleport).toBeDefined();
      expect(effect.teleport!.success).toBe(true);
      expect(effect.teleport!.mode).toBe('random_escape');
      expect(effect.teleport!.safe).toBe(true);
      expect(effect.message).toContain('safety');
    });

    it('MALOR camp mode includes rock death dangers', () => {
      const caster = createTestCharacter({
        level: 1,
        spellPoints: { mage: { level7: { current: 1, max: 1 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('malor', caster, [], 'camp');

      expect(effect.teleport).toBeDefined();
      expect(effect.teleport!.mode).toBe('coordinate_teleport');
      expect(effect.teleport!.dangers).toBeDefined();
      expect(effect.teleport!.dangers!.solidRock).toBe('instant_party_death');
      expect(effect.teleport!.dangers!.outsideBounds).toBe('instant_party_death');
      expect(effect.message).toContain('coordinates');
    });

    it('MALOR camp mode includes level 10 restriction', () => {
      const caster = createTestCharacter({
        level: 1,
        spellPoints: { mage: { level7: { current: 1, max: 1 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('malor', caster, [], 'camp');

      expect(effect.teleport!.restrictions).toBeDefined();
      expect(effect.teleport!.restrictions!.level10).toBe('cannot_teleport_in');
    });
  });

  describe('Resurrection spell structure', () => {
    it('KADORTO can resurrect from dead OR ashes', () => {
      const spell = SpellCastingService.getSpell('kadorto');

      // KADORTO uses vitality-based success, works on both dead and ashes
      expect(spell?.resurrection).toBeDefined();
      expect(spell?.resurrection?.typed?.variable).toBe('vitality');
      expect(spell?.resurrection?.typed?.multiplier).toBe(4);
      expect(spell?.resurrection?.worksOn).toContain('dead');
      expect(spell?.resurrection?.worksOn).toContain('ashes');
      expect(spell?.resurrection?.onSuccess?.hp).toBe('full');
    });

    it('DI can only resurrect from dead (not ashes)', () => {
      const spell = SpellCastingService.getSpell('di');

      // DI uses same vitality formula but only works on dead
      expect(spell?.resurrection).toBeDefined();
      expect(spell?.resurrection?.typed?.variable).toBe('vitality');
      expect(spell?.resurrection?.worksOn).toContain('dead');
      expect(spell?.resurrection?.doesNotWorkOn).toContain('ashes');
      expect(spell?.resurrection?.onSuccess?.hp).toBe(1); // DI restores only 1 HP
    });
  });
});
