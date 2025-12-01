// src/app/services/__tests__/CombatService.multipleAttacks.spec.ts
import { CombatService } from '../CombatService'
import { createTestMonster, createTestCharacter } from '@testing/test-factories'

describe('CombatService - Monster Multiple Attacks', () => {
  describe('getAttacksPerRound - monsters', () => {
    it('returns attack count based on damage array length', () => {
      // Greater Demon has 5 damage entries = 5 attacks
      const greaterDemon = createTestMonster({
        monsterId: 'greater_demon',
        name: 'Greater Demon',
        damage: [
          { dice: '2d12', min: 2, max: 24 },
          { dice: '1d6', min: 1, max: 6 },
          { dice: '1d4', min: 1, max: 4 },
          { dice: '1d4', min: 1, max: 4 },
          { dice: '1d4', min: 1, max: 4 }
        ]
      })

      expect(CombatService.getAttacksPerRound(greaterDemon)).toBe(5)
    })

    it('returns 2 attacks for monster with 2 damage entries', () => {
      // Kobold has 2 damage entries = 2 attacks
      const kobold = createTestMonster({
        monsterId: 'kobold',
        name: 'Kobold',
        damage: [
          { dice: '1d2+1', min: 2, max: 3 },
          { dice: '1d2+1', min: 2, max: 3 }
        ]
      })

      expect(CombatService.getAttacksPerRound(kobold)).toBe(2)
    })

    it('returns 1 attack for monster with single damage entry', () => {
      const orc = createTestMonster({
        monsterId: 'orc',
        name: 'Orc',
        damage: [{ dice: '1d8', min: 1, max: 8 }]
      })

      expect(CombatService.getAttacksPerRound(orc)).toBe(1)
    })

    it('returns 1 attack for monster with no damage array', () => {
      const monster = createTestMonster({
        damage: []
      })

      expect(CombatService.getAttacksPerRound(monster)).toBe(1)
    })
  })

  describe('expandAttackCommands - monsters', () => {
    it('expands monster ATTACK command into multiple attacks', () => {
      const greaterDemon = createTestMonster({
        id: 'demon-1',
        monsterId: 'greater_demon',
        name: 'Greater Demon',
        damage: [
          { dice: '2d12', min: 2, max: 24 },
          { dice: '1d6', min: 1, max: 6 },
          { dice: '1d4', min: 1, max: 4 },
          { dice: '1d4', min: 1, max: 4 },
          { dice: '1d4', min: 1, max: 4 }
        ]
      })

      const target = createTestCharacter({ id: 'fighter' })
      const command = CombatService.createCommand(greaterDemon, 'ATTACK', [target])

      const expanded = CombatService.expandAttackCommands([command])

      expect(expanded).toHaveLength(5)
      expect(expanded[0].id).toBe(command.id + '_0')
      expect(expanded[1].id).toBe(command.id + '_1')
      expect(expanded[2].id).toBe(command.id + '_2')
      expect(expanded[3].id).toBe(command.id + '_3')
      expect(expanded[4].id).toBe(command.id + '_4')

      // All expanded commands should have same actor and target
      expanded.forEach(cmd => {
        expect(cmd.actor).toBe(greaterDemon)
        expect(cmd.target).toEqual([target])
        expect(cmd.type).toBe('ATTACK')
      })
    })

    it('expands monster with 2 attacks into 2 commands', () => {
      const kobold = createTestMonster({
        id: 'kobold-1',
        monsterId: 'kobold',
        damage: [
          { dice: '1d2+1', min: 2, max: 3 },
          { dice: '1d2+1', min: 2, max: 3 }
        ]
      })

      const target = createTestCharacter({ id: 'fighter' })
      const command = CombatService.createCommand(kobold, 'ATTACK', [target])

      const expanded = CombatService.expandAttackCommands([command])

      expect(expanded).toHaveLength(2)
      expect(expanded[0].id).toBe(command.id + '_0')
      expect(expanded[1].id).toBe(command.id + '_1')
    })

    it('does not expand monster with 1 attack', () => {
      const orc = createTestMonster({
        id: 'orc-1',
        monsterId: 'orc',
        damage: [{ dice: '1d8', min: 1, max: 8 }]
      })

      const target = createTestCharacter({ id: 'fighter' })
      const command = CombatService.createCommand(orc, 'ATTACK', [target])

      const expanded = CombatService.expandAttackCommands([command])

      expect(expanded).toHaveLength(1)
      expect(expanded[0].id).toBe(command.id) // ID unchanged
    })

    it('does not expand non-ATTACK commands', () => {
      const monster = createTestMonster({
        damage: [
          { dice: '1d4', min: 1, max: 4 },
          { dice: '1d4', min: 1, max: 4 }
        ]
      })

      const target = createTestCharacter({ id: 'fighter' })
      const command = CombatService.createCommand(monster, 'PARRY', [target])

      const expanded = CombatService.expandAttackCommands([command])

      expect(expanded).toHaveLength(1)
      expect(expanded[0]).toBe(command)
    })

    it('handles mixed character and monster commands', () => {
      const character = createTestCharacter({
        id: 'fighter',
        level: 10,
        class: 'FIGHTER'
      })

      const greaterDemon = createTestMonster({
        id: 'demon-1',
        damage: [
          { dice: '2d12', min: 2, max: 24 },
          { dice: '1d6', min: 1, max: 6 },
          { dice: '1d4', min: 1, max: 4 }
        ]
      })

      const charTarget = createTestMonster({ id: 'target1' })
      const monsterTarget = createTestCharacter({ id: 'target2' })

      const charCommand = CombatService.createCommand(character, 'ATTACK', [charTarget])
      const monsterCommand = CombatService.createCommand(greaterDemon, 'ATTACK', [monsterTarget])

      const expanded = CombatService.expandAttackCommands([charCommand, monsterCommand])

      // Fighter level 10 = 1 + floor(10/5) = 3 attacks
      // Greater Demon with 3 damage entries = 3 attacks
      expect(expanded).toHaveLength(6)

      // First 3 should be fighter attacks
      expect(expanded[0].actor).toBe(character)
      expect(expanded[1].actor).toBe(character)
      expect(expanded[2].actor).toBe(character)

      // Last 3 should be demon attacks
      expect(expanded[3].actor).toBe(greaterDemon)
      expect(expanded[4].actor).toBe(greaterDemon)
      expect(expanded[5].actor).toBe(greaterDemon)
    })
  })

  describe('damage index tracking', () => {
    it('uses different damage entries for each attack in multi-attack monster', () => {
      // Greater Demon has 5 different damage entries
      const greaterDemon = createTestMonster({
        id: 'demon-1',
        monsterId: 'greater_demon',
        name: 'Greater Demon',
        hp: 50,
        maxHp: 50,
        ac: 5,
        damage: [
          { dice: '2d12', min: 2, max: 24 },  // Attack 0: big claw
          { dice: '1d6', min: 1, max: 6 },    // Attack 1: bite
          { dice: '1d4', min: 1, max: 4 },    // Attack 2-4: small claws
          { dice: '1d4', min: 1, max: 4 },
          { dice: '1d4', min: 1, max: 4 }
        ]
      })

      const target = createTestCharacter({ id: 'fighter', hp: 100 })

      const command = CombatService.createCommand(greaterDemon, 'ATTACK', [target])
      const expanded = CombatService.expandAttackCommands([command])

      // Verify each command has the correct attackIndex
      expect(expanded).toHaveLength(5)
      expect(expanded[0].attackIndex).toBe(0)
      expect(expanded[1].attackIndex).toBe(1)
      expect(expanded[2].attackIndex).toBe(2)
      expect(expanded[3].attackIndex).toBe(3)
      expect(expanded[4].attackIndex).toBe(4)
    })

    it('resolveAttack uses correct damage entry based on attackIndex', () => {
      // Create monster with distinct damage ranges for each attack
      const monster = createTestMonster({
        id: 'demon-1',
        name: 'Multi-Attack Demon',
        damage: [
          { dice: '10d10', min: 10, max: 100 },  // Attack 0: 10-100 damage
          { dice: '2d2', min: 2, max: 4 },       // Attack 1: 2-4 damage
          { dice: '5d5', min: 5, max: 25 }       // Attack 2: 5-25 damage
        ]
      })

      const target = createTestCharacter({ id: 'fighter', hp: 100, ac: 10 })

      // Test attack 0 (big damage)
      const result0 = CombatService.resolveAttack(monster, target, 0, 0, 0, 0)
      if (result0.hit) {
        expect(result0.damage).toBeGreaterThanOrEqual(10)
        expect(result0.damage).toBeLessThanOrEqual(100)
      }

      // Test attack 1 (small damage)
      const result1 = CombatService.resolveAttack(monster, target, 0, 0, 0, 1)
      if (result1.hit) {
        expect(result1.damage).toBeGreaterThanOrEqual(2)
        expect(result1.damage).toBeLessThanOrEqual(4)
      }

      // Test attack 2 (medium damage)
      const result2 = CombatService.resolveAttack(monster, target, 0, 0, 0, 2)
      if (result2.hit) {
        expect(result2.damage).toBeGreaterThanOrEqual(5)
        expect(result2.damage).toBeLessThanOrEqual(25)
      }
    })
  })
})
