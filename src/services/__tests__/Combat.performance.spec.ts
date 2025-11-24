// src/services/__tests__/Combat.performance.spec.ts
import { MonsterService } from '../MonsterService'
import { CombatService } from '../CombatService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('Combat Performance', () => {
  it('executes combat round in <100ms', async () => {
    const party = Array.from({ length: 6 }, (_, i) =>
      createTestCharacter({ id: `char${i}`, name: `Hero${i}`, hp: 100 })
    )
    const state = await CombatService.initiateCombat('kobold', party, true)
    const monsters = CombatService.getAllMonsters(state)

    // Create commands
    const partyCommands = party.map(c => CombatService.createCommand(c, 'ATTACK', monsters[0]))
    const monsterCommands = monsters.map(m =>
      CombatService.selectMonsterAction(m, party, ['char0', 'char1', 'char2'])
    )

    state.commandQueue = [...partyCommands, ...monsterCommands]

    // Measure execution time
    const start = performance.now()
    CombatService.executeRound(state, party)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)  // <100ms per round
  })

  it('generates monster group in <50ms', () => {
    const start = performance.now()
    MonsterService.generateMonsterGroup('kobold')
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50)
  })

  it('calculates initiative for 11 combatants in <10ms', () => {
    const combatants = [
      ...Array.from({ length: 6 }, () => createTestCharacter()),
      ...MonsterService.generateMonsterGroup('kobold')
    ]

    const start = performance.now()
    combatants.forEach(c => CombatService.calculateInitiative(c))
    const duration = performance.now() - start

    expect(duration).toBeLessThan(10)
  })
})
