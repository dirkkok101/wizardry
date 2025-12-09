import { HealingService } from '../HealingService'
import { createTestCharacter, createTestGameState, createPartyWithMembers } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'
import { CharacterClass } from '@models/CharacterClass'
import { Character } from '@models/Character'
import { CharacterSpellPoints, SpellPointPool } from '@models/SpellPoints'
import { RandomService } from '@services/RandomService'

/**
 * Helper: Create priest spell points with specified current values
 */
function createPriestSpellPoints(
  level1 = 0, level4 = 0, level5 = 0, level6 = 0
): CharacterSpellPoints {
  const pool: SpellPointPool = {
    level1: { current: level1, max: 9 },
    level2: { current: 0, max: 0 },
    level3: { current: 0, max: 0 },
    level4: { current: level4, max: 9 },
    level5: { current: level5, max: 9 },
    level6: { current: level6, max: 9 },
    level7: { current: 0, max: 0 }
  }
  return { priest: pool }
}

describe('HealingService', () => {
  describe('findHealingTargets', () => {
    it('finds characters with HP below max', () => {
      const injured = createTestCharacter({
        id: 'injured',
        name: 'Injured Fighter',
        hp: 5,
        maxHp: 10
      })

      const roster = new Map<string, Character>([[injured.id, injured]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([injured.id])
      })

      const targets = HealingService.findHealingTargets(state)

      expect(targets).toHaveLength(1)
      expect(targets[0].characterId).toBe('injured')
      expect(targets[0].damage).toBe(5)
    })

    it('excludes characters at full HP', () => {
      const healthy = createTestCharacter({
        id: 'healthy',
        hp: 10,
        maxHp: 10
      })

      const roster = new Map<string, Character>([[healthy.id, healthy]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([healthy.id])
      })

      const targets = HealingService.findHealingTargets(state)

      expect(targets).toHaveLength(0)
    })

    it('excludes DEAD characters', () => {
      const dead = createTestCharacter({
        id: 'dead',
        hp: 0,
        maxHp: 10,
        status: CharacterStatus.DEAD
      })

      const roster = new Map<string, Character>([[dead.id, dead]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([dead.id])
      })

      const targets = HealingService.findHealingTargets(state)

      expect(targets).toHaveLength(0)
    })

    it('excludes ASHES characters', () => {
      const ashes = createTestCharacter({
        id: 'ashes',
        hp: 0,
        maxHp: 10,
        status: CharacterStatus.ASHES
      })

      const roster = new Map<string, Character>([[ashes.id, ashes]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([ashes.id])
      })

      const targets = HealingService.findHealingTargets(state)

      expect(targets).toHaveLength(0)
    })

    it('excludes LOST characters', () => {
      const lost = createTestCharacter({
        id: 'lost',
        hp: 0,
        maxHp: 10,
        status: CharacterStatus.LOST
      })

      const roster = new Map<string, Character>([[lost.id, lost]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([lost.id])
      })

      const targets = HealingService.findHealingTargets(state)

      expect(targets).toHaveLength(0)
    })

    it('includes POISONED characters with damage', () => {
      const poisoned = createTestCharacter({
        id: 'poisoned',
        name: 'Poisoned Mage',
        hp: 3,
        maxHp: 8,
        status: CharacterStatus.POISONED
      })

      const roster = new Map<string, Character>([[poisoned.id, poisoned]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([poisoned.id])
      })

      const targets = HealingService.findHealingTargets(state)

      expect(targets).toHaveLength(1)
      expect(targets[0].hasStatusEffect).toBe(true)
      expect(targets[0].statusEffect).toBe(CharacterStatus.POISONED)
    })

    it('returns targets sorted by most damaged first', () => {
      const lightlyInjured = createTestCharacter({
        id: 'light',
        name: 'Light',
        hp: 8,
        maxHp: 10
      })
      const heavilyInjured = createTestCharacter({
        id: 'heavy',
        name: 'Heavy',
        hp: 2,
        maxHp: 10
      })

      const roster = new Map<string, Character>([
        [lightlyInjured.id, lightlyInjured],
        [heavilyInjured.id, heavilyInjured]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([lightlyInjured.id, heavilyInjured.id])
      })

      const targets = HealingService.findHealingTargets(state)

      expect(targets).toHaveLength(2)
      expect(targets[0].characterId).toBe('heavy') // 8 damage
      expect(targets[1].characterId).toBe('light') // 2 damage
    })
  })

  describe('findHealingCasters', () => {
    it('finds priests with healing spell points', () => {
      const priest = createTestCharacter({
        id: 'priest',
        name: 'Healer',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(3) // 3 points at level 1 (DIOS)
      })

      const roster = new Map<string, Character>([[priest.id, priest]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([priest.id])
      })

      const casters = HealingService.findHealingCasters(state)

      expect(casters).toHaveLength(1)
      expect(casters[0].character.id).toBe('priest')
      expect(casters[0].availableSpells).toContainEqual(
        expect.objectContaining({ spellId: 'dios' })
      )
    })

    it('finds bishops with priest spell points', () => {
      const bishop = createTestCharacter({
        id: 'bishop',
        name: 'Bishop',
        class: CharacterClass.BISHOP,
        spellPoints: createPriestSpellPoints(2, 1) // L1=2, L4=1
      })

      const roster = new Map<string, Character>([[bishop.id, bishop]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([bishop.id])
      })

      const casters = HealingService.findHealingCasters(state)

      expect(casters).toHaveLength(1)
      expect(casters[0].character.class).toBe(CharacterClass.BISHOP)
    })

    it('finds lords with priest spell points', () => {
      const lord = createTestCharacter({
        id: 'lord',
        name: 'Lord',
        class: CharacterClass.LORD,
        spellPoints: createPriestSpellPoints(1) // 1 point at level 1
      })

      const roster = new Map<string, Character>([[lord.id, lord]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([lord.id])
      })

      const casters = HealingService.findHealingCasters(state)

      expect(casters).toHaveLength(1)
      expect(casters[0].character.class).toBe(CharacterClass.LORD)
    })

    it('excludes fighters (non-casters)', () => {
      const fighter = createTestCharacter({
        id: 'fighter',
        class: CharacterClass.FIGHTER
        // No spellPoints
      })

      const roster = new Map<string, Character>([[fighter.id, fighter]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([fighter.id])
      })

      const casters = HealingService.findHealingCasters(state)

      expect(casters).toHaveLength(0)
    })

    it('excludes mages (no priest spells)', () => {
      const magePool: SpellPointPool = {
        level1: { current: 5, max: 9 },
        level2: { current: 3, max: 9 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const mage = createTestCharacter({
        id: 'mage',
        class: CharacterClass.MAGE,
        spellPoints: { mage: magePool } // Only mage spells, no priest
      })

      const roster = new Map<string, Character>([[mage.id, mage]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([mage.id])
      })

      const casters = HealingService.findHealingCasters(state)

      expect(casters).toHaveLength(0)
    })

    it('excludes casters with no spell points at healing levels', () => {
      // Priest with points only at non-healing levels (2, 3, 7)
      const emptyPool: SpellPointPool = {
        level1: { current: 0, max: 0 }, // DIOS level - empty
        level2: { current: 5, max: 9 },
        level3: { current: 5, max: 9 },
        level4: { current: 0, max: 0 }, // DIAL level - empty
        level5: { current: 0, max: 0 }, // DIALMA level - empty
        level6: { current: 0, max: 0 }, // MADI level - empty
        level7: { current: 5, max: 9 }
      }
      const priest = createTestCharacter({
        id: 'exhausted-priest',
        class: CharacterClass.PRIEST,
        spellPoints: { priest: emptyPool }
      })

      const roster = new Map<string, Character>([[priest.id, priest]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([priest.id])
      })

      const casters = HealingService.findHealingCasters(state)

      expect(casters).toHaveLength(0)
    })

    it('returns available spells based on spell points', () => {
      const priest = createTestCharacter({
        id: 'full-priest',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(2, 3, 1, 0) // L1=2, L4=3, L5=1, L6=0
      })

      const roster = new Map<string, Character>([[priest.id, priest]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([priest.id])
      })

      const casters = HealingService.findHealingCasters(state)

      expect(casters).toHaveLength(1)
      const spellIds = casters[0].availableSpells.map(s => s.spellId)
      expect(spellIds).toContain('dios')    // L1 has points
      expect(spellIds).toContain('dial')    // L4 has points
      expect(spellIds).toContain('dialma')  // L5 has points
      expect(spellIds).not.toContain('madi') // L6 has 0 points
    })
  })

  describe('selectOptimalSpell', () => {
    // Helper to create spell info array
    const allSpells = [
      { spellId: 'dios', name: 'DIOS', spellLevel: 1, minHeal: 1, maxHeal: 8, avgHeal: 4.5, curesStatus: false },
      { spellId: 'dial', name: 'DIAL', spellLevel: 4, minHeal: 2, maxHeal: 16, avgHeal: 9, curesStatus: false },
      { spellId: 'dialma', name: 'DIALMA', spellLevel: 5, minHeal: 3, maxHeal: 24, avgHeal: 13.5, curesStatus: false },
      { spellId: 'madi', name: 'MADI', spellLevel: 6, minHeal: Infinity, maxHeal: Infinity, avgHeal: Infinity, curesStatus: true }
    ]

    it('selects DIOS for 1-8 damage', () => {
      const spell = HealingService.selectOptimalSpell(5, false, allSpells)
      expect(spell?.spellId).toBe('dios')
    })

    it('selects DIAL for 9-16 damage', () => {
      const spell = HealingService.selectOptimalSpell(12, false, allSpells)
      expect(spell?.spellId).toBe('dial')
    })

    it('selects DIALMA for 17-24 damage', () => {
      const spell = HealingService.selectOptimalSpell(20, false, allSpells)
      expect(spell?.spellId).toBe('dialma')
    })

    it('selects MADI for 25+ damage', () => {
      const spell = HealingService.selectOptimalSpell(30, false, allSpells)
      expect(spell?.spellId).toBe('madi')
    })

    it('selects MADI when target has curable status effect', () => {
      // Even with only 5 damage, MADI preferred because it cures status
      const spell = HealingService.selectOptimalSpell(5, true, allSpells)
      expect(spell?.spellId).toBe('madi')
    })

    it('falls back to next best spell when optimal unavailable', () => {
      // Only DIOS available, but 15 damage (normally DIAL)
      const onlyDios = [allSpells[0]] // Just DIOS
      const spell = HealingService.selectOptimalSpell(15, false, onlyDios)
      expect(spell?.spellId).toBe('dios')
    })

    it('falls back when MADI unavailable for status effect', () => {
      // Has status but no MADI - should use best available for damage
      const noMadi = allSpells.slice(0, 3) // DIOS, DIAL, DIALMA
      const spell = HealingService.selectOptimalSpell(5, true, noMadi)
      expect(spell?.spellId).toBe('dios') // Still use DIOS for 5 damage
    })

    it('returns null when no spells available', () => {
      const spell = HealingService.selectOptimalSpell(10, false, [])
      expect(spell).toBeNull()
    })

    it('prefers higher spell when damage is at boundary', () => {
      // At exactly 8 damage, DIOS max is 8 so might not fully heal
      // Algorithm should still use DIOS for efficiency
      const spell = HealingService.selectOptimalSpell(8, false, allSpells)
      expect(spell?.spellId).toBe('dios')
    })

    it('selects DIAL at boundary of 9 damage', () => {
      // 9 damage exceeds DIOS max (8), so DIAL needed
      const spell = HealingService.selectOptimalSpell(9, false, allSpells)
      expect(spell?.spellId).toBe('dial')
    })
  })

  describe('partyNeedsHealing', () => {
    it('returns true when party member has damage', () => {
      const injured = createTestCharacter({ id: 'injured', hp: 5, maxHp: 10 })
      const roster = new Map<string, Character>([[injured.id, injured]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([injured.id])
      })

      expect(HealingService.partyNeedsHealing(state)).toBe(true)
    })

    it('returns false when all party members at full HP', () => {
      const healthy = createTestCharacter({ id: 'healthy', hp: 10, maxHp: 10 })
      const roster = new Map<string, Character>([[healthy.id, healthy]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([healthy.id])
      })

      expect(HealingService.partyNeedsHealing(state)).toBe(false)
    })

    it('returns false for empty party', () => {
      const state = createTestGameState({ party: createPartyWithMembers([]) })
      expect(HealingService.partyNeedsHealing(state)).toBe(false)
    })
  })

  describe('hasHealingSpellsAvailable', () => {
    it('returns true when caster has healing spell points', () => {
      const priest = createTestCharacter({
        id: 'priest',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(1)
      })
      const roster = new Map<string, Character>([[priest.id, priest]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([priest.id])
      })

      expect(HealingService.hasHealingSpellsAvailable(state)).toBe(true)
    })

    it('returns false when no casters in party', () => {
      const fighter = createTestCharacter({ id: 'fighter', class: CharacterClass.FIGHTER })
      const roster = new Map<string, Character>([[fighter.id, fighter]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([fighter.id])
      })

      expect(HealingService.hasHealingSpellsAvailable(state)).toBe(false)
    })

    it('returns false when caster has no spell points at healing levels', () => {
      const emptyPool: SpellPointPool = {
        level1: { current: 0, max: 0 },
        level2: { current: 0, max: 0 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const priest = createTestCharacter({
        id: 'empty-priest',
        class: CharacterClass.PRIEST,
        spellPoints: { priest: emptyPool }
      })
      const roster = new Map<string, Character>([[priest.id, priest]])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([priest.id])
      })

      expect(HealingService.hasHealingSpellsAvailable(state)).toBe(false)
    })
  })

  describe('getNextHealingAction', () => {
    it('returns healing action for injured party member', () => {
      const injured = createTestCharacter({
        id: 'injured',
        name: 'Injured Fighter',
        hp: 5,
        maxHp: 10
      })
      const priest = createTestCharacter({
        id: 'priest',
        name: 'Healer',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(3)
      })
      const roster = new Map<string, Character>([
        [injured.id, injured],
        [priest.id, priest]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([injured.id, priest.id])
      })

      const action = HealingService.getNextHealingAction(state)

      expect(action).not.toBeNull()
      expect(action!.targetId).toBe('injured')
      expect(action!.casterId).toBe('priest')
      expect(action!.spellId).toBe('dios') // 5 damage → DIOS
    })

    it('returns null when no one needs healing', () => {
      const healthy = createTestCharacter({ id: 'healthy', hp: 10, maxHp: 10 })
      const priest = createTestCharacter({
        id: 'priest',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(3)
      })
      const roster = new Map<string, Character>([
        [healthy.id, healthy],
        [priest.id, priest]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([healthy.id, priest.id])
      })

      const action = HealingService.getNextHealingAction(state)

      expect(action).toBeNull()
    })

    it('returns null when no healing spells available', () => {
      const injured = createTestCharacter({ id: 'injured', hp: 5, maxHp: 10 })
      const fighter = createTestCharacter({ id: 'fighter', class: CharacterClass.FIGHTER })
      const roster = new Map<string, Character>([
        [injured.id, injured],
        [fighter.id, fighter]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([injured.id, fighter.id])
      })

      const action = HealingService.getNextHealingAction(state)

      expect(action).toBeNull()
    })

    it('selects optimal spell based on damage', () => {
      const heavilyInjured = createTestCharacter({
        id: 'heavy',
        name: 'Heavy',
        hp: 5,
        maxHp: 25 // 20 damage
      })
      const priest = createTestCharacter({
        id: 'priest',
        name: 'Priest',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(3, 2, 1) // Has DIOS, DIAL, DIALMA
      })
      const roster = new Map<string, Character>([
        [heavilyInjured.id, heavilyInjured],
        [priest.id, priest]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([heavilyInjured.id, priest.id])
      })

      const action = HealingService.getNextHealingAction(state)

      expect(action!.spellId).toBe('dialma') // 20 damage → DIALMA
    })
  })

  describe('executeHealingAction', () => {
    it('heals target by rolled amount', () => {
      // Queue dice roll: 1d8 = 5
      RandomService.queueNextValues([0.5]) // 0.5 * 8 + 1 = 5

      const injured = createTestCharacter({
        id: 'injured',
        name: 'Fighter',
        hp: 5,
        maxHp: 15
      })
      const priest = createTestCharacter({
        id: 'priest',
        name: 'Priest',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(3)
      })
      const roster = new Map<string, Character>([
        [injured.id, injured],
        [priest.id, priest]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([injured.id, priest.id])
      })

      const action = {
        casterId: 'priest',
        casterName: 'Priest',
        spellId: 'dios',
        spellName: 'DIOS',
        targetId: 'injured',
        targetName: 'Fighter',
        spellLevel: 1
      }

      const { newState, result } = HealingService.executeHealingAction(state, action)

      // Target should be healed
      const healedTarget = newState.roster.get('injured')!
      expect(healedTarget.hp).toBe(10) // 5 + 5 = 10
      expect(result.healAmount).toBe(5)
    })

    it('caps healing at maxHP', () => {
      // Queue high roll: 1d8 = 8
      RandomService.queueNextValues([0.99]) // Near max roll

      const slightlyInjured = createTestCharacter({
        id: 'slight',
        hp: 12,
        maxHp: 15 // Only 3 damage
      })
      const priest = createTestCharacter({
        id: 'priest',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(3)
      })
      const roster = new Map<string, Character>([
        [slightlyInjured.id, slightlyInjured],
        [priest.id, priest]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([slightlyInjured.id, priest.id])
      })

      const action = {
        casterId: 'priest',
        casterName: 'Priest',
        spellId: 'dios',
        spellName: 'DIOS',
        targetId: 'slight',
        targetName: 'Slight',
        spellLevel: 1
      }

      const { newState, result } = HealingService.executeHealingAction(state, action)

      const healed = newState.roster.get('slight')!
      expect(healed.hp).toBe(15) // Capped at maxHP
      expect(result.healAmount).toBeLessThanOrEqual(3) // Actual heal capped
    })

    it('deducts spell point from caster', () => {
      RandomService.queueNextValues([0.5])

      const injured = createTestCharacter({
        id: 'injured',
        hp: 5,
        maxHp: 15
      })
      const priest = createTestCharacter({
        id: 'priest',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(3) // 3 points at L1
      })
      const roster = new Map<string, Character>([
        [injured.id, injured],
        [priest.id, priest]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([injured.id, priest.id])
      })

      const action = {
        casterId: 'priest',
        casterName: 'Priest',
        spellId: 'dios',
        spellName: 'DIOS',
        targetId: 'injured',
        targetName: 'Fighter',
        spellLevel: 1
      }

      const { newState } = HealingService.executeHealingAction(state, action)

      const updatedCaster = newState.roster.get('priest')!
      expect(updatedCaster.spellPoints!.priest!.level1.current).toBe(2) // 3 - 1 = 2
    })

    it('cures status effect with MADI', () => {
      const poisoned = createTestCharacter({
        id: 'poisoned',
        hp: 5,
        maxHp: 20,
        status: CharacterStatus.POISONED
      })
      const priest = createTestCharacter({
        id: 'priest',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(0, 0, 0, 1) // 1 MADI
      })
      const roster = new Map<string, Character>([
        [poisoned.id, poisoned],
        [priest.id, priest]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([poisoned.id, priest.id])
      })

      const action = {
        casterId: 'priest',
        casterName: 'Priest',
        spellId: 'madi',
        spellName: 'MADI',
        targetId: 'poisoned',
        targetName: 'Poisoned',
        spellLevel: 6
      }

      const { newState, result } = HealingService.executeHealingAction(state, action)

      const healed = newState.roster.get('poisoned')!
      expect(healed.hp).toBe(20) // Full heal
      expect(healed.status).toBe(CharacterStatus.OK) // Status cured
      expect(result.statusCured).toBe(true)
    })

    it('generates correct message', () => {
      RandomService.queueNextValues([0.5])

      const injured = createTestCharacter({
        id: 'injured',
        name: 'Fighter',
        hp: 5,
        maxHp: 15
      })
      const priest = createTestCharacter({
        id: 'priest',
        name: 'Healer',
        class: CharacterClass.PRIEST,
        spellPoints: createPriestSpellPoints(3)
      })
      const roster = new Map<string, Character>([
        [injured.id, injured],
        [priest.id, priest]
      ])
      const state = createTestGameState({
        roster,
        party: createPartyWithMembers([injured.id, priest.id])
      })

      const action = {
        casterId: 'priest',
        casterName: 'Healer',
        spellId: 'dios',
        spellName: 'DIOS',
        targetId: 'injured',
        targetName: 'Fighter',
        spellLevel: 1
      }

      const { result } = HealingService.executeHealingAction(state, action)

      expect(result.message).toContain('Healer')
      expect(result.message).toContain('DIOS')
      expect(result.message).toContain('Fighter')
      expect(result.message).toContain('5') // heal amount
    })
  })
})
