// src/services/__tests__/CombatService.monsterPositioning.spec.ts
import { CombatService } from '../CombatService'
import { MonsterService } from '../MonsterService'
import { MonsterDataLoader } from '../MonsterDataLoader'
import { EncounterService } from '../EncounterService'
import { RandomService } from '../RandomService'
import { CombatState, MonsterGroup, MonsterInstance } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { loadMonstersForTests } from '@testing/test-data-loader'

// Load monster data before tests (cached for all tests in this file)
beforeAll(async () => {
  await loadMonstersForTests()
})

// Helper to create a test character
function createTestCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: `char-${Math.random().toString(36).substring(7)}`,
    name: 'Test Fighter',
    race: 'HUMAN',
    class: 'FIGHTER',
    alignment: 'GOOD',
    level: 1,
    xp: 0,
    hp: 10,
    maxHp: 10,
    ac: 10,
    strength: 12,
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

// Helper to create a basic combat state
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

describe('CombatService - Monster Positioning', () => {
  describe('MonsterService.getAttackRange', () => {
    it('returns melee for monsters with only melee damage', () => {
      const kobold = MonsterDataLoader.getMonster('kobold')!
      expect(MonsterService.getAttackRange(kobold)).toBe('melee')
    })

    it('returns ranged for spellcasting monsters with no melee (synthetic)', () => {
      // In authentic Wizardry 1, ALL monsters have melee attacks
      // Use a synthetic template to test the ranged-only logic
      const rangedOnlyTemplate = {
        ...MonsterDataLoader.getMonster('lvl_1_mage')!,
        damage: [] // Remove melee damage
      }
      expect(MonsterService.getAttackRange(rangedOnlyTemplate)).toBe('ranged')
    })

    it('returns both for spellcasting monsters with melee (authentic data)', () => {
      const mage = MonsterDataLoader.getMonster('lvl_1_mage')!
      // Authentic Wizardry 1 mages have both spellcasting AND melee damage
      expect(MonsterService.getAttackRange(mage)).toBe('both')
    })

    it('returns both for monsters with spellcasting and melee damage', () => {
      // Find a monster with both abilities
      const template = MonsterDataLoader.getMonster('high_priest_greater')
      if (template && template.specialAbilities.includes('spellcasting') && template.damage.length > 0) {
        expect(MonsterService.getAttackRange(template)).toBe('both')
      }
    })

    it('returns both for monsters with breath weapon and melee damage', () => {
      const dragon = MonsterDataLoader.getMonster('fire_dragon')!
      expect(MonsterService.getAttackRange(dragon)).toBe('both')
    })

    it('uses explicit attackRange when set', () => {
      const template = {
        ...MonsterDataLoader.getMonster('kobold')!,
        attackRange: 'ranged' as const
      }
      expect(MonsterService.getAttackRange(template)).toBe('ranged')
    })
  })

  describe('MonsterService.prefersBackRow', () => {
    it('returns true for ranged-only monsters (synthetic)', () => {
      // In authentic Wizardry 1, ALL monsters have melee attacks
      // Use a synthetic template to test the ranged-only preference logic
      const rangedOnlyTemplate = {
        ...MonsterDataLoader.getMonster('lvl_1_mage')!,
        damage: [] // Remove melee damage to make it ranged-only
      }
      expect(MonsterService.prefersBackRow(rangedOnlyTemplate)).toBe(true)
    })

    it('returns false for spellcaster with melee (authentic data)', () => {
      const mage = MonsterDataLoader.getMonster('lvl_1_mage')!
      // Authentic mages have both, so prefersBackRow is false
      expect(MonsterService.prefersBackRow(mage)).toBe(false)
    })

    it('returns false for melee monsters', () => {
      const kobold = MonsterDataLoader.getMonster('kobold')!
      expect(MonsterService.prefersBackRow(kobold)).toBe(false)
    })

    it('uses explicit prefersBack when set', () => {
      const template = {
        ...MonsterDataLoader.getMonster('kobold')!,
        prefersBack: true
      }
      expect(MonsterService.prefersBackRow(template)).toBe(true)
    })
  })

  describe('MonsterService.canAttackFromBackRow', () => {
    it('returns false for melee-only monsters', () => {
      const kobold = MonsterDataLoader.getMonster('kobold')!
      expect(MonsterService.canAttackFromBackRow(kobold)).toBe(false)
    })

    it('returns true for ranged monsters', () => {
      const mage = MonsterDataLoader.getMonster('lvl_1_mage')!
      expect(MonsterService.canAttackFromBackRow(mage)).toBe(true)
    })

    it('returns true for monsters with both melee and ranged', () => {
      const dragon = MonsterDataLoader.getMonster('fire_dragon')!
      expect(MonsterService.canAttackFromBackRow(dragon)).toBe(true)
    })
  })

  describe('EncounterService.determineFormation', () => {
    it('places melee monsters in front row most of the time', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      let frontCount = 0
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const formation = EncounterService.determineFormation(kobolds)
        if (formation === 'front') frontCount++
      }

      // Should be around 90% front row for melee monsters
      expect(frontCount).toBeGreaterThan(70)
      expect(frontCount).toBeLessThanOrEqual(100)
    })

    it('places authentic spellcasters in front row (they have melee)', () => {
      // In authentic Wizardry 1, mages have both spellcasting AND melee
      // So they get attackRange='both' which means prefersBackRow=false
      const mages = MonsterService.generateMonsterGroup('lvl_1_mage')
      let frontCount = 0
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const formation = EncounterService.determineFormation(mages)
        if (formation === 'front') frontCount++
      }

      // Authentic mages with melee = attackRange 'both' = 60% front chance
      // Use 50 threshold for statistical stability
      expect(frontCount).toBeGreaterThan(50)
      expect(frontCount).toBeLessThanOrEqual(100)
    })

    it('returns front for empty array', () => {
      expect(EncounterService.determineFormation([])).toBe('front')
    })
  })

  describe('selectMonsterAction with positioning', () => {
    it('returns ADVANCE for back-row melee monster when front is empty', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      const backRowGroup: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'back'
      }

      const command = CombatService.selectMonsterAction(
        kobolds[0],
        party,
        frontRow,
        backRowGroup,
        [backRowGroup]
      )

      expect(command.type).toBe('ADVANCE')
    })

    it('returns PARRY for back-row melee monster when front is full', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      const orcs = MonsterService.generateMonsterGroup('orc')
      const ogres = MonsterService.generateMonsterGroup('ogre')
      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      const backRowGroup: MonsterGroup = {
        id: 'C',
        monsters: kobolds,
        formation: 'back'
      }

      const frontGroup1: MonsterGroup = {
        id: 'A',
        monsters: orcs,
        formation: 'front'
      }

      const frontGroup2: MonsterGroup = {
        id: 'B',
        monsters: ogres,
        formation: 'front'
      }

      const allGroups = [frontGroup1, frontGroup2, backRowGroup]

      const command = CombatService.selectMonsterAction(
        kobolds[0],
        party,
        frontRow,
        backRowGroup,
        allGroups
      )

      // Can't advance (2 front groups), should parry
      expect(command.type).toBe('PARRY')
    })

    it('returns ATTACK for back-row ranged monster', () => {
      const mages = MonsterService.generateMonsterGroup('lvl_1_mage')
      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      const backRowGroup: MonsterGroup = {
        id: 'A',
        monsters: mages,
        formation: 'back'
      }

      // Queue values to bypass spell casting (75% check fails when random > 0.75)
      // This test is about positioning, not spell selection
      RandomService.queueNextValues([0.8]) // 80% > 75% = skip mage spell

      const command = CombatService.selectMonsterAction(
        mages[0],
        party,
        frontRow,
        backRowGroup,
        [backRowGroup]
      )

      // Ranged monsters can attack from back row
      expect(command.type).toBe('ATTACK')
    })

    it('returns ATTACK for front-row melee monster', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      const frontGroup: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'front'
      }

      const command = CombatService.selectMonsterAction(
        kobolds[0],
        party,
        frontRow,
        frontGroup,
        [frontGroup]
      )

      expect(command.type).toBe('ATTACK')
    })

    it('works without optional positioning parameters (backward compatible)', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      // Call without optional parameters
      const command = CombatService.selectMonsterAction(
        kobolds[0],
        party,
        frontRow
      )

      // Should still return ATTACK (old behavior)
      expect(command.type).toBe('ATTACK')
    })
  })

  describe('executeAdvanceCommand', () => {
    it('moves monster group from back to front row', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')

      const backRowGroup: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'back'
      }

      const state = createCombatState([backRowGroup])

      const command = CombatService.createCommand(kobolds[0], 'ADVANCE')
      const parryingSet = new Set<string>()

      const result = CombatService.executeCommand(state, command, parryingSet)

      // Group should now be in front row
      expect(result.newState.monsterGroups[0].formation).toBe('front')
      expect(result.messages[0]).toContain('advance')
    })

    it('generates correct message for single monster', () => {
      const monster: MonsterInstance = {
        id: 'test-1',
        monsterId: 'kobold',
        name: 'Kobold',
        unidentifiedName: 'Small Humanoid',
        hp: 5,
        maxHp: 5,
        ac: 8,
        damage: [{ dice: '1d4', min: 1, max: 4 }],
        xp: 415,
        status: 'ALIVE',
        level: 1
      }

      // Create a group with only one alive monster
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'back',
        identified: true  // Set identified to use real monster names
      }

      const state = createCombatState([group])
      const command = CombatService.createCommand(monster, 'ADVANCE')
      const result = CombatService.executeCommand(state, command, new Set())

      expect(result.messages[0]).toBe('Kobold advances to the front row!')
    })

    it('generates correct message for multiple monsters', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      // Ensure at least 2 monsters
      while (kobolds.length < 2) {
        kobolds.push(MonsterService.createMonsterInstance('kobold'))
      }

      const group: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'back',
        identified: true  // Set identified to use real monster names
      }

      const state = createCombatState([group])
      const command = CombatService.createCommand(kobolds[0], 'ADVANCE')
      const result = CombatService.executeCommand(state, command, new Set())

      expect(result.messages[0]).toMatch(/The \w+s advance to the front row!/i)
    })

    it('handles already front row gracefully', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')

      const frontGroup: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'front'
      }

      const state = createCombatState([frontGroup])
      const command = CombatService.createCommand(kobolds[0], 'ADVANCE')
      const result = CombatService.executeCommand(state, command, new Set())

      // Should remain front and indicate already there
      expect(result.newState.monsterGroups[0].formation).toBe('front')
      expect(result.messages[0]).toContain('already')
    })
  })

  describe('checkAndAdvanceMonsters', () => {
    it('auto-advances back-row melee when front row is empty', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')

      const backRowGroup: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'back'
      }

      const state = createCombatState([backRowGroup])
      const result = CombatService.checkAndAdvanceMonsters(state)

      expect(result.newState.monsterGroups[0].formation).toBe('front')
      expect(result.message).toContain('rush forward')
    })

    it('does not advance when front row has alive monsters', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      const orcs = MonsterService.generateMonsterGroup('orc')

      const frontGroup: MonsterGroup = {
        id: 'A',
        monsters: orcs,
        formation: 'front'
      }

      const backGroup: MonsterGroup = {
        id: 'B',
        monsters: kobolds,
        formation: 'back'
      }

      const state = createCombatState([frontGroup, backGroup])
      const result = CombatService.checkAndAdvanceMonsters(state)

      // No change
      expect(result.newState.monsterGroups[1].formation).toBe('back')
      expect(result.message).toBeUndefined()
    })

    it('advances when front row is all dead', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      const orcs = MonsterService.generateMonsterGroup('orc')

      // Kill all orcs
      orcs.forEach(o => { o.hp = 0; o.status = 'DEAD' })

      const frontGroup: MonsterGroup = {
        id: 'A',
        monsters: orcs,
        formation: 'front'
      }

      const backGroup: MonsterGroup = {
        id: 'B',
        monsters: kobolds,
        formation: 'back'
      }

      const state = createCombatState([frontGroup, backGroup])
      const result = CombatService.checkAndAdvanceMonsters(state)

      expect(result.newState.monsterGroups[1].formation).toBe('front')
      expect(result.message).toBeDefined()
    })

    it('does not advance ranged monsters', () => {
      const mages = MonsterService.generateMonsterGroup('lvl_1_mage')

      const backGroup: MonsterGroup = {
        id: 'A',
        monsters: mages,
        formation: 'back'
      }

      const state = createCombatState([backGroup])
      const result = CombatService.checkAndAdvanceMonsters(state)

      // Mages stay in back (they can cast from there)
      expect(result.newState.monsterGroups[0].formation).toBe('back')
      expect(result.message).toBeUndefined()
    })

    it('advances first melee group only', () => {
      const kobolds = MonsterService.generateMonsterGroup('kobold')
      const orcs = MonsterService.generateMonsterGroup('orc')

      const backGroup1: MonsterGroup = {
        id: 'A',
        monsters: kobolds,
        formation: 'back'
      }

      const backGroup2: MonsterGroup = {
        id: 'B',
        monsters: orcs,
        formation: 'back'
      }

      const state = createCombatState([backGroup1, backGroup2])
      const result = CombatService.checkAndAdvanceMonsters(state)

      // Only first group advances
      expect(result.newState.monsterGroups[0].formation).toBe('front')
      expect(result.newState.monsterGroups[1].formation).toBe('back')
    })
  })
})
