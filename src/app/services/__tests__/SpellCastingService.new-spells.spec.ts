import { SpellCastingService } from '../SpellCastingService';
import { createTestCharacter } from '@testing/test-factories';
import {
  loadSpellsForTests,
  loadMonstersForTests,
  loadCharacterCreationDataForTests,
  clearGameDataCaches,
} from '@testing/test-data-loader';

beforeAll(async () => {
  await Promise.all([
    loadSpellsForTests(),
    loadMonstersForTests(),
    loadCharacterCreationDataForTests(),
  ]);
});

afterAll(() => {
  clearGameDataCaches();
});

describe('SpellCastingService - Level 1-2 Spells', () => {
  describe('PORFIC (Shield)', () => {
    it('applies -4 AC buff to single target', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level1: { current: 3, max: 3 } } },
      });
      const target = createTestCharacter({ id: 'target1' });

      const effect = SpellCastingService.resolveSpellEffect('porfic', caster, [target]);

      expect(effect.acBuffs).toBeDefined();
      expect(effect.acBuffs).toHaveLength(1);
      expect(effect.acBuffs![0].target).toBe('target1');
      expect(effect.acBuffs![0].acModifier).toBe(-4);
      expect(effect.message).toContain('PORFIC');
    });
  });

  describe('HALITO (Little Fire)', () => {
    it('deals 1d8 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 2, max: 2 } } },
      });
      const targets = [createTestCharacter({ id: 't1' }), createTestCharacter({ id: 't2' })];

      const effect = SpellCastingService.resolveSpellEffect('halito', caster, targets);

      expect(effect.damage).toBeDefined();
      expect(effect.damage).toHaveLength(2);
      expect(effect.damage![0]).toBeGreaterThanOrEqual(1);
      expect(effect.damage![0]).toBeLessThanOrEqual(8);
    });
  });

  describe('SOPIC (Invisibility)', () => {
    it('applies -4 AC buff to single target (invisibility buff)', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } },
      });
      const target = createTestCharacter({ id: 'target1' });

      const effect = SpellCastingService.resolveSpellEffect('sopic', caster, [target]);

      // SOPIC provides -4 AC (better defense) like PORFIC, via invisibility in Wizardry
      expect(effect.acBuffs).toBeDefined();
      expect(effect.acBuffs).toHaveLength(1);
      expect(effect.acBuffs![0].target).toBe('target1');
      expect(effect.acBuffs![0].acModifier).toBe(-4);
      expect(effect.message).toContain('SOPIC');
    });
  });

  describe('MATU (Bless)', () => {
    it('applies -2 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level2: { current: 2, max: 2 } } },
      });
      const allies = [
        createTestCharacter({ id: 'a1' }),
        createTestCharacter({ id: 'a2' }),
        createTestCharacter({ id: 'a3' }),
      ];

      const effect = SpellCastingService.resolveSpellEffect('matu', caster, allies);

      expect(effect.acBuffs).toHaveLength(3);
      expect(effect.acBuffs![0].acModifier).toBe(-2);
    });
  });

  describe('MOLITO (Improved Sparks)', () => {
    it('deals 3d6 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 1, max: 1 } } },
      });
      const targets = [createTestCharacter({ id: 't1' })];

      const effect = SpellCastingService.resolveSpellEffect('molito', caster, targets);

      expect(effect.damage![0]).toBeGreaterThanOrEqual(3);
      expect(effect.damage![0]).toBeLessThanOrEqual(18);
    });
  });

  describe('BAMATU (Prayer)', () => {
    it('applies -4 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } },
      });
      const allies = [createTestCharacter({ id: 'a1' })];

      const effect = SpellCastingService.resolveSpellEffect('bamatu', caster, allies);

      expect(effect.acBuffs![0].acModifier).toBe(-4);
    });
  });

  describe('LOMILWA (Extended Light)', () => {
    it('provides extended light utility', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('lomilwa', caster, [caster]);

      expect(effect.message).toContain('LOMILWA');
    });
  });

  describe('LORTO (Blades)', () => {
    it('deals 6d6 physical damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level6: { current: 1, max: 1 } } },
      });
      const target = createTestCharacter({ id: 't1' });

      const effect = SpellCastingService.resolveSpellEffect('lorto', caster, [target]);

      expect(effect.damage).toHaveLength(1);
      expect(effect.damage![0]).toBeGreaterThanOrEqual(6);
      expect(effect.damage![0]).toBeLessThanOrEqual(36);
    });
  });

  describe('MAPORFIC (Shield All)', () => {
    it('applies -2 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level4: { current: 1, max: 1 } } },
      });
      const allies = [createTestCharacter({ id: 'a1' })];

      const effect = SpellCastingService.resolveSpellEffect('maporfic', caster, allies);

      // MAPORFIC provides -2 AC per original Wizardry research
      expect(effect.acBuffs![0].acModifier).toBe(-2);
    });
  });

  describe('LAKANITO (Suffocation)', () => {
    it('attempts instant death on monster group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level5: { current: 1, max: 1 } } },
      });
      const targets = [createTestCharacter({ id: 't1' })];

      const effect = SpellCastingService.resolveSpellEffect('lakanito', caster, targets);

      // LAKANITO is instant death spell per research, not damage
      expect(effect.instantDeath).toBeDefined();
      expect(effect.message).toContain('LAKANITO');
    });
  });

  describe('ZILWAN (Holy Word)', () => {
    it('attempts instant death on undead targets', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level6: { current: 1, max: 1 } } },
      });
      const targets = [createTestCharacter({ id: 't1' })];

      const effect = SpellCastingService.resolveSpellEffect('zilwan', caster, targets);

      // ZILWAN targets undead - message indicates no effect on living
      expect(effect.message).toContain('ZILWAN');
    });
  });

  describe('BADI (Death)', () => {
    it('attempts instant death on single target', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level5: { current: 1, max: 1 } } },
      });
      const target = createTestCharacter({ id: 't1' });

      const effect = SpellCastingService.resolveSpellEffect('badi', caster, [target]);

      expect(effect.instantDeath).toBeDefined();
      expect(effect.instantDeath).toContain('t1');
    });
  });

  describe('HAMAN (Random Effect)', () => {
    it('has random effect data structure', () => {
      const spell = SpellCastingService.getSpell('haman');

      // HAMAN has random effects, not transformation
      expect(spell?.randomEffects).toBeDefined();
      expect(spell?.randomEffects?.length).toBe(5); // 5 possible effects
      expect(spell?.cost?.experienceLevels).toBe(1); // Costs 1 level
    });
  });

  describe('MALOR (Teleport)', () => {
    it('has teleport utility with camp and combat behaviors', () => {
      const spell = SpellCastingService.getSpell('malor');

      expect(spell?.utility).toBe('teleport');
      expect(spell?.campBehavior?.type).toBe('coordinate_teleport');
      expect(spell?.combatBehavior?.type).toBe('random_escape');
      expect(spell?.combatBehavior?.safe).toBe(true);
    });
  });

  describe('DI (Resurrection)', () => {
    it('has vitality-based resurrection success formula', () => {
      const spell = SpellCastingService.getSpell('di');

      // DI uses vitality × 4 formula for success rate
      expect(spell?.resurrection).toBeDefined();
      expect(spell?.resurrection?.typed?.variable).toBe('vitality');
      expect(spell?.resurrection?.typed?.multiplier).toBe(4);
      expect(spell?.resurrection?.worksOn).toContain('dead');
      expect(spell?.resurrection?.doesNotWorkOn).toContain('ashes');
    });
  });

  describe('MABADI (HP Reduction)', () => {
    it('has HP reduction effect structure (not instant death)', () => {
      const spell = SpellCastingService.getSpell('mabadi');

      // MABADI reduces target HP to 1d8, NOT instant death
      expect(spell?.effect?.type).toBe('hp_reduction');
      expect(spell?.effect?.remainingHP?.dice).toBe('1d8');
      expect(spell?.effect?.noSavingThrow).toBe(true);
    });

    it('reduces target HP to 1-8 (cannot be resisted)', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level6: { current: 1, max: 1 } } },
      });
      const target = createTestCharacter({ id: 'monster1', hp: 100 });

      const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, [target]);

      // MABADI should return hpReduction array
      expect(effect.hpReduction).toBeDefined();
      expect(effect.hpReduction).toHaveLength(1);
      expect(effect.hpReduction![0].targetId).toBe('monster1');
      // New HP should be 1-8 (1d8 roll)
      expect(effect.hpReduction![0].newHp).toBeGreaterThanOrEqual(1);
      expect(effect.hpReduction![0].newHp).toBeLessThanOrEqual(8);
      expect(effect.message).toContain('MABADI');
    });

    it('affects multiple targets', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level6: { current: 1, max: 1 } } },
      });
      const targets = [
        createTestCharacter({ id: 't1', hp: 50 }),
        createTestCharacter({ id: 't2', hp: 75 }),
      ];

      const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, targets);

      expect(effect.hpReduction).toHaveLength(2);
      expect(effect.hpReduction![0].targetId).toBe('t1');
      expect(effect.hpReduction![1].targetId).toBe('t2');
    });
  });

  describe('DUMAPIC (Show Coordinates)', () => {
    it('provides coordinate display utility', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } },
      });

      const effect = SpellCastingService.resolveSpellEffect('dumapic', caster, [caster]);

      expect(effect.message).toContain('DUMAPIC');
      expect(effect.message).toContain('location');
    });
  });
});
