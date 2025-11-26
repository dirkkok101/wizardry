// Test for executeCommand
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { MonsterGroup } from '@models/Combat'

describe('CombatService.executeCommand', () => {
  it('executes attack command and updates monster HP', () => {
    const attacker = createTestCharacter({ strength: 16 })
    const defender = createTestMonster({ hp: 10, maxHp: 10 })

    const monsterGroups: MonsterGroup[] = [{
      id: 'A',
      monsters: [defender],
      formation: 'front'
    }]
    const state = createTestCombatState({ monsterGroups })

    // Mock resolveAttack for predictable damage
    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: true,
      damage: 5,
      critical: false,
      message: '5 damage!'
    })

    const cmd = CombatService.createCommand(attacker, 'ATTACK', defender)
    const parryingCombatants = new Set<string>()
    const result = CombatService.executeCommand(state, cmd, parryingCombatants)

    expect(result.newState.monsterGroups[0].monsters[0].hp).toBe(5)
    // Messages are now split into action + result
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0]).toContain('attacks')
    expect(result.messages[1]).toContain('5 damage')

    jest.restoreAllMocks()
  })

  it('marks monster as DEAD when HP reaches 0', () => {
    const attacker = createTestCharacter()
    const defender = createTestMonster({ hp: 3, maxHp: 10 })

    const monsterGroups: MonsterGroup[] = [{
      id: 'A',
      monsters: [defender],
      formation: 'front'
    }]
    const state = createTestCombatState({ monsterGroups })

    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: true,
      damage: 5,
      critical: false,
      message: '5 damage!'
    })

    const cmd = CombatService.createCommand(attacker, 'ATTACK', defender)
    const parryingCombatants = new Set<string>()
    const result = CombatService.executeCommand(state, cmd, parryingCombatants)

    expect(result.newState.monsterGroups[0].monsters[0].hp).toBe(0)
    expect(result.newState.monsterGroups[0].monsters[0].status).toBe('DEAD')

    jest.restoreAllMocks()
  })
})
