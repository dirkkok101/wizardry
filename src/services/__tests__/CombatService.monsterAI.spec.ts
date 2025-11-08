// Test for monster AI
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster } from '../../test-helpers/test-factories'
import { CharacterStatus } from '../../types/CharacterStatus'

describe('CombatService.selectMonsterAction', () => {
  it('selects attack on random front row member', () => {
    const monster = createTestMonster()
    const frontChar = createTestCharacter({ id: 'front1', hp: 10 })
    const backChar = createTestCharacter({ id: 'back1', hp: 8 })
    const party = [frontChar, backChar]
    const frontRow = ['front1']

    const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

    expect(cmd.actor).toBe(monster)
    expect(cmd.type).toBe('ATTACK')
    expect(cmd.target).toBe(frontChar)
    expect(cmd.initiative).toBeGreaterThanOrEqual(1)
  })

  it('attacks back row when front row is dead', () => {
    const monster = createTestMonster()
    const frontChar = createTestCharacter({ id: 'front1', hp: 0, status: CharacterStatus.DEAD })
    const backChar = createTestCharacter({ id: 'back1', hp: 8 })
    const party = [frontChar, backChar]
    const frontRow = ['front1']

    const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

    expect(cmd.target).toBe(backChar)
  })
})
