// src/services/__tests__/CombatService.phase9.spec.ts
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '../../test-helpers/test-factories'

describe('CombatService - Phase 9: Advanced Spell Effect Integration', () => {
  describe('Instant Death Integration (MAKANITO)', () => {
    it('executes MAKANITO killing monster instantly', () => {
      const caster = createTestCharacter({
        id: 'mage',
        level: 6,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 2, max: 2 },
            level4: { current: 1, max: 1 },
            level5: { current: 1, max: 1 }
          }
        }
      })

      const dragon = createTestMonster({ id: 'dragon', hp: 200, maxHp: 200 })

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [dragon],
          formation: 'front'
        }]
      })

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [dragon], { spellId: 'makanito' })

      const result = CombatService.executeCommand(state, command)

      // Verify monster is dead
      const killedMonster = result.newState.monsterGroups[0].monsters[0]
      expect(killedMonster.hp).toBe(0)
      expect(killedMonster.status).toBe('DEAD')
      expect(result.message).toContain('MAKANITO')
      expect(result.message).toContain('instant death')
    })

    it('MAKANITO works on healthy monsters', () => {
      const caster = createTestCharacter({
        id: 'mage',
        level: 6,
        spellPoints: {
          mage: { level5: { current: 1, max: 1 } }
        }
      })

      const fullHPMonster = createTestMonster({ id: 'm1', hp: 100, maxHp: 100 })

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [fullHPMonster],
          formation: 'front'
        }]
      })

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [fullHPMonster], { spellId: 'makanito' })
      const result = CombatService.executeCommand(state, command)

      expect(result.newState.monsterGroups[0].monsters[0].hp).toBe(0)
      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('DEAD')
    })

    it('MAKANITO only affects single target', () => {
      const caster = createTestCharacter({
        id: 'mage',
        level: 6,
        spellPoints: {
          mage: { level5: { current: 1, max: 1 } }
        }
      })

      const monsters = [
        createTestMonster({ id: 'm1', hp: 50, maxHp: 50 }),
        createTestMonster({ id: 'm2', hp: 50, maxHp: 50 })
      ]

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters,
          formation: 'front'
        }]
      })

      // Target only first monster
      const command = CombatService.createCommand(caster, 'CAST_SPELL', [monsters[0]], { spellId: 'makanito' })
      const result = CombatService.executeCommand(state, command)

      // First monster dead, second alive
      expect(result.newState.monsterGroups[0].monsters[0].hp).toBe(0)
      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('DEAD')
      expect(result.newState.monsterGroups[0].monsters[1].hp).toBe(50)
      expect(result.newState.monsterGroups[0].monsters[1].status).toBe('ALIVE')
    })
  })

  describe('Status Cure Integration (LITOKAN, LATUMOFIS)', () => {
    it('executes LATUMOFIS curing paralysis', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 5,
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 2, max: 2 },
            level4: { current: 1, max: 1 }
          }
        }
      })

      const paralyzedFighter = createTestCharacter({ id: 'fighter', status: 'PARALYZED' as any })

      const state = createTestCombatState()

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [paralyzedFighter], { spellId: 'latumofis' })
      const result = CombatService.executeCommand(state, command)

      expect(result.message).toContain('LATUMOFIS')
      expect(result.message).toContain('paralysis')
    })

    it('executes LITOKAN curing SILENCED status', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 6,
        spellPoints: {
          priest: {
            level5: { current: 1, max: 1 }
          }
        }
      })

      const silencedMage = createTestCharacter({ id: 'mage' })

      let state = createTestCombatState()
      // Apply SILENCED status first
      state = CombatService.applyStatusEffect(state, 'mage', 'SILENCED')

      // Verify mage is silenced
      expect(CombatService.hasStatusEffect(state, 'mage', 'SILENCED')).toBe(true)

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [silencedMage], { spellId: 'litokan' })
      const result = CombatService.executeCommand(state, command)

      // Verify silence is cured
      expect(CombatService.hasStatusEffect(result.newState, 'mage', 'SILENCED')).toBe(false)
      expect(result.message).toContain('LITOKAN')
    })

    it('executes LITOKAN curing BLIND status', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 6,
        spellPoints: {
          priest: { level5: { current: 1, max: 1 } }
        }
      })

      const blindFighter = createTestCharacter({ id: 'fighter' })

      let state = createTestCombatState()
      state = CombatService.applyStatusEffect(state, 'fighter', 'BLIND')

      expect(CombatService.hasStatusEffect(state, 'fighter', 'BLIND')).toBe(true)

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [blindFighter], { spellId: 'litokan' })
      const result = CombatService.executeCommand(state, command)

      expect(CombatService.hasStatusEffect(result.newState, 'fighter', 'BLIND')).toBe(false)
    })

    it('executes LITOKAN waking sleeping monsters', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 6,
        spellPoints: {
          priest: { level5: { current: 1, max: 1 } }
        }
      })

      const sleepingMonster = createTestMonster({ id: 'monster', status: 'ASLEEP' })

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [sleepingMonster],
          formation: 'front'
        }]
      })

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [sleepingMonster], { spellId: 'litokan' })
      const result = CombatService.executeCommand(state, command)

      // Monster should be awake
      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('ALIVE')
    })

    it('executes LITOKAN on party curing multiple status effects', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 6,
        spellPoints: {
          priest: { level5: { current: 1, max: 1 } }
        }
      })

      const party = [
        createTestCharacter({ id: 'c1' }),
        createTestCharacter({ id: 'c2' }),
        createTestCharacter({ id: 'c3' })
      ]

      let state = createTestCombatState()
      state = CombatService.applyStatusEffect(state, 'c1', 'BLIND')
      state = CombatService.applyStatusEffect(state, 'c2', 'SILENCED')

      const command = CombatService.createCommand(caster, 'CAST_SPELL', party, { spellId: 'litokan' })
      const result = CombatService.executeCommand(state, command)

      expect(CombatService.hasStatusEffect(result.newState, 'c1', 'BLIND')).toBe(false)
      expect(CombatService.hasStatusEffect(result.newState, 'c2', 'SILENCED')).toBe(false)
    })
  })

  describe('Full Heal Integration (MALIKTO)', () => {
    it('executes MALIKTO for full party healing', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 8,
        spellPoints: {
          priest: {
            level7: { current: 1, max: 1 }
          }
        }
      })

      const party = [
        createTestCharacter({ id: 'c1', hp: 5, maxHp: 50 }),
        createTestCharacter({ id: 'c2', hp: 10, maxHp: 60 }),
        createTestCharacter({ id: 'c3', hp: 1, maxHp: 40 })
      ]

      const state = createTestCombatState()

      const command = CombatService.createCommand(caster, 'CAST_SPELL', party, { spellId: 'malikto' })
      const result = CombatService.executeCommand(state, command)

      expect(result.message).toContain('MALIKTO')
      expect(result.message).toContain('fully restores')
    })

    it('MALIKTO works on already full HP characters', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 8,
        spellPoints: {
          priest: { level7: { current: 1, max: 1 } }
        }
      })

      const fullHP = createTestCharacter({ id: 'c1', hp: 50, maxHp: 50 })

      const state = createTestCombatState()

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [fullHP], { spellId: 'malikto' })
      const result = CombatService.executeCommand(state, command)

      expect(result.message).toContain('fully restores')
    })
  })

  describe('Resurrection Integration (KADORTO)', () => {
    it('executes KADORTO for resurrection', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 8,
        spellPoints: {
          priest: {
            level7: { current: 1, max: 1 }
          }
        }
      })

      const deadAlly = createTestCharacter({ id: 'fallen', hp: 0, maxHp: 30, status: 'DEAD' as any })

      const state = createTestCombatState()

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [deadAlly], { spellId: 'kadorto' })
      const result = CombatService.executeCommand(state, command)

      expect(result.message).toContain('KADORTO')
      expect(result.message).toContain('resurrects')
    })
  })

  describe('Fear Integration (MORLIS)', () => {
    it('executes MORLIS causing fear', () => {
      const caster = createTestCharacter({
        id: 'mage',
        level: 5,
        spellPoints: {
          mage: {
            level4: { current: 1, max: 1 }
          }
        }
      })

      const enemies = [
        createTestMonster({ id: 'm1' }),
        createTestMonster({ id: 'm2' })
      ]

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: enemies,
          formation: 'front'
        }]
      })

      const command = CombatService.createCommand(caster, 'CAST_SPELL', enemies, { spellId: 'morlis' })
      const result = CombatService.executeCommand(state, command)

      expect(result.message).toContain('MORLIS')
      expect(result.message).toContain('fear')
    })
  })

  describe('Mixed Advanced Spell Combat', () => {
    it('combines instant death with healing in same combat', () => {
      const mage = createTestCharacter({
        id: 'mage',
        level: 6,
        spellPoints: {
          mage: { level5: { current: 1, max: 1 } }
        }
      })

      const priest = createTestCharacter({
        id: 'priest',
        level: 6,
        hp: 5,
        maxHp: 30,
        spellPoints: {
          priest: { level5: { current: 1, max: 1 } }
        }
      })

      const monster = createTestMonster({ id: 'boss', hp: 200, maxHp: 200 })

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      // Mage casts MAKANITO
      const killCommand = CombatService.createCommand(mage, 'CAST_SPELL', [monster], { spellId: 'makanito' })
      const killResult = CombatService.executeCommand(state, killCommand)

      expect(killResult.newState.monsterGroups[0].monsters[0].hp).toBe(0)

      // Priest casts DIALKO to heal self
      const healCommand = CombatService.createCommand(priest, 'CAST_SPELL', [priest], { spellId: 'dialko' })
      const healResult = CombatService.executeCommand(killResult.newState, healCommand)

      expect(healResult.message).toContain('DIALKO')
    })

    it('combines status cure with resurrection', () => {
      const priest = createTestCharacter({
        id: 'priest',
        level: 8,
        spellPoints: {
          priest: {
            level5: { current: 1, max: 1 },
            level7: { current: 1, max: 1 }
          }
        }
      })

      const silencedAlly = createTestCharacter({ id: 'ally1' })
      const deadAlly = createTestCharacter({ id: 'ally2', hp: 0, maxHp: 30, status: 'DEAD' as any })

      let state = createTestCombatState()
      state = CombatService.applyStatusEffect(state, 'ally1', 'SILENCED')

      // Cure silence
      const cureCommand = CombatService.createCommand(priest, 'CAST_SPELL', [silencedAlly], { spellId: 'litokan' })
      const cureResult = CombatService.executeCommand(state, cureCommand)

      expect(CombatService.hasStatusEffect(cureResult.newState, 'ally1', 'SILENCED')).toBe(false)

      // Resurrect dead
      const resCommand = CombatService.createCommand(priest, 'CAST_SPELL', [deadAlly], { spellId: 'kadorto' })
      const resResult = CombatService.executeCommand(cureResult.newState, resCommand)

      expect(resResult.message).toContain('resurrects')
    })

    it('uses TILTOWAIT for massive damage then MALIKTO to heal', () => {
      const mage = createTestCharacter({
        id: 'mage',
        level: 10,
        spellPoints: {
          mage: { level7: { current: 1, max: 1 } }
        }
      })

      const priest = createTestCharacter({
        id: 'priest',
        level: 8,
        hp: 10,
        maxHp: 50,
        spellPoints: {
          priest: { level7: { current: 1, max: 1 } }
        }
      })

      const monsters = [
        createTestMonster({ id: 'm1', hp: 100, maxHp: 100 }),
        createTestMonster({ id: 'm2', hp: 100, maxHp: 100 })
      ]

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters,
          formation: 'front'
        }]
      })

      // TILTOWAIT nukes
      const nukeCommand = CombatService.createCommand(mage, 'CAST_SPELL', monsters, { spellId: 'tiltowait' })
      const nukeResult = CombatService.executeCommand(state, nukeCommand)

      expect(nukeResult.message).toContain('TILTOWAIT')

      // MALIKTO heals
      const healCommand = CombatService.createCommand(priest, 'CAST_SPELL', [priest], { spellId: 'malikto' })
      const healResult = CombatService.executeCommand(nukeResult.newState, healCommand)

      expect(healResult.message).toContain('MALIKTO')
    })
  })

  describe('Edge Cases', () => {
    it('MAKANITO on already dead monster has no additional effect', () => {
      const caster = createTestCharacter({
        id: 'mage',
        level: 6,
        spellPoints: {
          mage: { level5: { current: 1, max: 1 } }
        }
      })

      const deadMonster = createTestMonster({ id: 'dead', hp: 0, maxHp: 50, status: 'DEAD' })

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [deadMonster],
          formation: 'front'
        }]
      })

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [deadMonster], { spellId: 'makanito' })
      const result = CombatService.executeCommand(state, command)

      expect(result.newState.monsterGroups[0].monsters[0].hp).toBe(0)
      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('DEAD')
    })

    it('LITOKAN on character with no ailments works', () => {
      const caster = createTestCharacter({
        id: 'priest',
        level: 6,
        spellPoints: {
          priest: { level5: { current: 1, max: 1 } }
        }
      })

      const healthy = createTestCharacter({ id: 'c1', status: 'OK' })

      const state = createTestCombatState()

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [healthy], { spellId: 'litokan' })
      const result = CombatService.executeCommand(state, command)

      expect(result.message).toContain('LITOKAN')
    })

    it('fear spell on empty target array executes without error', () => {
      const caster = createTestCharacter({
        id: 'mage',
        level: 5,
        spellPoints: {
          mage: { level4: { current: 1, max: 1 } }
        }
      })

      const state = createTestCombatState()

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [], { spellId: 'morlis' })
      const result = CombatService.executeCommand(state, command)

      expect(result.message).toContain('MORLIS')
    })
  })
})
