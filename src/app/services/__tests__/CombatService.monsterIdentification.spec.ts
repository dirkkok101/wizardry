// src/services/__tests__/CombatService.monsterIdentification.spec.ts
import { CombatService } from '../CombatService'
import { MonsterService } from '../MonsterService'
import { RandomService } from '../RandomService'
import { CombatState, MonsterGroup } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'

// Monsters are preloaded in setup-jest.ts via MonsterDataLoader.loadAllMonsters()

function createTestCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: `char-${Math.random().toString(36).substring(7)}`,
    name: 'Test Fighter',
    race: 'HUMAN',
    class: 'FIGHTER',
    alignment: 'GOOD',
    level: 5,
    xp: 0,
    hp: 30,
    maxHp: 30,
    ac: 5,
    strength: 16,
    intelligence: 10,
    piety: 10,
    vitality: 10,
    agility: 10,
    luck: 10,
    status: CharacterStatus.OK,
    age: 20,
    gold: 100,
    mageSpellPoints: [0, 0, 0, 0, 0, 0, 0],
    priestSpellPoints: [0, 0, 0, 0, 0, 0, 0],
    knownSpells: [],
    equipment: {
      weapon: null,
      armor: null,
      shield: null,
      helmet: null,
      gauntlets: null,
      accessory: null
    },
    inventory: [],
    ...overrides
  }
}

function createCombatState(monsterGroups: MonsterGroup[]): CombatState {
  return {
    monsterGroups,
    commandQueue: [],
    roundNumber: 1,
    combatLog: [],
    canFlee: true,
    statusEffects: new Map(),
    acModifiers: new Map(),
    statusDurations: new Map()
  }
}

describe('CombatService - Monster Identification in Messages', () => {
  describe('Attack messages', () => {
    it('shows unidentified name when group is not identified', () => {
      const kobold = MonsterService.createMonsterInstance('kobold')
      const fighter = createTestCharacter({ id: 'fighter1', name: 'Fighter' })

      // Group is NOT identified (before LATUMAPIC)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [kobold],
        formation: 'front',
        identified: false
      }

      const state = createCombatState([group])

      // Queue values for attack roll (ensure hit)
      RandomService.queueNextValues([0.01, 0.5]) // Low roll = hit, damage roll

      const command = CombatService.createCommand(kobold, 'ATTACK', fighter)
      const result = CombatService.executeCommand(state, command, new Set())

      // Should use unidentified name "Small Humanoid", not "Kobold"
      expect(result.messages[0]).toContain('Small Humanoid')
      expect(result.messages[0]).not.toContain('Kobold')
    })

    it('shows real name when group is identified (LATUMAPIC active)', () => {
      const kobold = MonsterService.createMonsterInstance('kobold')
      const fighter = createTestCharacter({ id: 'fighter1', name: 'Fighter' })

      // Group IS identified (after LATUMAPIC)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [kobold],
        formation: 'front',
        identified: true
      }

      const state = createCombatState([group])

      // Queue values for attack roll (ensure hit)
      RandomService.queueNextValues([0.01, 0.5]) // Low roll = hit, damage roll

      const command = CombatService.createCommand(kobold, 'ATTACK', fighter)
      const result = CombatService.executeCommand(state, command, new Set())

      // Should use real name "Kobold", not "Small Humanoid"
      expect(result.messages[0]).toContain('Kobold')
      expect(result.messages[0]).not.toContain('Small Humanoid')
    })
  })

  describe('Critical hit messages', () => {
    it('shows unidentified name in critical hit message when not identified', () => {
      // Use a monster with critical hit ability
      const vorpalBunny = MonsterService.createMonsterInstance('vorpal_bunny')
      const fighter = createTestCharacter({ id: 'fighter1', name: 'Fighter', hp: 50, maxHp: 50 })

      const group: MonsterGroup = {
        id: 'A',
        monsters: [vorpalBunny],
        formation: 'front',
        identified: false
      }

      const state = createCombatState([group])

      // Queue values: hit roll (success), damage roll, critical roll (success)
      RandomService.queueNextValues([0.01, 0.5, 0.01])

      const command = CombatService.createCommand(vorpalBunny, 'ATTACK', fighter)
      const result = CombatService.executeCommand(state, command, new Set())

      // Check messages for critical hit - should use unidentified name
      const allMessages = result.messages.join(' ')
      if (allMessages.includes('Critical')) {
        expect(allMessages).toContain(vorpalBunny.unidentifiedName)
        expect(allMessages).not.toContain('Vorpal Bunny')
      }
    })
  })

  describe('Advance messages', () => {
    it('shows unidentified name when monsters advance', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')

      const group: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'back',
        identified: false
      }

      const state = createCombatState([group])
      const command = CombatService.createCommand(kobolds[0], 'ADVANCE')
      const result = CombatService.executeCommand(state, command, new Set())

      // Should use unidentified name in advance message
      const message = result.messages[0]
      expect(message).toContain('Small Humanoid')
      expect(message).not.toContain('Kobold')
    })

    it('shows real name when monsters advance after identification', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')

      const group: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'back',
        identified: true
      }

      const state = createCombatState([group])
      const command = CombatService.createCommand(kobolds[0], 'ADVANCE')
      const result = CombatService.executeCommand(state, command, new Set())

      // Should use real name in advance message
      const message = result.messages[0]
      expect(message).toContain('Kobold')
      expect(message).not.toContain('Small Humanoid')
    })
  })

  describe('Parry and Run messages', () => {
    it('shows unidentified name in parry message when not identified', () => {
      const kobold = MonsterService.createMonsterInstance('kobold')

      const group: MonsterGroup = {
        id: 'A',
        monsters: [kobold],
        formation: 'front',
        identified: false
      }

      const state = createCombatState([group])
      const command = CombatService.createCommand(kobold, 'PARRY')
      const result = CombatService.executeCommand(state, command, new Set())

      expect(result.messages[0]).toContain('Small Humanoid')
      expect(result.messages[0]).not.toContain('Kobold')
    })

    it('shows unidentified name in run message when not identified', () => {
      const kobold = MonsterService.createMonsterInstance('kobold')

      const group: MonsterGroup = {
        id: 'A',
        monsters: [kobold],
        formation: 'front',
        identified: false
      }

      const state = createCombatState([group])
      const command = CombatService.createCommand(kobold, 'RUN')
      const result = CombatService.executeCommand(state, command, new Set())

      expect(result.messages[0]).toContain('Small Humanoid')
      expect(result.messages[0]).not.toContain('Kobold')
    })
  })
})
