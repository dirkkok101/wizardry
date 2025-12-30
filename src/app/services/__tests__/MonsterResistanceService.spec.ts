import { MonsterResistanceService } from '../MonsterResistanceService';
import { MonsterInstance } from '@models/Combat';
import { LoadedSpell } from '@models/SpellDefinition';
import { RandomService } from '../RandomService';
import { loadMonstersForTests, clearGameDataCaches } from '@testing/test-data-loader';

beforeAll(async () => {
  await loadMonstersForTests();
});

afterAll(() => {
  clearGameDataCaches();
});

// Mock monster for testing
const createTestMonster = (overrides: Partial<MonsterInstance> = {}): MonsterInstance => ({
  id: 'test-monster-1',
  monsterId: 'kobold',
  name: 'Kobold',
  hp: 10,
  maxHp: 10,
  ac: 8,
  damage: [{ dice: '1d4', min: 1, max: 4 }],
  xp: 10,
  status: 'ALIVE',
  level: 1,
  undead: false,
  ...overrides,
});

// Mock spell for testing
const createTestSpell = (overrides: Partial<LoadedSpell> = {}): LoadedSpell =>
  ({
    id: 'test-spell',
    name: 'TEST SPELL',
    level: 1,
    casterType: 'mage',
    category: 'offensive',
    target: 'group',
    description: 'Test spell',
    castableIn: ['combat'],
    loaded: true,
    validatedAt: Date.now(),
    ...overrides,
  }) as LoadedSpell;

