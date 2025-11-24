// src/services/__tests__/Combat.e2e.spec.ts
import { MonsterService } from '../MonsterService'
import { CombatService } from '../CombatService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('Combat E2E Flow', () => {
  it('completes full combat from encounter to victory', async () => {
    // 1. Initialize combat
    const party = [
      createTestCharacter({ id: 'fighter', name: 'Conan', strength: 16, hp: 20, maxHp: 20 }),
      createTestCharacter({ id: 'mage', name: 'Gandalf', intelligence: 16, hp: 8, maxHp: 8 })
    ]
    const state = await CombatService.initiateCombat('kobold', party, true)

    // 2. Verify initial state
    expect(state.roundNumber).toBe(1)
    expect(state.canFlee).toBe(true)
    const initialMonsters = CombatService.getAllMonsters(state)
    expect(initialMonsters.length).toBeGreaterThanOrEqual(3)
    expect(initialMonsters.length).toBeLessThanOrEqual(8)

    // 3. Simulate multiple rounds until victory
    let currentState = state
    let roundCount = 0
    const maxRounds = 20

    while (roundCount < maxRounds) {
      // Get alive monsters
      const aliveMonsters = CombatService.getAllAliveMonsters(currentState)

      if (aliveMonsters.length === 0) {
        // Victory!
        break
      }

      // Create party commands - all attack first monster
      const partyCommands = party.map(char =>
        CombatService.createCommand(char, 'ATTACK', aliveMonsters[0])
      )

      // Create monster commands
      const monsterCommands = aliveMonsters.map(m =>
        CombatService.selectMonsterAction(m, party, ['fighter'])
      )

      // Execute round
      currentState.commandQueue = [...partyCommands, ...monsterCommands]
      const result = CombatService.executeRound(currentState, party)
      currentState = result.newState

      // Check for victory
      if (result.victory) {
        const allMonsters = CombatService.getAllMonsters(currentState)
        expect(allMonsters.every(m => m.status === 'DEAD')).toBe(true)
        expect(result.messages.length).toBeGreaterThan(0)
        return
      }

      if (result.defeat) {
        fail('Party should not be defeated in this test')
        return
      }

      roundCount++
    }

    fail(`Combat did not resolve within ${maxRounds} rounds`)
  })

  it('tracks fixed encounter correctly', async () => {
    const party = [createTestCharacter({ strength: 18, hp: 30, maxHp: 30 })]
    const state = await CombatService.initiateCombat('kobold', party, false)

    // Verify fixed encounter (cannot flee)
    expect(state.canFlee).toBe(false)

    // Simulate instant victory by setting all monsters to dead
    const deadMonsterGroups = state.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(m => ({ ...m, hp: 0, status: 'DEAD' as const }))
    }))
    const victoryState = { ...state, monsterGroups: deadMonsterGroups, commandQueue: [] }
    const result = CombatService.executeRound(victoryState, party)

    expect(result.victory).toBe(true)
    expect(result.defeat).toBe(false)
  })
})
