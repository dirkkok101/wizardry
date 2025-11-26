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
      formation: 'front'
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
      formation: 'front'
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
})
