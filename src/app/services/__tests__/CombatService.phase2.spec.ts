// Phase 2 Combat Features Tests
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { MonsterGroup } from '@models/Combat'
import { CharacterStatus } from '@models/CharacterStatus'
import { CharacterClass } from '@models/CharacterClass'
import { loadMonstersForTests } from '@testing/test-data-loader'
import { StatModifierService } from '../StatModifierService'

// Load monster data and stat modifiers (needed for combat calculations)
beforeAll(async () => {
  await Promise.all([
    loadMonstersForTests(),
    StatModifierService.initialize()
  ])
})

describe('CombatService - Phase 2 Features', () => {
  describe('Critical Hit Formula', () => {
    it('calculates critical chance as (2 × Level)% for level 1', () => {
      const attacker = createTestCharacter({ level: 1 })
      const defender = createTestMonster()

      // Queue random values: hit roll, damage roll, crit roll, monster resist roll
      RandomService.queueNextValues([0.5, 0.5, 0.01, 0.4])

      const result = CombatService.resolveAttack(attacker, defender)

      expect(result.critical).toBe(true) // 1% < 2% (level 1 = 2% crit chance)
    })

    it('calculates critical chance as (2 × Level)% for level 10', () => {
      const attacker = createTestCharacter({ level: 10 })
      const defender = createTestMonster()

      // Queue random values: hit roll, damage roll, crit roll, monster resist roll
      // Monster resist: level 1 kobold: (1+10)=11, need resistRoll > 11 for crit to land
      RandomService.queueNextValues([0.5, 0.5, 0.15, 0.4]) // 0.4 gives resistRoll ~14

      const result = CombatService.resolveAttack(attacker, defender)

      expect(result.critical).toBe(true) // 15% < 20% (level 10 = 20% crit chance)
    })

    it('caps critical chance at 50% for high levels', () => {
      const attacker = createTestCharacter({ level: 50 })
      const defender = createTestMonster()

      // Queue random values: hit roll, damage roll, crit roll, monster resist roll
      RandomService.queueNextValues([0.5, 0.5, 0.49, 0.4])

      const result = CombatService.resolveAttack(attacker, defender)

      expect(result.critical).toBe(true) // 49% < 50% (capped at 50%)
    })

    it('does not crit when roll exceeds crit chance', () => {
      const attacker = createTestCharacter({ level: 10 })
      const defender = createTestMonster()

      // Queue random values: hit roll, damage roll, crit roll (no resist roll needed - crit fails)
      RandomService.queueNextValues([0.5, 0.5, 0.25])

      const result = CombatService.resolveAttack(attacker, defender)

      expect(result.critical).toBe(false) // 25% >= 20% (no crit)
    })
  })

  describe('getAttacksPerRound', () => {
    it('Fighter gets 1 attack at level 1', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 1 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(1)
    })

    it('Fighter gets 2 attacks at level 5', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 5 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(2)
    })

    it('Fighter gets 3 attacks at level 10', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 10 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(3)
    })

    it('Lord gets 1 + floor(level/5) attacks', () => {
      const lord = createTestCharacter({ class: CharacterClass.LORD, level: 7 })
      expect(CombatService.getAttacksPerRound(lord)).toBe(2) // 1 + floor(7/5) = 2
    })

    it('Samurai gets 1 + floor(level/5) attacks', () => {
      const samurai = createTestCharacter({ class: CharacterClass.SAMURAI, level: 12 })
      expect(CombatService.getAttacksPerRound(samurai)).toBe(3) // 1 + floor(12/5) = 3
    })

    it('Ninja gets 2 + floor(level/5) attacks', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 1 })
      expect(CombatService.getAttacksPerRound(ninja)).toBe(2)
    })

    it('Ninja gets 4 attacks at level 10', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 10 })
      expect(CombatService.getAttacksPerRound(ninja)).toBe(4) // 2 + floor(10/5) = 4
    })

    it('Mage always gets 1 attack', () => {
      const mage = createTestCharacter({ class: CharacterClass.MAGE, level: 10 })
      expect(CombatService.getAttacksPerRound(mage)).toBe(1)
    })

    it('Priest always gets 1 attack', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST, level: 10 })
      expect(CombatService.getAttacksPerRound(priest)).toBe(1)
    })

    it('Bishop always gets 1 attack', () => {
      const bishop = createTestCharacter({ class: CharacterClass.BISHOP, level: 10 })
      expect(CombatService.getAttacksPerRound(bishop)).toBe(1)
    })

    it('Thief always gets 1 attack', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      expect(CombatService.getAttacksPerRound(thief)).toBe(1)
    })

    it('caps attacks at 10 maximum', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 100 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(10)
    })

    it('monsters get attacks based on damage array length', () => {
      // Default test monster has 1 damage entry
      const monsterOneAttack = createTestMonster()
      expect(CombatService.getAttacksPerRound(monsterOneAttack)).toBe(1)

      // Monster with multiple damage entries gets multiple attacks
      const monsterTwoAttacks = createTestMonster({
        damage: [
          { dice: '1d4', min: 1, max: 4 },
          { dice: '1d4', min: 1, max: 4 }
        ]
      })
      expect(CombatService.getAttacksPerRound(monsterTwoAttacks)).toBe(2)
    })
  })

  describe('PARRY Action', () => {
    it('applies -2 AC modifier when target is parrying', () => {
      const attacker = createTestCharacter({ level: 1 })
      const defender = createTestCharacter({ id: 'def', ac: 5 })

      const parryingCombatants = new Set<string>(['def'])

      // Calculate hit chance without parry
      const normalChance = CombatService.calculateHitChance(attacker, defender, 0)

      // Calculate hit chance with parry (-2 AC = harder to hit)
      const parryChance = CombatService.calculateHitChance(attacker, defender, -2)

      expect(parryChance).toBeLessThan(normalChance)
      expect(parryChance).toBe(normalChance - 10) // -2 AC × 5% = -10%
    })

    it('executes parry command and tracks parrying combatant', () => {
      const char = createTestCharacter({ id: 'c1', name: 'Fighter' })
      const state = createTestCombatState()
      const parryingCombatants = new Set<string>()

      const cmd = CombatService.createCommand(char, 'PARRY')
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // Messages are now returned as an array
      expect(result.messages[0]).toContain('Fighter')
      expect(result.messages[0]).toContain('defensive stance')
      expect(parryingCombatants.has('c1')).toBe(true)
    })
  })

  describe('RUN/Flee Mechanics', () => {
    it('calculates flee chance using authentic Apple II formula', () => {
      // Authentic formula: 39% - (MazeLevel × 3%) + small party bonus
      const monster = createTestMonster()
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      // Default dungeonLevel = 1
      const state = createTestCombatState({ canFlee: true, monsterGroups })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      // Level 1: 39 - 3 = 36% + 15% small party (1 member) = 51%
      expect(chance).toBe(51)
    })

    it('returns 0% flee chance for boss fights', () => {
      const state = createTestCombatState({ canFlee: false })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      expect(chance).toBe(0)
    })

    // Note: Tests updated to authentic Apple II formula: 39% - (MazeLevel × 3%)
    // with small party bonus. Comprehensive flee tests in CombatService.flee.spec.ts

    it('calculates flee chance based on dungeon level (authentic formula)', () => {
      // Level 1: 39% - (1 × 3) = 36% + small party bonus 15% = 51%
      const monster = createTestMonster()
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ canFlee: true, monsterGroups, dungeonLevel: 1 })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      // 36% base + 15% small party (1 member) = 51%
      expect(chance).toBe(51)
    })

    it('reduces flee chance on deeper dungeon levels', () => {
      const monster = createTestMonster()
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ canFlee: true, monsterGroups, dungeonLevel: 5 })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      // Level 5: 39 - (5 × 3) = 24% + 15% small party = 39%
      expect(chance).toBe(39)
    })

    it('adds small party bonus for <= 3 members', () => {
      const monster = createTestMonster()
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ canFlee: true, monsterGroups, dungeonLevel: 1 })

      // 2 members: +10% bonus
      const party2 = [
        createTestCharacter({ id: 'c1' }),
        createTestCharacter({ id: 'c2' })
      ]
      const fleeingIds = new Set<string>(['c1', 'c2'])
      const chance2 = CombatService.calculateFleeChance(state, party2, fleeingIds)
      // 36% base + 10% small party (2 members) = 46%
      expect(chance2).toBe(46)
    })

    it('no small party bonus for > 3 members', () => {
      const monster = createTestMonster()
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ canFlee: true, monsterGroups, dungeonLevel: 1 })

      // 4 members: no bonus
      const party4 = [
        createTestCharacter({ id: 'c1' }),
        createTestCharacter({ id: 'c2' }),
        createTestCharacter({ id: 'c3' }),
        createTestCharacter({ id: 'c4' })
      ]
      const fleeingIds = new Set<string>(['c1', 'c2', 'c3', 'c4'])
      const chance4 = CombatService.calculateFleeChance(state, party4, fleeingIds)
      // 36% base only, no small party bonus
      expect(chance4).toBe(36)
    })

    it('returns 0% if no characters fleeing', () => {
      const state = createTestCombatState({ canFlee: true })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>()

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      expect(chance).toBe(0)
    })

    it('executes run command successfully', () => {
      const char = createTestCharacter({ id: 'c1', name: 'Fighter' })
      const state = createTestCombatState()

      const cmd = CombatService.createCommand(char, 'RUN')
      const result = CombatService.executeCommand(state, cmd, new Set())

      // Messages are now returned as an array
      expect(result.messages[0]).toContain('Fighter')
      expect(result.messages[0]).toContain('flee')
    })

    it('successfully flees when all characters select RUN and roll succeeds', () => {
      const char = createTestCharacter({ id: 'c1', hp: 100, agility: 10, luck: 10 })
      const monster = createTestMonster({ hp: 100, agility: 10 })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ monsterGroups, canFlee: true })

      const runCmd = CombatService.createCommand(char, 'RUN')
      state.commandQueue = [runCmd]

      // Mock random to ensure flee success (roll < 50%)
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.3) // 30% roll < 50% flee chance

      const result = CombatService.executeRound(state, [char], [char.id])

      expect(result.fled).toBe(true)
      expect(result.victory).toBe(false)
      expect(result.defeat).toBe(false)
      expect(result.messages.some(m => m.includes('successfully flees'))).toBe(true)

      Math.random = originalRandom
    })

    it('fails to flee when roll fails', () => {
      const char = createTestCharacter({ id: 'c1', hp: 100, agility: 10, luck: 10 })
      const monster = createTestMonster({ hp: 100, agility: 10 })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ monsterGroups, canFlee: true })

      const runCmd = CombatService.createCommand(char, 'RUN')
      state.commandQueue = [runCmd]

      // Mock random to ensure flee failure (roll >= 50%)
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.7) // 70% roll >= 50% flee chance

      const result = CombatService.executeRound(state, [char], [char.id])

      expect(result.fled).toBe(false)
      expect(result.messages.some(m => m.includes('fails to escape'))).toBe(true)

      Math.random = originalRandom
    })

    it('applies flee failure penalty - monsters get free attacks', () => {
      const char = createTestCharacter({ id: 'c1', hp: 100, agility: 10, luck: 10 })
      const monster = createTestMonster({ hp: 100, agility: 10, attack: 5, damage: '1d6' })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }]
      const state = createTestCombatState({ monsterGroups, canFlee: true })

      const runCmd = CombatService.createCommand(char, 'RUN')
      state.commandQueue = [runCmd]

      // Mock random to ensure flee failure (roll >= 50%)
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.7)

      const result = CombatService.executeRound(state, [char], [char.id])

      expect(result.fled).toBe(false)
      expect(result.messages.some(m => m.includes('fails to escape'))).toBe(true)
      // Should have penalty attack message
      expect(result.messages.some(m => m.includes('take advantage'))).toBe(true)
      // Monster should have attacked
      expect(result.messages.some(m => m.includes(monster.name) && m.includes('attacks'))).toBe(true)

      Math.random = originalRandom
    })

    it('executeFleeFailurePenalty targets characters in front row', () => {
      const frontChar = createTestCharacter({ id: 'c1', hp: 50, agility: 10, luck: 10 })
      const backChar = createTestCharacter({ id: 'c2', hp: 50, agility: 10, luck: 10 })
      const monster = createTestMonster({ hp: 100, agility: 10, attack: 10, damage: '1d6' })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ monsterGroups, canFlee: true })

      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.1) // Make attacks hit

      const result = CombatService.executeFleeFailurePenalty(
        state,
        [frontChar, backChar],
        [frontChar.id] // Only frontChar is in front row
      )

      // Should attack front row first
      expect(result.messages.some(m => m.includes('take advantage'))).toBe(true)
      // Monster should have attacked the front row character
      expect(result.messages.some(m => m.includes(frontChar.name))).toBe(true)

      Math.random = originalRandom
    })

    it('successfully flees when character dies mid-round before RUN command executes', () => {
      // Bug test: When all characters select RUN but one dies before their turn,
      // the surviving characters should still successfully flee

      // Character 1: low HP, low agility (low initiative, will die before RUN)
      const char1 = createTestCharacter({
        id: 'c1',
        name: 'Victim',
        hp: 1,
        maxHp: 10,
        agility: 1, // Low agility = low initiative
        luck: 10
      })

      // Character 2: high HP, high agility (high initiative, RUN executes first)
      const char2 = createTestCharacter({
        id: 'c2',
        name: 'Survivor',
        hp: 100,
        maxHp: 100,
        agility: 20, // High agility = high initiative
        luck: 10
      })

      // Monster with medium agility that will attack before char1's RUN
      const monster = createTestMonster({
        hp: 100,
        agility: 10, // Initiative between char1 and char2
        attack: 100, // High attack to guarantee hit
        damage: [{ dice: '10d6', min: 10, max: 60 }] // High damage to guarantee kill
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ monsterGroups, canFlee: true })

      // Use seed for deterministic random - easier than counting exact queue positions
      // Seed 42 produces a sequence that gives us the behavior we need
      RandomService.setSeed(42)

      // Create RUN commands for both characters
      const runCmd1 = CombatService.createCommand(char1, 'RUN')
      const runCmd2 = CombatService.createCommand(char2, 'RUN')

      // Create monster attack command targeting char1
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', char1)

      // Set explicit initiatives to ensure correct order
      // char2 RUN (high init) -> monster attack (med init) -> char1 RUN (low init, will be dead)
      runCmd2.initiative = 20
      monsterCmd.initiative = 10
      runCmd1.initiative = 1

      state.commandQueue = [runCmd1, runCmd2, monsterCmd]

      const party = [char1, char2]
      const frontRow = [char1.id, char2.id]

      const result = CombatService.executeRound(state, party, frontRow)

      // char1 should be dead from monster attack
      const char1Update = result.damagedCharacters.get(char1.id)
      expect(char1Update).toBeDefined()
      expect(char1Update!.hp).toBeLessThanOrEqual(0)

      // The key assertion: flee should succeed because char2 (the only survivor) selected RUN
      expect(result.fled).toBe(true)
      expect(result.messages.some(m => m.includes('successfully flees'))).toBe(true)
    })
  })
})
