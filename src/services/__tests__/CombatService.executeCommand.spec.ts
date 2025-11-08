// Test for executeCommand
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '../../test-helpers/test-factories'

describe('CombatService.executeCommand', () => {
  it('executes attack command and updates monster HP', () => {
    const attacker = createTestCharacter({ strength: 16 })
    const defender = createTestMonster({ hp: 10, maxHp: 10 })
    const state = createTestCombatState({ monsters: [defender] })

    // Mock resolveAttack for predictable damage
    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: true,
      damage: 5,
      critical: false,
      message: '5 damage!'
    })

    const cmd = CombatService.createCommand(attacker, 'ATTACK', defender)
    const result = CombatService.executeCommand(state, cmd)

    expect(result.newState.monsters[0].hp).toBe(5)
    expect(result.message).toContain('5 damage')

    jest.restoreAllMocks()
  })

  it('marks monster as DEAD when HP reaches 0', () => {
    const attacker = createTestCharacter()
    const defender = createTestMonster({ hp: 3, maxHp: 10 })
    const state = createTestCombatState({ monsters: [defender] })

    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: true,
      damage: 5,
      critical: false,
      message: '5 damage!'
    })

    const cmd = CombatService.createCommand(attacker, 'ATTACK', defender)
    const result = CombatService.executeCommand(state, cmd)

    expect(result.newState.monsters[0].hp).toBe(0)
    expect(result.newState.monsters[0].status).toBe('DEAD')

    jest.restoreAllMocks()
  })
})
