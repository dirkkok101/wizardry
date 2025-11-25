// Test for resolveAttack
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster } from '../../test-helpers/test-factories'

describe('CombatService.resolveAttack', () => {
  it('resolves attack with hit and damage', () => {
    const attacker = createTestCharacter({ strength: 16 })
    const defender = createTestMonster()

    // Queue random values: hit roll (low = hit), damage roll, crit roll (high = no crit)
    RandomService.queueNextValues([0.1, 0.5, 0.99])

    const result = CombatService.resolveAttack(attacker, defender)

    expect(result.hit).toBe(true)
    expect(result.damage).toBeGreaterThan(0)
    expect(result.message).toBeDefined()
  })

  it('returns miss when roll fails', () => {
    const attacker = createTestCharacter()
    const defender = createTestMonster()

    // Queue random value: hit roll (high = miss)
    RandomService.queueNextValues([0.99])

    const result = CombatService.resolveAttack(attacker, defender)

    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)
  })
})
