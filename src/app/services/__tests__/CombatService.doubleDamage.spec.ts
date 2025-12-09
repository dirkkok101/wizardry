// Test for double-damage bug when status effects are inflicted
// Bug: When a monster inflicts a status effect (poison/paralyze/stone), the code
// returns BOTH characterUpdates (with correct HP) AND targetDamage. This causes
// damage to be applied twice in executeRoundWithEvents.
//
// Also tests critical hit instant kill messaging.
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { MonsterDataLoader } from '../MonsterDataLoader'
import { CharacterResistanceService } from '../CharacterResistanceService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { MonsterGroup, CombatCommand } from '@models/Combat'
import { CharacterStatus } from '@models/CharacterStatus'

describe('CombatService.doubleDamage', () => {
  beforeEach(() => {
    // Mock MonsterDataLoader to return a monster with poison ability
    jest.spyOn(MonsterDataLoader, 'getMonster').mockReturnValue({
      id: 'poison_monster',
      name: 'Poison Snake',
      unidentifiedName: 'Snake',
      level: 1,
      resistance: { critical: 0, sleep: 0, death: 0 },
      specialAbilities: ['poison'],  // This triggers the status effect path
      groupSize: { min: 1, max: 1 },
      rewardClass: 1,
      hpDice: { count: 1, sides: 4, bonus: 0 },
      ac: 8,
      swings: 1,
      damage: [{ min: 1, max: 4 }],
      xpReward: 10,
      undead: false,
      breathWeapon: null
    })

    // Mock resistance check to always fail (character gets poisoned)
    jest.spyOn(CharacterResistanceService, 'checkResistance').mockReturnValue({
      resisted: false,
      resistChance: 10,
      breakdown: { base: 10 }
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('executeRound', () => {
    it('should NOT apply double damage when monster inflicts status effect', () => {
      // Setup: Character with 50 HP, monster deals 10 damage and inflicts poison
      const character = createTestCharacter({
        id: 'char1',
        name: 'Fighter',
        hp: 50,
        maxHp: 50,
        agility: 5  // Low agility so monster goes first
      })

      const monster = createTestMonster({
        id: 'monster1',
        monsterId: 'poison_monster',  // Matches the mocked monster
        name: 'Poison Snake',
        hp: 100,
        agility: 20  // High agility to go first
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }]
      const state = createTestCombatState({ monsterGroups })

      // Monster attacks character - only the monster attacks
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', character)
      monsterCmd.initiative = 20

      state.commandQueue = [monsterCmd]

      // Mock resolveAttack to return a controlled attack result
      // No critical hit, just a normal hit for 10 damage
      jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
        hit: true,
        damage: 10,  // Exactly 10 damage
        critical: false,
        instantKill: false,
        message: 'hits for 10 damage!'
      })

      const party = [character]
      const frontRow = ['char1']
      const result = CombatService.executeRound(state, party, frontRow)

      // The character should have taken 10 damage: 50 - 10 = 40 HP
      // BUG: Currently takes double damage (50 - 10 - 10 = 30 HP)
      const updatedChar = result.damagedCharacters.get('char1')
      expect(updatedChar).toBeDefined()

      // This assertion will FAIL with the current bug (character will have 30 HP)
      expect(updatedChar?.hp).toBe(40)

      // Should be poisoned
      expect(updatedChar?.status).toBe(CharacterStatus.POISONED)
    })
  })

  describe('executeRoundWithEvents', () => {
    it('should NOT apply double damage when monster inflicts status effect', () => {
      // Same test but for the events version
      const character = createTestCharacter({
        id: 'char1',
        name: 'Fighter',
        hp: 50,
        maxHp: 50,
        agility: 5
      })

      const monster = createTestMonster({
        id: 'monster1',
        monsterId: 'poison_monster',
        name: 'Poison Snake',
        hp: 100,
        agility: 20
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }]
      const state = createTestCombatState({ monsterGroups })

      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', character)
      monsterCmd.initiative = 20

      state.commandQueue = [monsterCmd]

      jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
        hit: true,
        damage: 10,
        critical: false,
        instantKill: false,
        message: 'hits for 10 damage!'
      })

      const party = [character]
      const frontRow = ['char1']
      const backRow: string[] = []
      const result = CombatService.executeRoundWithEvents(state, party, frontRow, backRow)

      // Check final character updates
      const updatedChar = result.finalCharacterUpdates.get('char1')
      expect(updatedChar).toBeDefined()

      // This assertion will FAIL with the current bug
      expect(updatedChar?.hp).toBe(40)
      expect(updatedChar?.status).toBe(CharacterStatus.POISONED)
    })
  })

  describe('critical hit messaging', () => {
    beforeEach(() => {
      jest.restoreAllMocks()  // Clear previous mocks

      // Mock MonsterDataLoader to return a basic monster template
      jest.spyOn(MonsterDataLoader, 'getMonster').mockReturnValue({
        id: 'orc',
        name: 'Orc',
        unidentifiedName: 'Humanoid',
        level: 1,
        resistance: { critical: 0, sleep: 0, death: 0 },
        specialAbilities: [],  // No special abilities
        groupSize: { min: 1, max: 1 },
        rewardClass: 1,
        hpDice: { count: 1, sides: 8, bonus: 0 },
        ac: 8,
        swings: 1,
        damage: [{ min: 1, max: 6 }],
        xpReward: 10,
        undead: false,
        breathWeapon: null
      })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should display "decapitates" message when monster critically kills a character', () => {
      const character = createTestCharacter({
        id: 'char1',
        name: 'Fighter',
        hp: 50,
        maxHp: 50
      })

      const monster = createTestMonster({
        id: 'monster1',
        monsterId: 'orc',  // Matches mocked monster
        name: 'Orc',
        hp: 100
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }]
      const state = createTestCombatState({ monsterGroups })

      // Mock resolveAttack to return a critical hit with instant kill
      jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
        hit: true,
        damage: 10,
        critical: true,
        instantKill: true,
        message: 'Critical hit! Fighter is slain!'  // Old message
      })

      // Mock resistance check to fail (character doesn't resist critical)
      jest.spyOn(CharacterResistanceService, 'checkResistance').mockReturnValue({
        resisted: false,
        resistChance: 10,
        breakdown: { base: 10 }
      })

      const command: CombatCommand = {
        id: 'cmd1',
        actor: monster,
        type: 'ATTACK',
        initiative: 20,
        target: character
      }

      const result = CombatService.executeCommand(state, command, new Set<string>())

      // Character should be dead
      const updatedChar = result.characterUpdates?.get('char1')
      expect(updatedChar).toBeDefined()
      expect(updatedChar?.hp).toBe(0)
      expect(updatedChar?.status).toBe(CharacterStatus.DEAD)

      // Message should clearly indicate decapitation
      // This test will FAIL until we improve the messaging
      const hasDecapitateMessage = result.messages.some(m =>
        m.toLowerCase().includes('decapitate')
      )
      expect(hasDecapitateMessage).toBe(true)
    })
  })
})
