// Test for executeRound
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { MonsterGroup } from '@models/Combat'

describe('CombatService.executeRound', () => {
  it('executes commands in initiative order', () => {
    const char1 = createTestCharacter({ id: 'c1', name: 'Fighter', hp: 100 })
    const char2 = createTestCharacter({ id: 'c2', name: 'Mage', hp: 100 })
    const monster = createTestMonster({ name: 'Kobold', hp: 100 }) // High HP so doesn't die

    const monsterGroups: MonsterGroup[] = [{
      id: 'A',
      monsters: [monster],
      formation: 'front',
      identified: true
    }]
    const state = createTestCombatState({ monsterGroups })

    const cmd1 = CombatService.createCommand(char1, 'ATTACK', monster)
    cmd1.initiative = 5
    const cmd2 = CombatService.createCommand(char2, 'ATTACK', monster)
    cmd2.initiative = 10
    const cmd3 = CombatService.createCommand(monster, 'ATTACK', char1)
    cmd3.initiative = 7

    state.commandQueue = [cmd1, cmd2, cmd3]

    const party = [char1, char2]
    const result = CombatService.executeRound(state, party)

    // Should execute in order: cmd2 (10), cmd3 (7), cmd1 (5)
    // Each action produces 2 messages (action + result), so 6 total
    expect(result.messages).toHaveLength(6)
    // First action (Mage attacks - highest initiative)
    expect(result.messages[0]).toContain('Mage')
    expect(result.messages[0]).toContain('attacks')
    // Second action (Kobold attacks)
    expect(result.messages[2]).toContain('Kobold')
    expect(result.messages[2]).toContain('attacks')
    // Third action (Fighter attacks - lowest initiative)
    expect(result.messages[4]).toContain('Fighter')
    expect(result.messages[4]).toContain('attacks')
  })

  it('detects victory when all monsters dead', () => {
    const char = createTestCharacter({ hp: 100 })
    const monster = createTestMonster({ hp: 1 })

    const monsterGroups: MonsterGroup[] = [{
      id: 'A',
      monsters: [monster],
      formation: 'front',
      identified: true
    }]
    const state = createTestCombatState({ monsterGroups })

    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: true,
      damage: 10,
      critical: false,
      message: '10 damage!'
    })

    const cmd = CombatService.createCommand(char, 'ATTACK', monster)
    state.commandQueue = [cmd]

    const party = [char]
    const result = CombatService.executeRound(state, party)

    expect(result.victory).toBe(true)
    expect(result.defeat).toBe(false)

    jest.restoreAllMocks()
  })

  it('increments round number', () => {
    const state = createTestCombatState({ roundNumber: 3, commandQueue: [] })
    const party = [createTestCharacter()]

    const result = CombatService.executeRound(state, party)

    expect(result.newState.roundNumber).toBe(4)
  })

  describe('dead combatant command skipping', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('skips monster commands when monster dies during the round', () => {
      // Setup: Fighter with high initiative kills monster, monster has lower initiative
      const fighter = createTestCharacter({ id: 'fighter', name: 'Fighter', hp: 100, agility: 20 })
      const monster1 = createTestMonster({ id: 'monster1', name: 'Kobold', hp: 5, agility: 5 })
      const monster2 = createTestMonster({ id: 'monster2', name: 'Goblin', hp: 100, agility: 5 })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster1, monster2],
        formation: 'front',
        identified: true
      }]
      const state = createTestCombatState({ monsterGroups })

      // Fighter attacks monster1 (will kill it with mocked damage)
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster1)
      fighterCmd.initiative = 20  // Goes first

      // Monster1 attacks fighter (should be skipped because it dies first)
      const monsterCmd = CombatService.createCommand(monster1, 'ATTACK', fighter)
      monsterCmd.initiative = 5   // Goes after fighter

      state.commandQueue = [fighterCmd, monsterCmd]

      // Mock resolveAttack to ensure fighter kills monster1
      jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
        hit: true,
        damage: 100,  // Overkill
        critical: false,
        message: '100 damage!'
      })

      const party = [fighter]
      const result = CombatService.executeRound(state, party)

      // Should have 2 messages for fighter's attack (attack + result)
      // Monster's command should be skipped entirely - no messages for its attack
      expect(result.messages.length).toBe(2)
      expect(result.messages[0]).toContain('Fighter')
      expect(result.messages[0]).toContain('attacks')

      // Verify monster1 is dead in the final state
      const deadMonster = result.newState.monsterGroups[0].monsters.find(m => m.id === 'monster1')
      expect(deadMonster?.status).toBe('DEAD')
      expect(deadMonster?.hp).toBeLessThanOrEqual(0)
    })

    it('skips character commands when character dies during the round', () => {
      // Setup: Monster with high initiative kills character, character has lower initiative
      const fighter = createTestCharacter({ id: 'fighter', name: 'Fighter', hp: 5, agility: 5 })
      const monster = createTestMonster({ id: 'monster1', name: 'Kobold', hp: 100, agility: 20 })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }]
      const state = createTestCombatState({ monsterGroups })

      // Monster attacks fighter (will kill it)
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)
      monsterCmd.initiative = 20  // Goes first

      // Fighter attacks monster (should be skipped because fighter dies first)
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      fighterCmd.initiative = 5   // Goes after monster

      state.commandQueue = [monsterCmd, fighterCmd]

      // Mock resolveAttack to ensure monster kills fighter
      jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
        hit: true,
        damage: 100,  // Overkill
        critical: false,
        message: '100 damage!'
      })

      const party = [fighter]
      const result = CombatService.executeRound(state, party)

      // Should have 2 messages for monster's attack (attack + result)
      // Fighter's command should be skipped entirely - no messages for its attack
      expect(result.messages.length).toBe(2)
      expect(result.messages[0]).toContain('Kobold')
      expect(result.messages[0]).toContain('attacks')

      // Verify fighter is dead (tracked in damagedCharacters)
      expect(result.damagedCharacters.get('fighter')?.hp).toBeLessThanOrEqual(0)
    })

    it('allows surviving monsters to still attack after another monster dies', () => {
      // Setup: Fighter kills monster1 (low HP), but monster2 should still attack
      const fighter = createTestCharacter({ id: 'fighter', name: 'Fighter', hp: 100, agility: 15 })
      // Monster1 has 1 HP so any damage kills it
      const monster1 = createTestMonster({ id: 'monster1', name: 'Kobold', hp: 1, agility: 5 })
      const monster2 = createTestMonster({ id: 'monster2', name: 'Goblin', hp: 100, agility: 18 })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster1, monster2],
        formation: 'front',
        identified: true
      }]
      const state = createTestCombatState({ monsterGroups })

      // Monster2 attacks first (highest initiative)
      const monster2Cmd = CombatService.createCommand(monster2, 'ATTACK', fighter)
      monster2Cmd.initiative = 18

      // Fighter attacks monster1 (kills it - monster1 has only 1 HP)
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster1)
      fighterCmd.initiative = 15

      // Monster1 attacks fighter (should be skipped - it's dead)
      const monster1Cmd = CombatService.createCommand(monster1, 'ATTACK', fighter)
      monster1Cmd.initiative = 5

      state.commandQueue = [monster2Cmd, fighterCmd, monster1Cmd]

      // All attacks hit for 5 damage - enough to kill 1 HP monster
      jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
        hit: true,
        damage: 5,
        critical: false,
        message: '5 damage!'
      })

      const party = [fighter]
      const result = CombatService.executeRound(state, party)

      // Should have 4 messages total:
      // 2 for monster2's attack, 2 for fighter's attack
      // Monster1's attack should be skipped
      expect(result.messages.length).toBe(4)

      // Verify order: Goblin attacks first, then Fighter
      expect(result.messages[0]).toContain('Goblin')
      expect(result.messages[2]).toContain('Fighter')

      // Verify monster1 is dead
      const deadMonster = result.newState.monsterGroups[0].monsters.find(m => m.id === 'monster1')
      expect(deadMonster?.status).toBe('DEAD')
    })
  })
})
