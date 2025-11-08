// Test for resolveAttack
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster } from '../../test-helpers/test-factories'

describe('CombatService.resolveAttack', () => {
  it('resolves attack with hit and damage', () => {
    const attacker = createTestCharacter({ strength: 16 })
    const defender = createTestMonster()

    // Mock Math.random for predictable test
    const originalRandom = Math.random
    Math.random = jest.fn(() => 0.5) // Mid-range roll

    const result = CombatService.resolveAttack(attacker, defender)

    expect(result.hit).toBe(true)
    expect(result.damage).toBeGreaterThan(0)
    expect(result.message).toBeDefined()

    Math.random = originalRandom
  })

  it('returns miss when roll fails', () => {
    const attacker = createTestCharacter()
    const defender = createTestMonster()

    const originalRandom = Math.random
    Math.random = jest.fn(() => 0.99) // Very high roll = miss

    const result = CombatService.resolveAttack(attacker, defender)

    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)

    Math.random = originalRandom
  })
})
