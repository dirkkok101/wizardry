// src/app/scenes/combat-scene/__tests__/combat.multiattack.spec.ts
import { CombatService } from '@services/CombatService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'

describe('Multi-Attack Execution', () => {
  describe('getAttacksPerRound', () => {
    it('Fighter level 1 gets 1 attack', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 1 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(1)
    })

    it('Fighter level 5 gets 2 attacks', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 5 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(2)
    })

    it('Fighter level 10 gets 3 attacks', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 10 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(3)
    })

    it('Ninja level 1 gets 2 attacks (base bonus)', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 1 })
      expect(CombatService.getAttacksPerRound(ninja)).toBe(2)
    })

    it('Ninja level 5 gets 3 attacks', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 5 })
      expect(CombatService.getAttacksPerRound(ninja)).toBe(3)
    })

    it('Mage gets 1 attack regardless of level', () => {
      const mage = createTestCharacter({ class: CharacterClass.MAGE, level: 20 })
      expect(CombatService.getAttacksPerRound(mage)).toBe(1)
    })

    it('caps at 10 attacks maximum', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 50 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(10)
    })

    it('Lord gets same formula as Fighter', () => {
      const lord = createTestCharacter({ class: CharacterClass.LORD, level: 10 })
      expect(CombatService.getAttacksPerRound(lord)).toBe(3)
    })

    it('Samurai gets same formula as Fighter', () => {
      const samurai = createTestCharacter({ class: CharacterClass.SAMURAI, level: 10 })
      expect(CombatService.getAttacksPerRound(samurai)).toBe(3)
    })
  })

  describe('Attack Command Expansion', () => {
    it('expands single ATTACK command into multiple for Fighter level 5', () => {
      const fighter = createTestCharacter({
        id: 'fighter-1',
        class: CharacterClass.FIGHTER,
        level: 5
      })
      const monster = createTestMonster({ id: 'monster-1' })
      const attackCommand = {
        id: 'cmd-1',
        actor: fighter,
        type: 'ATTACK' as const,
        target: monster,
        initiative: 5
      }

      const expanded = CombatService.expandAttackCommands([attackCommand])

      expect(expanded.length).toBe(2)
      expect(expanded[0].id).toBe('cmd-1_0')
      expect(expanded[1].id).toBe('cmd-1_1')
      expect(expanded.every(c => c.actor.id === 'fighter-1')).toBe(true)
    })

    it('does not expand PARRY commands', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 10 })
      const parryCommand = {
        id: 'cmd-1',
        actor: fighter,
        type: 'PARRY' as const,
        initiative: 5
      }

      const expanded = CombatService.expandAttackCommands([parryCommand])

      expect(expanded.length).toBe(1)
      expect(expanded[0].id).toBe('cmd-1')
    })

    it('does not expand monster ATTACK commands', () => {
      const monster = createTestMonster({ id: 'monster-1' })
      const attackCommand = {
        id: 'cmd-1',
        actor: monster,
        type: 'ATTACK' as const,
        target: { id: 'char-1' } as any,
        initiative: 5
      }

      const expanded = CombatService.expandAttackCommands([attackCommand])

      expect(expanded.length).toBe(1) // Monsters always get 1 attack per group
    })

    it('does not expand commands for characters with 1 attack', () => {
      const mage = createTestCharacter({
        id: 'mage-1',
        class: CharacterClass.MAGE,
        level: 10
      })
      const attackCommand = {
        id: 'cmd-1',
        actor: mage,
        type: 'ATTACK' as const,
        target: { id: 'monster-1' } as any,
        initiative: 5
      }

      const expanded = CombatService.expandAttackCommands([attackCommand])

      expect(expanded.length).toBe(1)
      expect(expanded[0].id).toBe('cmd-1') // Original ID preserved
    })

    it('expands Ninja level 5 to 3 attacks', () => {
      const ninja = createTestCharacter({
        id: 'ninja-1',
        class: CharacterClass.NINJA,
        level: 5
      })
      const attackCommand = {
        id: 'cmd-1',
        actor: ninja,
        type: 'ATTACK' as const,
        target: { id: 'monster-1' } as any,
        initiative: 3
      }

      const expanded = CombatService.expandAttackCommands([attackCommand])

      expect(expanded.length).toBe(3)
      expect(expanded[0].id).toBe('cmd-1_0')
      expect(expanded[1].id).toBe('cmd-1_1')
      expect(expanded[2].id).toBe('cmd-1_2')
    })
  })
})
