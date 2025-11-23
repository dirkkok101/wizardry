// Test for monster AI
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster, createTestGameStateWithCombat } from '../../test-helpers/test-factories'
import { CharacterStatus } from '../../types/CharacterStatus'

describe('CombatService - Monster AI', () => {
  describe('selectMonsterAction', () => {
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

    it('skips asleep front row members', () => {
      const monster = createTestMonster()
      const asleepChar = createTestCharacter({ id: 'front1', hp: 10, status: CharacterStatus.ASLEEP })
      const backChar = createTestCharacter({ id: 'back1', hp: 8 })
      const party = [asleepChar, backChar]
      const frontRow = ['front1']

      const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

      // Should target back row since front row is asleep
      expect(cmd.target).toBe(backChar)
    })

    it('skips paralyzed characters', () => {
      const monster = createTestMonster()
      const paralyzedChar = createTestCharacter({ id: 'front1', hp: 10, status: CharacterStatus.PARALYZED })
      const backChar = createTestCharacter({ id: 'back1', hp: 8 })
      const party = [paralyzedChar, backChar]
      const frontRow = ['front1']

      const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

      expect(cmd.target).toBe(backChar)
    })

    it('returns PARRY command if no valid targets', () => {
      const monster = createTestMonster()
      const deadChar = createTestCharacter({ id: 'char1', hp: 0, status: CharacterStatus.DEAD })
      const party = [deadChar]
      const frontRow = ['char1']

      const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

      expect(cmd.type).toBe('PARRY')
    })

    describe('Targeting AI by Monster Level', () => {
      it('level 1-2 monsters use random targeting', () => {
        const monster = createTestMonster({ level: 1 })
        const char1 = createTestCharacter({ id: 'c1', hp: 5, maxHp: 20 }) // 25% HP
        const char2 = createTestCharacter({ id: 'c2', hp: 15, maxHp: 20 }) // 75% HP
        const party = [char1, char2]
        const frontRow = ['c1', 'c2']

        // Run multiple times to verify it's random
        const targets = new Set<string>()
        for (let i = 0; i < 20; i++) {
          const cmd = CombatService.selectMonsterAction(monster, party, frontRow)
          targets.add((cmd.target as any).id)
        }

        // Both characters should be targeted at least once (random distribution)
        // This test might rarely fail due to randomness, but should pass >99% of the time
        expect(targets.size).toBeGreaterThan(1)
      })

      it('level 3-5 monsters target weakest HP%', () => {
        const monster = createTestMonster({ level: 4 })
        const weakChar = createTestCharacter({ id: 'weak', hp: 5, maxHp: 20 }) // 25% HP
        const strongChar = createTestCharacter({ id: 'strong', hp: 18, maxHp: 20 }) // 90% HP
        const party = [weakChar, strongChar]
        const frontRow = ['weak', 'strong']

        const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

        // Should always target the weakest
        expect(cmd.target).toBe(weakChar)
      })

      it('level 6+ monsters prefer spellcasters', () => {
        const monster = createTestMonster({ level: 7 })
        const fighter = createTestCharacter({ id: 'fighter', class: 'Fighter', hp: 20, maxHp: 20 })
        const mage = createTestCharacter({ id: 'mage', class: 'Mage', hp: 15, maxHp: 15 })
        const party = [fighter, mage]
        const frontRow = ['fighter', 'mage']

        const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

        // Should target mage even though fighter is in front
        expect(cmd.target).toBe(mage)
      })

      it('level 6+ monsters target weakest spellcaster among multiple', () => {
        const monster = createTestMonster({ level: 8 })
        const priest = createTestCharacter({ id: 'priest', class: 'Priest', hp: 10, maxHp: 10 }) // 100% HP
        const mage = createTestCharacter({ id: 'mage', class: 'Mage', hp: 3, maxHp: 10 }) // 30% HP
        const party = [priest, mage]
        const frontRow = ['priest', 'mage']

        const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

        // Should target the weaker mage
        expect(cmd.target).toBe(mage)
      })

      it('level 6+ monsters fall back to weakest HP% if no spellcasters', () => {
        const monster = createTestMonster({ level: 9 })
        const fighter1 = createTestCharacter({ id: 'f1', class: 'Fighter', hp: 5, maxHp: 20 }) // 25% HP
        const fighter2 = createTestCharacter({ id: 'f2', class: 'Fighter', hp: 18, maxHp: 20 }) // 90% HP
        const party = [fighter1, fighter2]
        const frontRow = ['f1', 'f2']

        const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

        // Should target weakest fighter
        expect(cmd.target).toBe(fighter1)
      })
    })
  })

  describe('canCombatantAct', () => {
    it('alive monster can act', () => {
      const monster = createTestMonster({ status: 'ALIVE', hp: 10 })
      expect(CombatService.canCombatantAct(monster)).toBe(true)
    })

    it('dead monster cannot act', () => {
      const monster = createTestMonster({ status: 'DEAD', hp: 0 })
      expect(CombatService.canCombatantAct(monster)).toBe(false)
    })

    it('asleep monster cannot act', () => {
      const monster = createTestMonster({ status: 'ASLEEP', hp: 10 })
      expect(CombatService.canCombatantAct(monster)).toBe(false)
    })

    it('paralyzed monster cannot act', () => {
      const monster = createTestMonster({ status: 'PARALYZED', hp: 10 })
      expect(CombatService.canCombatantAct(monster)).toBe(false)
    })

    it('alive character can act', () => {
      const char = createTestCharacter({ hp: 10, status: CharacterStatus.OK })
      expect(CombatService.canCombatantAct(char)).toBe(true)
    })

    it('dead character cannot act', () => {
      const char = createTestCharacter({ hp: 0, status: CharacterStatus.DEAD })
      expect(CombatService.canCombatantAct(char)).toBe(false)
    })

    it('asleep character cannot act', () => {
      const char = createTestCharacter({ hp: 10, status: CharacterStatus.ASLEEP })
      expect(CombatService.canCombatantAct(char)).toBe(false)
    })

    it('paralyzed character cannot act', () => {
      const char = createTestCharacter({ hp: 10, status: CharacterStatus.PARALYZED })
      expect(CombatService.canCombatantAct(char)).toBe(false)
    })
  })

  describe('getAllActingMonsters', () => {
    it('returns only alive monsters', () => {
      const state = createTestGameStateWithCombat({}).combat!

      // Set first monster ALIVE, rest DEAD
      state.monsterGroups[0].monsters.forEach((m, idx) => {
        if (idx === 0) {
          m.status = 'ALIVE'
          m.hp = 10
        } else {
          m.status = 'DEAD'
          m.hp = 0
        }
      })

      const acting = CombatService.getAllActingMonsters(state)

      expect(acting.length).toBe(1)
      expect(acting[0].status).toBe('ALIVE')
    })

    it('excludes asleep monsters', () => {
      const state = createTestGameStateWithCombat({}).combat!

      // Set one monster asleep
      state.monsterGroups[0].monsters[0].status = 'ASLEEP'
      state.monsterGroups[0].monsters[0].hp = 10

      const acting = CombatService.getAllActingMonsters(state)

      // Should not include asleep monster
      expect(acting.every(m => m.status === 'ALIVE')).toBe(true)
      expect(acting.find(m => m.id === state.monsterGroups[0].monsters[0].id)).toBeUndefined()
    })

    it('excludes paralyzed monsters', () => {
      const state = createTestGameStateWithCombat({}).combat!

      // Set one monster paralyzed
      state.monsterGroups[0].monsters[0].status = 'PARALYZED'
      state.monsterGroups[0].monsters[0].hp = 10

      const acting = CombatService.getAllActingMonsters(state)

      // Should not include paralyzed monster
      expect(acting.find(m => m.id === state.monsterGroups[0].monsters[0].id)).toBeUndefined()
    })
  })
})
