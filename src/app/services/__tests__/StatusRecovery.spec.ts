// src/app/services/__tests__/StatusRecovery.spec.ts
import { MonsterResistanceService } from '../MonsterResistanceService'
import { CombatService } from '../CombatService'
import { CombatState } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { CharacterStatus } from '@models/CharacterStatus'
import { RandomService } from '../RandomService'

/**
 * Status Recovery Tests (Apple II Reference)
 *
 * Per technical reference (Section 15: Status Effects):
 *
 * Monster Recovery:
 * - ASLEEP: Level × 20% (max 50%)
 * - AFRAID: Level × 10% (max 50%)
 * - PARALYZED: Level × 7% (max 50%)
 *
 * Character Recovery:
 * - ASLEEP: Level × 10% (max 50%)
 * - AFRAID: Level × 5% (max 50%)
 * - PARALYZED: NO natural recovery in combat!
 * - SILENCED: NEVER recovers during battle (MONTINO bug)
 */
describe('Status Recovery', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('Monster Recovery Formulas', () => {
    describe('ASLEEP: Level × 20%, max 50%', () => {
      it('Level 1 monster has 20% recovery chance', () => {
        // 1 × 20 = 20%
        RandomService.queueNextValues([0.15])  // 15% < 20% = success
        expect(MonsterResistanceService.rollRecovery(1, 'ASLEEP')).toBe(true)

        RandomService.queueNextValues([0.25])  // 25% > 20% = failure
        expect(MonsterResistanceService.rollRecovery(1, 'ASLEEP')).toBe(false)
      })

      it('Level 2 monster has 40% recovery chance', () => {
        // 2 × 20 = 40%
        RandomService.queueNextValues([0.35])  // 35% < 40% = success
        expect(MonsterResistanceService.rollRecovery(2, 'ASLEEP')).toBe(true)

        RandomService.queueNextValues([0.45])  // 45% > 40% = failure
        expect(MonsterResistanceService.rollRecovery(2, 'ASLEEP')).toBe(false)
      })

      it('Level 3+ monster capped at 50%', () => {
        // 3 × 20 = 60%, but capped at 50%
        RandomService.queueNextValues([0.45])  // 45% < 50% = success
        expect(MonsterResistanceService.rollRecovery(3, 'ASLEEP')).toBe(true)

        RandomService.queueNextValues([0.55])  // 55% > 50% = failure (capped)
        expect(MonsterResistanceService.rollRecovery(3, 'ASLEEP')).toBe(false)

        // Level 10 should also be capped at 50%
        RandomService.queueNextValues([0.55])
        expect(MonsterResistanceService.rollRecovery(10, 'ASLEEP')).toBe(false)
      })
    })

    describe('PARALYZED: Level × 7%, max 50%', () => {
      it('Level 1 monster has 7% recovery chance', () => {
        RandomService.queueNextValues([0.05])  // 5% < 7% = success
        expect(MonsterResistanceService.rollRecovery(1, 'PARALYZED')).toBe(true)

        RandomService.queueNextValues([0.10])  // 10% > 7% = failure
        expect(MonsterResistanceService.rollRecovery(1, 'PARALYZED')).toBe(false)
      })

      it('Level 5 monster has 35% recovery chance', () => {
        // 5 × 7 = 35%
        RandomService.queueNextValues([0.30])  // 30% < 35% = success
        expect(MonsterResistanceService.rollRecovery(5, 'PARALYZED')).toBe(true)

        RandomService.queueNextValues([0.40])  // 40% > 35% = failure
        expect(MonsterResistanceService.rollRecovery(5, 'PARALYZED')).toBe(false)
      })

      it('Level 8+ monster capped at 50%', () => {
        // 8 × 7 = 56%, but capped at 50%
        RandomService.queueNextValues([0.45])
        expect(MonsterResistanceService.rollRecovery(8, 'PARALYZED')).toBe(true)

        RandomService.queueNextValues([0.55])
        expect(MonsterResistanceService.rollRecovery(8, 'PARALYZED')).toBe(false)
      })
    })

    describe('FEAR/AFRAID: Level × 10%, max 50%', () => {
      it('Level 1 monster has 10% recovery chance', () => {
        RandomService.queueNextValues([0.08])
        expect(MonsterResistanceService.rollRecovery(1, 'FEAR')).toBe(true)

        RandomService.queueNextValues([0.15])
        expect(MonsterResistanceService.rollRecovery(1, 'FEAR')).toBe(false)
      })

      it('Level 5+ monster capped at 50%', () => {
        // 5 × 10 = 50% (exactly at cap)
        RandomService.queueNextValues([0.45])
        expect(MonsterResistanceService.rollRecovery(5, 'FEAR')).toBe(true)

        RandomService.queueNextValues([0.55])
        expect(MonsterResistanceService.rollRecovery(5, 'FEAR')).toBe(false)
      })
    })

    describe('SILENCED: Level × 10%, max 50% (bug-free version)', () => {
      it('Level 1 monster has 10% recovery chance', () => {
        // 1 × 10 = 10%
        RandomService.queueNextValues([0.08])  // 8% < 10% = success
        expect(MonsterResistanceService.rollRecovery(1, 'SILENCED')).toBe(true)

        RandomService.queueNextValues([0.15])  // 15% > 10% = failure
        expect(MonsterResistanceService.rollRecovery(1, 'SILENCED')).toBe(false)
      })

      it('Level 5+ monster capped at 50%', () => {
        // 5 × 10 = 50% (exactly at cap)
        RandomService.queueNextValues([0.45])
        expect(MonsterResistanceService.rollRecovery(5, 'SILENCED')).toBe(true)

        RandomService.queueNextValues([0.55])
        expect(MonsterResistanceService.rollRecovery(5, 'SILENCED')).toBe(false)
      })
    })
  })

  describe('Character Recovery Formulas', () => {
    describe('ASLEEP: Level × 10%, max 50%', () => {
      it('Level 1 character has 10% recovery chance', () => {
        RandomService.queueNextValues([0.08])  // 8% < 10% = success
        expect(MonsterResistanceService.rollCharacterRecovery(1, 'ASLEEP')).toBe(true)

        RandomService.queueNextValues([0.15])  // 15% > 10% = failure
        expect(MonsterResistanceService.rollCharacterRecovery(1, 'ASLEEP')).toBe(false)
      })

      it('Level 5 character has 50% recovery chance (at cap)', () => {
        RandomService.queueNextValues([0.45])
        expect(MonsterResistanceService.rollCharacterRecovery(5, 'ASLEEP')).toBe(true)

        RandomService.queueNextValues([0.55])
        expect(MonsterResistanceService.rollCharacterRecovery(5, 'ASLEEP')).toBe(false)
      })

      it('Level 10 character capped at 50%', () => {
        // 10 × 10 = 100%, but capped at 50%
        RandomService.queueNextValues([0.55])
        expect(MonsterResistanceService.rollCharacterRecovery(10, 'ASLEEP')).toBe(false)
      })
    })

    describe('AFRAID: Level × 5%, max 50%', () => {
      it('Level 1 character has 5% recovery chance', () => {
        RandomService.queueNextValues([0.03])
        expect(MonsterResistanceService.rollCharacterRecovery(1, 'AFRAID')).toBe(true)

        RandomService.queueNextValues([0.08])
        expect(MonsterResistanceService.rollCharacterRecovery(1, 'AFRAID')).toBe(false)
      })

      it('Level 10 character has 50% recovery chance (at cap)', () => {
        RandomService.queueNextValues([0.45])
        expect(MonsterResistanceService.rollCharacterRecovery(10, 'AFRAID')).toBe(true)
      })
    })

    describe('PARALYZED: NO natural recovery (critical bug)', () => {
      it('paralyzed characters never recover naturally', () => {
        // This is intentional behavior matching the Apple II bug
        // Even with lowest possible roll
        RandomService.queueNextValues([0.001])
        expect(MonsterResistanceService.rollCharacterRecovery(1, 'PARALYZED')).toBe(false)

        RandomService.queueNextValues([0.001])
        expect(MonsterResistanceService.rollCharacterRecovery(10, 'PARALYZED')).toBe(false)
      })
    })

    describe('SILENCED: NEVER recovers (MONTINO bug)', () => {
      it('silenced characters never recover during battle', () => {
        // This matches the broken code in original Wizardry
        RandomService.queueNextValues([0.001])
        expect(MonsterResistanceService.rollCharacterRecovery(10, 'SILENCED')).toBe(false)
      })
    })
  })

  describe('CombatService.processCharacterStatusRecovery', () => {
    function createCombatState(): CombatState {
      return {
        monsterGroups: [],
        commandQueue: [],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map(),
        acModifiers: new Map(),
        statusDurations: new Map()
      }
    }

    function createCharacter(id: string, level: number, status: CharacterStatus): Character {
      return {
        id,
        name: `Character ${id}`,
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER,
        alignment: Alignment.GOOD,
        level,
        maxLev: level,
        experience: 0,
        hp: 10,
        maxHp: 10,
        ac: 10,
        strength: 12,
        intelligence: 10,
        piety: 10,
        vitality: 12,
        agility: 12,
        luck: 10,
        status,
        vim: { current: 12, max: 12 },
        gold: 0,
        age: 20,
        inventory: [],
        knownSpells: [],
        deathCount: 0,
        monsterKills: 0
      }
    }

    it('wakes sleeping characters based on level', () => {
      const party = [createCharacter('c1', 5, CharacterStatus.ASLEEP)]
      const state = createCombatState()

      // Level 5 = 50% chance, queue success
      RandomService.queueNextValues([0.45])

      const result = CombatService.processCharacterStatusRecovery(party, state)
      expect(result.curedCharacters.size).toBe(1)
      expect(result.curedCharacters.get('c1')?.status).toBe(CharacterStatus.OK)
      expect(result.messages.some(m => m.includes('wakes up'))).toBe(true)
    })

    it('does NOT recover paralyzed characters', () => {
      const party = [createCharacter('c1', 10, CharacterStatus.PARALYZED)]
      const state = createCombatState()

      // Even high level characters don't recover from paralysis
      // No random values needed since chance is 0%

      const result = CombatService.processCharacterStatusRecovery(party, state)
      expect(result.curedCharacters.size).toBe(0)
      expect(result.messages.length).toBe(0)
    })

    it('skips dead characters', () => {
      const party = [createCharacter('c1', 5, CharacterStatus.ASLEEP)]
      party[0].hp = 0
      party[0].status = CharacterStatus.DEAD

      const state = createCombatState()
      const result = CombatService.processCharacterStatusRecovery(party, state)
      expect(result.curedCharacters.size).toBe(0)
    })

    it('processes multiple sleeping characters independently', () => {
      const party = [
        createCharacter('c1', 5, CharacterStatus.ASLEEP),
        createCharacter('c2', 5, CharacterStatus.ASLEEP)
      ]
      const state = createCombatState()

      // First succeeds, second fails
      RandomService.queueNextValues([0.45, 0.55])

      const result = CombatService.processCharacterStatusRecovery(party, state)
      expect(result.curedCharacters.size).toBe(1)
      expect(result.curedCharacters.has('c1')).toBe(true)
      expect(result.curedCharacters.has('c2')).toBe(false)
    })
  })
})