describe('MonsterResistanceService', () => {
  beforeEach(() => {
    RandomService.resetSeed();
  });

  describe('checkTypedResistance', () => {
    it('calculates level-scaled resistance correctly', () => {
      const typed = {
        type: 'level_scaled' as const,
        variable: 'monster_level' as const,
        multiplier: 20,
        base: 0,
        cap: 100,
      };

      RandomService.queueNextValues([0.7]); // 70% > 60% threshold = not resisted
      const result = MonsterResistanceService.checkTypedResistance(3, typed);

      expect(result.resistChance).toBe(60);
      expect(result.resisted).toBe(false);
    });

    it('calculates fixed resistance correctly', () => {
      const typed = {
        type: 'fixed' as const,
        value: 95,
      };

      RandomService.queueNextValues([0.9]); // 90% < 95% = resisted
      const result = MonsterResistanceService.checkTypedResistance(1, typed);

      expect(result.resistChance).toBe(95);
      expect(result.resisted).toBe(true);
    });

    it('returns 0% for none type', () => {
      const typed = { type: 'none' as const };
      const result = MonsterResistanceService.checkTypedResistance(10, typed);

      expect(result.resistChance).toBe(0);
      expect(result.resisted).toBe(false);
    });
  });

  describe('checkStatusEffectResistance', () => {
    it('calculates KATINO sleep resistance with typed data: (20 × Level)%', () => {
      const monster = createTestMonster({ level: 3 });
      const spell = createTestSpell({
        statusEffect: 'ASLEEP',
        resistance: {
          formula: '(20 × Monster Level)%',
          typed: {
            type: 'level_scaled',
            variable: 'monster_level',
            multiplier: 20,
            base: 0,
            cap: 100,
          },
        },
      });

      // Queue roll to fail resistance (0.7 > 0.6 threshold for 60% resist)
      RandomService.queueNextValues([0.7]);
      const result = MonsterResistanceService.checkStatusEffectResistance(monster, spell);

      expect(result.resistChance).toBe(60);
      expect(result.resisted).toBe(false);
    });

    it('calculates MANIFO paralysis resistance with typed data: (50 + 10 × Level)%', () => {
      const monster = createTestMonster({ level: 1 });
      const spell = createTestSpell({
        statusEffect: 'PARALYZED',
        resistance: {
          formula: '(50 + 10 × Monster Level)%',
          typed: {
            type: 'level_scaled',
            variable: 'monster_level',
            multiplier: 10,
            base: 50,
            cap: 100,
          },
        },
      });

      // Queue roll to succeed resistance (0.5 < 0.6 threshold for 60% resist)
      RandomService.queueNextValues([0.5]);
      const result = MonsterResistanceService.checkStatusEffectResistance(monster, spell);

      expect(result.resistChance).toBe(60);
      expect(result.resisted).toBe(true);
    });

    it('calculates MONTINO silence resistance with typed data: (10 × Level)%', () => {
      const monster = createTestMonster({ level: 5 });
      const spell = createTestSpell({
        statusEffect: 'SILENCED',
        resistance: {
          formula: '(Monster Level × 10)%',
          typed: {
            type: 'level_scaled',
            variable: 'monster_level',
            multiplier: 10,
            base: 0,
            cap: 100,
          },
        },
      });

      // Queue roll for 50% chance
      RandomService.queueNextValues([0.49]);
      const result = MonsterResistanceService.checkStatusEffectResistance(monster, spell);

      expect(result.resistChance).toBe(50);
      expect(result.resisted).toBe(true);
    });

    it('returns no resistance when spell has no typed data', () => {
      const monster = createTestMonster({ level: 2 });
      const spell = createTestSpell({ statusEffect: 'ASLEEP' });

      const result = MonsterResistanceService.checkStatusEffectResistance(monster, spell);

      expect(result.resistChance).toBe(0);
      expect(result.resisted).toBe(false);
    });

    it('caps resistance at 100%', () => {
      const monster = createTestMonster({ level: 10 });
      const spell = createTestSpell({
        statusEffect: 'ASLEEP',
        resistance: {
          formula: '(20 × Monster Level)%',
          typed: {
            type: 'level_scaled',
            variable: 'monster_level',
            multiplier: 20,
            base: 0,
            cap: 100,
          },
        },
      });

      // 20 × 10 = 200%, but cap is 100%
      RandomService.queueNextValues([0.99]);
      const result = MonsterResistanceService.checkStatusEffectResistance(monster, spell);

      expect(result.resistChance).toBe(100); // Capped at 100
      expect(result.resisted).toBe(true);
    });
  });

  describe('getRecoveryChanceFromTyped', () => {
    it('calculates sleep recovery: (20 × Level)%, capped at 50%', () => {
      const typed = {
        type: 'level_scaled' as const,
        variable: 'monster_level' as const,
        multiplier: 20,
        base: 0,
        cap: 50,
      };

      expect(MonsterResistanceService.getRecoveryChanceFromTyped(1, typed)).toBe(20);
      expect(MonsterResistanceService.getRecoveryChanceFromTyped(2, typed)).toBe(40);
      expect(MonsterResistanceService.getRecoveryChanceFromTyped(3, typed)).toBe(50); // Capped
      expect(MonsterResistanceService.getRecoveryChanceFromTyped(5, typed)).toBe(50); // Capped
    });

    it('calculates paralysis recovery: (7 × Level)%, capped at 50%', () => {
      const typed = {
        type: 'level_scaled' as const,
        variable: 'monster_level' as const,
        multiplier: 7,
        base: 0,
        cap: 50,
      };

      expect(MonsterResistanceService.getRecoveryChanceFromTyped(1, typed)).toBe(7);
      expect(MonsterResistanceService.getRecoveryChanceFromTyped(5, typed)).toBe(35);
      expect(MonsterResistanceService.getRecoveryChanceFromTyped(8, typed)).toBe(50); // 56 capped to 50
    });
  });

  describe('rollRecoveryFromTyped', () => {
    it('returns true when roll succeeds', () => {
      const typed = {
        type: 'level_scaled' as const,
        variable: 'monster_level' as const,
        multiplier: 20,
        base: 0,
        cap: 50,
      };

      RandomService.queueNextValues([0.1]); // 10% < 20% (level 1)
      expect(MonsterResistanceService.rollRecoveryFromTyped(1, typed)).toBe(true);
    });

    it('returns false when roll fails', () => {
      const typed = {
        type: 'level_scaled' as const,
        variable: 'monster_level' as const,
        multiplier: 20,
        base: 0,
        cap: 50,
      };

      RandomService.queueNextValues([0.9]); // 90% > 20% (level 1)
      expect(MonsterResistanceService.rollRecoveryFromTyped(1, typed)).toBe(false);
    });
  });

  describe('checkInstantDeathResistance', () => {
    describe('MAKANITO (≤7HD, no save, undead immune)', () => {
      const makanito = createTestSpell({
        id: 'makanito',
        instantDeath: {
          type: 'suffocation',
          killThreshold: { maxHitDice: 7 },
          noSavingThrow: true,
        },
        immunities: ['undead', 'monsters_level_8_plus'],
      });

      it('kills eligible monsters (level ≤ 7) without saving throw', () => {
        const monster = createTestMonster({ level: 5 });
        const result = MonsterResistanceService.checkInstantDeathResistance(monster, makanito);

        expect(result.immune).toBe(false);
        expect(result.resisted).toBe(false);
        expect(result.reason).toBe('No saving throw');
      });

      it('immunity for undead', () => {
        const undead = createTestMonster({ level: 3, undead: true });
        const result = MonsterResistanceService.checkInstantDeathResistance(undead, makanito);

        expect(result.immune).toBe(true);
        expect(result.reason).toBe('Undead are immune');
      });

      it('immunity for level 8+ monsters', () => {
        const highLevel = createTestMonster({ level: 8 });
        const result = MonsterResistanceService.checkInstantDeathResistance(highLevel, makanito);

        expect(result.immune).toBe(true);
        expect(result.reason).toContain('exceeds 7HD threshold');
      });
    });

    describe('LAKANITO (suffocation, (6×Level)% resist)', () => {
      const lakanito = createTestSpell({
        id: 'lakanito',
        instantDeath: { type: 'suffocation' },
        resistance: {
          formula: '(6 × Monster Level)%',
          typed: {
            type: 'level_scaled',
            variable: 'monster_level',
            multiplier: 6,
            base: 0,
            cap: 100,
          },
        },
        immunities: ['undead', 'constructs', 'non_breathing_creatures'],
      });

      it('undead are immune (do not breathe)', () => {
        const undead = createTestMonster({ undead: true });
        const result = MonsterResistanceService.checkInstantDeathResistance(undead, lakanito);

        expect(result.immune).toBe(true);
        expect(result.reason).toBe('Undead do not breathe');
      });

      it('applies (6 × Level)% resistance', () => {
        const monster = createTestMonster({ level: 10 });
        RandomService.queueNextValues([0.5]); // 50% < 60% resist chance
        const result = MonsterResistanceService.checkInstantDeathResistance(monster, lakanito);

        expect(result.immune).toBe(false);
        expect(result.resistChance).toBe(60);
        expect(result.resisted).toBe(true);
      });

      it('low level monsters have low resistance', () => {
        const monster = createTestMonster({ level: 1 });
        RandomService.queueNextValues([0.1]); // 10% > 6% resist chance
        const result = MonsterResistanceService.checkInstantDeathResistance(monster, lakanito);

        expect(result.resistChance).toBe(6);
        expect(result.resisted).toBe(false);
      });
    });

    describe('BADI (single target, (10×Level)% resist)', () => {
      const badi = createTestSpell({
        id: 'badi',
        instantDeath: { type: 'divine_word', savingThrow: true },
        resistance: {
          formula: '(Monster Level × 10)%',
          typed: {
            type: 'level_scaled',
            variable: 'monster_level',
            multiplier: 10,
            base: 0,
            cap: 100,
          },
        },
      });

      it('applies (10 × Level)% resistance', () => {
        const monster = createTestMonster({ level: 5 });
        RandomService.queueNextValues([0.4]); // 40% < 50% resist chance
        const result = MonsterResistanceService.checkInstantDeathResistance(monster, badi);

        expect(result.immune).toBe(false);
        expect(result.resistChance).toBe(50);
        expect(result.resisted).toBe(true);
      });

      it('level 10+ monsters are effectively immune (100% resist)', () => {
        const monster = createTestMonster({ level: 10 });
        RandomService.queueNextValues([0.99]); // Will always resist at 100%
        const result = MonsterResistanceService.checkInstantDeathResistance(monster, badi);

        expect(result.resistChance).toBe(100);
        expect(result.resisted).toBe(true);
      });
    });
  });

  describe('checkElementalResistance', () => {
    it('returns 0.5 multiplier for fire-resistant monsters against fire spells', () => {
      const template = {
        resistances: [{ type: 'fire' as const, value: 50 }],
      };

      const result = MonsterResistanceService.checkElementalResistance(template as any, 'fire');

      expect(result.resisted).toBe(false); // Not fully resisted
      expect(result.damageMultiplier).toBe(0.5); // Half damage
      expect(result.reason).toBe('fire resistant');
    });

    it('returns 0.5 multiplier for cold-resistant monsters against cold spells', () => {
      const template = {
        resistances: [{ type: 'cold' as const, value: 100 }],
      };

      const result = MonsterResistanceService.checkElementalResistance(template as any, 'cold');

      expect(result.damageMultiplier).toBe(0.5);
      expect(result.reason).toBe('cold resistant');
    });

    it('returns full damage for non-elemental spells', () => {
      const template = {
        resistances: [{ type: 'fire' as const, value: 100 }],
      };

      const result = MonsterResistanceService.checkElementalResistance(template as any, 'physical');

      expect(result.damageMultiplier).toBe(1.0);
    });

    it('returns full damage when monster has no matching resistance', () => {
      const template = {
        resistances: [{ type: 'magic' as const, value: 50 }],
      };

      const result = MonsterResistanceService.checkElementalResistance(template as any, 'fire');

      expect(result.damageMultiplier).toBe(1.0);
    });
  });

  describe('rollRecovery paralysis formula', () => {
    it('uses (level * 7)% capped at 50% per Apple II source', () => {
      // Level 5 monster: 5 * 7 = 35% recovery chance
      RandomService.queueNextValues([0.3]); // 30% < 35% = should recover

      const recovered = MonsterResistanceService.rollRecovery(5, 'PARALYZED');

      expect(recovered).toBe(true);
    });

    it('caps paralysis recovery at 50%', () => {
      // Level 10 monster: 10 * 7 = 70% -> capped at 50%
      RandomService.queueNextValues([0.45]); // 45% < 50% = should recover

      const recovered = MonsterResistanceService.rollRecovery(10, 'PARALYZED');

      expect(recovered).toBe(true);
    });

    it('level 10 monster fails recovery at 55%', () => {
      // Level 10: capped at 50%, so 55% roll should fail
      RandomService.queueNextValues([0.55]); // 55% > 50% = should NOT recover

      const recovered = MonsterResistanceService.rollRecovery(10, 'PARALYZED');

      expect(recovered).toBe(false);
    });
  });

  describe('checkMagicResistance', () => {
    describe('with spellResist field', () => {
      it('uses spellResist field not resistances array', () => {
        // Will O' Wisp has spellResist: 95 but no magic resistance in resistances[]
        const template = {
          id: 'will_o_wisp',
          spellResist: 95,
          resistances: [], // No magic resistance here
        };

        RandomService.queueNextValues([0.5]); // 50% < 95% = should resist

        const result = MonsterResistanceService.checkMagicResistance(template as any);

        expect(result.resistChance).toBe(95);
        expect(result.resisted).toBe(true);
      });

      it('returns no resistance when spellResist is 0', () => {
        const template = {
          id: 'orc',
          spellResist: 0,
          resistances: [],
        };

        const result = MonsterResistanceService.checkMagicResistance(template as any);

        expect(result.resisted).toBe(false);
        expect(result.resistChance).toBe(0);
      });

      it('returns no resistance when spellResist is undefined', () => {
        const template = {
          id: 'kobold',
          resistances: [],
        };

        const result = MonsterResistanceService.checkMagicResistance(template as any);

        expect(result.resisted).toBe(false);
        expect(result.resistChance).toBe(0);
      });
    });

    // Legacy tests kept for backwards compatibility check
    it('rolls against monster magic resistance value (legacy resistances array)', () => {
      const template = {
        resistances: [{ type: 'magic' as const, value: 30 }],
      };

      RandomService.queueNextValues([0.2]); // 20% < 30% = resisted
      const result = MonsterResistanceService.checkMagicResistance(template as any);

      // After fix: spellResist takes precedence, resistances[magic] ignored
      // Since no spellResist field, should return 0
      expect(result.resisted).toBe(false);
      expect(result.resistChance).toBe(0);
    });

    it('returns no resistance when monster has no spellResist', () => {
      const template = {
        resistances: [{ type: 'fire' as const, value: 50 }],
      };

      const result = MonsterResistanceService.checkMagicResistance(template as any);

      expect(result.resisted).toBe(false);
      expect(result.resistChance).toBe(0);
    });
  });
});
