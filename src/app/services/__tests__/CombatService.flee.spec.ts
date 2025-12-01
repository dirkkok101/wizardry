// src/app/services/__tests__/CombatService.flee.spec.ts
import { CombatService } from '../CombatService'
import { CombatState, MonsterGroup } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { CharacterStatus } from '@models/CharacterStatus'

/**
 * Flee Formula Tests (Apple II Reference)
 *
 * Formula: 39% - (MazeLevel × 3%)
 * + Small party bonus (if <= 3 members): 20% - (PartySize × 5%)
 * + Demoralization bonus: +20% if monsters demoralized
 * + Level 10: ALWAYS 0%
 */
describe('CombatService - Flee Formula', () => {
  // Helper to create minimal combat state
  function createCombatState(dungeonLevel: number, options: Partial<CombatState> = {}): CombatState {
    return {
      monsterGroups: [{
        id: 'A',
        monsters: [{
          id: 'monster1',
          monsterId: 'kobold',
          name: 'Kobold',
          hp: 5,
          maxHp: 5,
          ac: 10,
          damage: [{ dice: '1d4', min: 1, max: 4 }],
          xp: 10,
          status: 'ALIVE',
          level: 1
        }],
        formation: 'front',
        identified: true
      }],
      commandQueue: [],
      roundNumber: 1,
      combatLog: [],
      canFlee: true,
      dungeonLevel,
      statusEffects: new Map(),
      acModifiers: new Map(),
      statusDurations: new Map(),
      monstersDemoralized: false,
      ...options
    }
  }

  // Helper to create test character
  function createCharacter(id: string, overrides: Partial<Character> = {}): Character {
    return {
      id,
      name: 'Test Character',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      level: 1,
      maxLev: 1,
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
      status: CharacterStatus.OK,
      vim: { current: 12, max: 12 },
      gold: 0,
      age: 20,
      inventory: [],
      knownSpells: [],
      deathCount: 0,
      monsterKills: 0,
      ...overrides
    }
  }

  describe('base formula: 39% - (MazeLevel × 3%)', () => {
    const party = [
      createCharacter('char1'),
      createCharacter('char2'),
      createCharacter('char3'),
      createCharacter('char4'),
      createCharacter('char5'),
      createCharacter('char6')
    ]
    const fleeing = new Set(['char1', 'char2', 'char3', 'char4', 'char5', 'char6'])

    it('Level 1: 36% base chance (39 - 3)', () => {
      const state = createCombatState(1)
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(36)
    })

    it('Level 2: 33% base chance (39 - 6)', () => {
      const state = createCombatState(2)
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(33)
    })

    it('Level 3: 30% base chance (39 - 9)', () => {
      const state = createCombatState(3)
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(30)
    })

    it('Level 5: 24% base chance (39 - 15)', () => {
      const state = createCombatState(5)
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(24)
    })

    it('Level 9: 12% base chance (39 - 27)', () => {
      const state = createCombatState(9)
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(12)
    })
  })

  describe('Level 10: running NEVER works', () => {
    it('returns 0% regardless of party size', () => {
      const party = [createCharacter('char1')]
      const fleeing = new Set(['char1'])
      const state = createCombatState(10)
      // Solo party would normally have +15% bonus, but Level 10 overrides all
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(0)
    })

    it('returns 0% even with demoralized monsters', () => {
      const party = [createCharacter('char1')]
      const fleeing = new Set(['char1'])
      const state = createCombatState(10, { monstersDemoralized: true })
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(0)
    })
  })

  describe('small party bonus: 20% - (PartySize × 5%)', () => {
    it('1 member party gets +15% bonus', () => {
      const party = [createCharacter('char1')]
      const fleeing = new Set(['char1'])
      const state = createCombatState(1)  // Base 36%
      // 36% + 15% = 51%
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(51)
    })

    it('2 member party gets +10% bonus', () => {
      const party = [createCharacter('char1'), createCharacter('char2')]
      const fleeing = new Set(['char1', 'char2'])
      const state = createCombatState(1)  // Base 36%
      // 36% + 10% = 46%
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(46)
    })

    it('3 member party gets +5% bonus', () => {
      const party = [
        createCharacter('char1'),
        createCharacter('char2'),
        createCharacter('char3')
      ]
      const fleeing = new Set(['char1', 'char2', 'char3'])
      const state = createCombatState(1)  // Base 36%
      // 36% + 5% = 41%
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(41)
    })

    it('4+ member party gets no bonus', () => {
      const party = [
        createCharacter('char1'),
        createCharacter('char2'),
        createCharacter('char3'),
        createCharacter('char4')
      ]
      const fleeing = new Set(['char1', 'char2', 'char3', 'char4'])
      const state = createCombatState(1)  // Base 36%
      // No bonus for 4+ members
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(36)
    })
  })

  describe('demoralization bonus: +20%', () => {
    it('adds 20% when monsters are demoralized', () => {
      const party = [
        createCharacter('char1'),
        createCharacter('char2'),
        createCharacter('char3'),
        createCharacter('char4'),
        createCharacter('char5'),
        createCharacter('char6')
      ]
      const fleeing = new Set(['char1', 'char2', 'char3', 'char4', 'char5', 'char6'])
      const state = createCombatState(1, { monstersDemoralized: true })
      // Base 36% + 20% demoralization = 56%
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(56)
    })

    it('stacks with small party bonus', () => {
      const party = [createCharacter('char1')]
      const fleeing = new Set(['char1'])
      const state = createCombatState(1, { monstersDemoralized: true })
      // Base 36% + 15% small party + 20% demoralization = 71%
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(71)
    })
  })

  describe('canFlee flag', () => {
    it('returns 0% when canFlee is false (boss fights)', () => {
      const party = [createCharacter('char1')]
      const fleeing = new Set(['char1'])
      const state = createCombatState(1, { canFlee: false })
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('returns 0% when no characters are fleeing', () => {
      const party = [createCharacter('char1')]
      const fleeing = new Set<string>()  // Empty set
      const state = createCombatState(1)
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(0)
    })

    it('returns 0% when all party members are dead', () => {
      const party = [createCharacter('char1', { status: 'DEAD', hp: 0 })]
      const fleeing = new Set(['char1'])
      const state = createCombatState(1)
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(0)
    })

    it('counts only alive members for small party bonus', () => {
      const party = [
        createCharacter('char1'),
        createCharacter('char2', { status: 'DEAD', hp: 0 }),
        createCharacter('char3', { status: 'DEAD', hp: 0 }),
        createCharacter('char4', { status: 'DEAD', hp: 0 })
      ]
      const fleeing = new Set(['char1'])
      const state = createCombatState(1)
      // Only 1 alive, gets +15% bonus
      // Base 36% + 15% = 51%
      expect(CombatService.calculateFleeChance(state, party, fleeing)).toBe(51)
    })

    it('uses characterUpdates for HP checks', () => {
      const party = [
        createCharacter('char1'),
        createCharacter('char2'),
        createCharacter('char3'),
        createCharacter('char4')
      ]
      const fleeing = new Set(['char1', 'char2', 'char3', 'char4'])
      const state = createCombatState(1)

      // Simulate 3 characters died this round (via characterUpdates)
      const updates = new Map<string, Character>()
      updates.set('char2', { ...party[1], hp: 0, status: 'DEAD' })
      updates.set('char3', { ...party[2], hp: 0, status: 'DEAD' })
      updates.set('char4', { ...party[3], hp: 0, status: 'DEAD' })

      // Only 1 alive, gets +15% bonus
      // Base 36% + 15% = 51%
      expect(CombatService.calculateFleeChance(state, party, fleeing, updates)).toBe(51)
    })
  })

  describe('comprehensive level table', () => {
    // Full party (6 members, no small party bonus)
    const fullParty = [
      createCharacter('c1'),
      createCharacter('c2'),
      createCharacter('c3'),
      createCharacter('c4'),
      createCharacter('c5'),
      createCharacter('c6')
    ]
    const allFleeing = new Set(['c1', 'c2', 'c3', 'c4', 'c5', 'c6'])

    const expectedByLevel = [
      { level: 1, expected: 36 },
      { level: 2, expected: 33 },
      { level: 3, expected: 30 },
      { level: 4, expected: 27 },
      { level: 5, expected: 24 },
      { level: 6, expected: 21 },
      { level: 7, expected: 18 },
      { level: 8, expected: 15 },
      { level: 9, expected: 12 },
      { level: 10, expected: 0 }  // NEVER works
    ]

    expectedByLevel.forEach(({ level, expected }) => {
      it(`Level ${level}: ${expected}% flee chance`, () => {
        const state = createCombatState(level)
        expect(CombatService.calculateFleeChance(state, fullParty, allFleeing)).toBe(expected)
      })
    })
  })
})
