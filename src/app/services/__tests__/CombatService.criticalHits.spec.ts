// Test for critical hit mechanics (instant kill, not 2x damage)
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'

describe('CombatService.criticalHits', () => {
  describe('resolveAttack', () => {
    it('critical hit causes instant kill (not 2x damage)', () => {
      const ninja = createTestCharacter({
        class: CharacterClass.NINJA,
        level: 10,
        strength: 10
      })
      const monster = createTestMonster({
        id: 'monster1',
        level: 5,
        hp: 50,
        ac: 0
      })

      // Queue: hit roll (success), damage roll, crit roll (success), monster resist roll (fail to resist)
      // Crit chance: min(10*2, 50) = 20% -> need roll <= 20 -> queue 0.1 (10%)
      // Monster resist: (5+10)=15 >= resistRoll means resist, so need resistRoll > 15 for NO resist
      // For random(0,34) to return 16+: Math.floor(nextRandom * 35) >= 16 -> nextRandom >= 16/35 = 0.457
      RandomService.queueNextValues([0.1, 0.5, 0.1, 0.5])

      const result = CombatService.resolveAttack(ninja, monster)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(true)
      expect(result.instantKill).toBe(true)
      expect(result.message).toContain('slain')
    })

    it('level 24+ monsters are immune to critical hits', () => {
      const ninja = createTestCharacter({
        class: CharacterClass.NINJA,
        level: 25,
        strength: 10
      })
      const highLevelMonster = createTestMonster({
        id: 'boss',
        level: 24,  // Level+10=34, always >= random(0,34)
        hp: 500,
        ac: -5
      })

      // Queue: hit roll success, damage roll, crit roll success, monster resist roll (any value works)
      // At level 24: (24+10)=34 >= any random(0,34), so always resists
      // For random(0, 34) to return 20: Math.floor(0.571 * 35) = 19, so use 0.6 -> Math.floor(0.6*35)=21
      // But actually ANY value should work since 34 >= anything from 0-34
      RandomService.queueNextValues([0.1, 0.5, 0.1, 0.5])

      const result = CombatService.resolveAttack(ninja, highLevelMonster)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(false)  // Resisted, so not critical
      expect(result.instantKill).toBeFalsy()
    })

    it('low-level monster can be critically hit and killed', () => {
      const ninja = createTestCharacter({
        class: CharacterClass.NINJA,
        level: 10,
        strength: 10
      })
      const weakMonster = createTestMonster({
        id: 'goblin',
        level: 1,
        hp: 10,
        ac: 5
      })

      // Queue: hit roll success, damage roll, crit roll success, monster resist roll (vulnerable)
      // Level 1: (1+10)=11 >= resistRoll means resist, so need resistRoll < 11 for NO resist (vulnerable)
      // For random(0,34) to return 11+: Math.floor(nextRandom * 35) >= 11 -> nextRandom >= 11/35 = 0.314
      // So use > 0.314 to get vulnerable (resistRoll >= 11 fails the condition, allowing crit)
      RandomService.queueNextValues([0.1, 0.5, 0.1, 0.4])

      const result = CombatService.resolveAttack(ninja, weakMonster)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(true)
      expect(result.instantKill).toBe(true)
    })

    it('AttackResult has instantKill property', () => {
      const ninja = createTestCharacter({
        class: CharacterClass.NINJA,
        level: 10,
        strength: 10
      })
      const monster = createTestMonster({
        id: 'monster1',
        level: 5,
        hp: 50,
        ac: 0
      })

      // Queue: hit roll, damage, crit roll (fail)
      RandomService.queueNextValues([0.1, 0.5, 0.99])

      const result = CombatService.resolveAttack(ninja, monster)

      expect(result).toHaveProperty('instantKill')
      expect(result.instantKill).toBeFalsy()  // No crit, so no instant kill
    })
  })

  describe('executeCommand', () => {
    it('instant kill sets HP to 0 and status to DEAD', () => {
      const ninja = createTestCharacter({
        id: 'ninja1',
        class: CharacterClass.NINJA,
        level: 10,
        strength: 10
      })
      const monster = createTestMonster({
        id: 'monster1',
        level: 5,
        hp: 50,
        ac: 0
      })

      const combatState = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [monster],
            formation: 'front',
            identified: true
          }
        ]
      })

      const command = {
        id: 'cmd1',
        actor: ninja,
        type: 'ATTACK' as const,
        initiative: 10,
        target: monster
      }

      // Queue: hit roll, damage, crit roll (success), monster resist roll (vulnerable)
      RandomService.queueNextValues([0.1, 0.5, 0.1, 0.5])

      const result = CombatService.executeCommand(combatState, command, new Set<string>())

      // Find the monster in the result
      const updatedMonster = result.newState.monsterGroups[0].monsters[0]
      expect(updatedMonster.hp).toBe(0)
      expect(updatedMonster.status).toBe('DEAD')
      expect(result.messages.some(m => m.includes('slain'))).toBe(true)
    })
  })
})
