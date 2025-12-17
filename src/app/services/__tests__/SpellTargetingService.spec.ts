import { SpellTargetingService, TargetingMode, CombatTargetingMode } from '../SpellTargetingService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'
import { Character } from '@models/Character'
import { SpellData } from '../SpellCastingService'

/**
 * Helper: Create minimal SpellData for targeting tests
 */
function createSpellData(overrides: Partial<SpellData>): SpellData {
  return {
    id: 'test-spell',
    name: 'Test Spell',
    level: 1,
    casterType: 'priest',
    target: 'single',
    castableIn: ['dungeon'],
    description: 'A test spell',
    ...overrides
  } as SpellData
}

describe('SpellTargetingService', () => {
  describe('getTargetingMode', () => {
    it('returns "none" for self-targeting spells', () => {
      const spell = createSpellData({ target: 'self' })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('none')
    })

    it('returns "none" for caster-targeting spells', () => {
      const spell = createSpellData({ target: 'caster' })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('none')
    })

    it('returns "none" for party-wide spells', () => {
      const spell = createSpellData({ target: 'party' })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('none')
    })

    it('returns "none" for all_allies spells', () => {
      const spell = createSpellData({ target: 'all_allies' })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('none')
    })

    it('returns "none" for all_enemies spells', () => {
      const spell = createSpellData({ target: 'all_enemies' })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('none')
    })

    it('returns "character" for single-target spells', () => {
      const spell = createSpellData({ target: 'single' })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('character')
    })

    it('returns "character" for dead_ally resurrection spells', () => {
      const spell = createSpellData({ target: 'dead_ally', resurrection: true })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('character')
    })

    it('returns "character" for dead_or_ashed_ally spells', () => {
      const spell = createSpellData({ target: 'dead_or_ashed_ally', resurrection: true })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('character')
    })

    it('returns "monster_group" for group-targeting spells', () => {
      const spell = createSpellData({ target: 'group' })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('monster_group')
    })

    it('returns "none" for unknown target types', () => {
      const spell = createSpellData({ target: 'unknown' as SpellData['target'] })
      expect(SpellTargetingService.getTargetingMode(spell)).toBe('none')
    })
  })

  describe('getCombatTargetingMode', () => {
    describe('offensive single-target spells (monster targeting)', () => {
      it('returns monster_group for HALITO (fire damage spell)', () => {
        const halito = createSpellData({
          target: 'single',
          category: 'offensive',
          damage: { dice: '1d8', type: 'fire' }
        })
        expect(SpellTargetingService.getCombatTargetingMode(halito)).toBe('monster_group')
      })

      it('returns monster_group for BADIOS (divine damage spell)', () => {
        const badios = createSpellData({
          target: 'single',
          category: 'offensive',
          damage: { dice: '1d8', type: 'divine' }
        })
        expect(SpellTargetingService.getCombatTargetingMode(badios)).toBe('monster_group')
      })

      it('returns monster_group when category is offensive even without damage property', () => {
        const offensiveSpell = createSpellData({
          target: 'single',
          category: 'offensive'
        })
        expect(SpellTargetingService.getCombatTargetingMode(offensiveSpell)).toBe('monster_group')
      })

      it('returns monster_group when spell has damage property even without offensive category', () => {
        const damageSpell = createSpellData({
          target: 'single',
          damage: { dice: '2d6' }
        })
        expect(SpellTargetingService.getCombatTargetingMode(damageSpell)).toBe('monster_group')
      })
    })

    describe('support single-target spells (party member targeting)', () => {
      it('returns party_member for DIOS (healing spell)', () => {
        const dios = createSpellData({
          target: 'single',
          category: 'healing',
          healing: { dice: '1d8' }
        })
        expect(SpellTargetingService.getCombatTargetingMode(dios)).toBe('party_member')
      })

      it('returns party_member for DIALKO (cure paralysis)', () => {
        const dialko = createSpellData({
          target: 'single',
          category: 'support',
          statusCure: 'paralysis'
        })
        expect(SpellTargetingService.getCombatTargetingMode(dialko)).toBe('party_member')
      })

      it('returns party_member for LATUMOFIS (cure poison)', () => {
        const latumofis = createSpellData({
          target: 'single',
          category: 'support',
          statusCure: 'poison'
        })
        expect(SpellTargetingService.getCombatTargetingMode(latumofis)).toBe('party_member')
      })

      it('returns party_member for buff spell without damage', () => {
        const buffSpell = createSpellData({
          target: 'single',
          category: 'support',
          acModifier: -2
        })
        expect(SpellTargetingService.getCombatTargetingMode(buffSpell)).toBe('party_member')
      })
    })

    describe('group target spells (monster targeting)', () => {
      it('returns monster_group for MAHALITO (group fire damage)', () => {
        const mahalito = createSpellData({
          target: 'group',
          category: 'offensive',
          damage: { dice: '4d6', type: 'fire' }
        })
        expect(SpellTargetingService.getCombatTargetingMode(mahalito)).toBe('monster_group')
      })

      it('returns monster_group for KATINO (group sleep)', () => {
        const katino = createSpellData({
          target: 'group',
          category: 'disabling'
        })
        expect(SpellTargetingService.getCombatTargetingMode(katino)).toBe('monster_group')
      })
    })

    describe('auto-resolve spells (no targeting)', () => {
      it('returns none for self-targeting spells', () => {
        const spell = createSpellData({ target: 'self' })
        expect(SpellTargetingService.getCombatTargetingMode(spell)).toBe('none')
      })

      it('returns none for caster-targeting spells', () => {
        const spell = createSpellData({ target: 'caster' })
        expect(SpellTargetingService.getCombatTargetingMode(spell)).toBe('none')
      })

      it('returns none for party-wide spells', () => {
        const spell = createSpellData({ target: 'party' })
        expect(SpellTargetingService.getCombatTargetingMode(spell)).toBe('none')
      })

      it('returns none for all_allies spells', () => {
        const spell = createSpellData({ target: 'all_allies' })
        expect(SpellTargetingService.getCombatTargetingMode(spell)).toBe('none')
      })

      it('returns none for all_enemies spells', () => {
        const spell = createSpellData({ target: 'all_enemies' })
        expect(SpellTargetingService.getCombatTargetingMode(spell)).toBe('none')
      })
    })

    describe('resurrection spells (party member targeting)', () => {
      it('returns party_member for dead_ally resurrection', () => {
        const di = createSpellData({
          target: 'dead_ally',
          resurrection: true
        })
        expect(SpellTargetingService.getCombatTargetingMode(di)).toBe('party_member')
      })

      it('returns party_member for dead_or_ashed_ally resurrection', () => {
        const kadorto = createSpellData({
          target: 'dead_or_ashed_ally',
          resurrection: true
        })
        expect(SpellTargetingService.getCombatTargetingMode(kadorto)).toBe('party_member')
      })
    })

    describe('edge cases', () => {
      it('returns none for unknown target types', () => {
        const spell = createSpellData({ target: 'unknown' as SpellData['target'] })
        expect(SpellTargetingService.getCombatTargetingMode(spell)).toBe('none')
      })

      it('prioritizes damage property over category for single-target', () => {
        // Even if category is not offensive, having damage means it targets monsters
        const spell = createSpellData({
          target: 'single',
          category: 'healing', // Misleading category, but damage property wins
          damage: { dice: '1d6' }
        })
        expect(SpellTargetingService.getCombatTargetingMode(spell)).toBe('monster_group')
      })
    })
  })

  describe('getTargetingPrompt', () => {
    it('returns "HEAL WHO?" for healing spells', () => {
      const spell = createSpellData({ healing: { dice: '1d8' } })
      expect(SpellTargetingService.getTargetingPrompt(spell)).toBe('HEAL WHO?')
    })

    it('returns "RESURRECT WHO?" for resurrection spells', () => {
      const spell = createSpellData({ resurrection: true })
      expect(SpellTargetingService.getTargetingPrompt(spell)).toBe('RESURRECT WHO?')
    })

    it('returns "CURE WHO?" for status cure spells', () => {
      const spell = createSpellData({ statusCure: 'poison' })
      expect(SpellTargetingService.getTargetingPrompt(spell)).toBe('CURE WHO?')
    })

    it('returns "TARGET WHICH GROUP?" for group spells', () => {
      const spell = createSpellData({ target: 'group' })
      expect(SpellTargetingService.getTargetingPrompt(spell)).toBe('TARGET WHICH GROUP?')
    })

    it('returns "CAST ON WHO?" for other spells', () => {
      const spell = createSpellData({})
      expect(SpellTargetingService.getTargetingPrompt(spell)).toBe('CAST ON WHO?')
    })
  })

  describe('isEligibleTarget', () => {
    describe('single target spells (healing, buffs)', () => {
      const healingSpell = createSpellData({ target: 'single', healing: { dice: '1d8' } })

      it('accepts OK status characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isEligibleTarget(healingSpell, char)).toBe(true)
      })

      it('accepts POISONED characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.POISONED })
        expect(SpellTargetingService.isEligibleTarget(healingSpell, char)).toBe(true)
      })

      it('accepts PARALYZED characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.PARALYZED })
        expect(SpellTargetingService.isEligibleTarget(healingSpell, char)).toBe(true)
      })

      it('accepts ASLEEP characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.ASLEEP })
        expect(SpellTargetingService.isEligibleTarget(healingSpell, char)).toBe(true)
      })

      it('rejects DEAD characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.DEAD })
        expect(SpellTargetingService.isEligibleTarget(healingSpell, char)).toBe(false)
      })

      it('rejects ASHES characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.ASHES })
        expect(SpellTargetingService.isEligibleTarget(healingSpell, char)).toBe(false)
      })

      it('rejects LOST characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.LOST })
        expect(SpellTargetingService.isEligibleTarget(healingSpell, char)).toBe(false)
      })
    })

    describe('dead_ally spells (DI resurrection)', () => {
      const diSpell = createSpellData({ target: 'dead_ally', resurrection: true })

      it('accepts DEAD characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.DEAD })
        expect(SpellTargetingService.isEligibleTarget(diSpell, char)).toBe(true)
      })

      it('rejects OK characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isEligibleTarget(diSpell, char)).toBe(false)
      })

      it('rejects ASHES characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.ASHES })
        expect(SpellTargetingService.isEligibleTarget(diSpell, char)).toBe(false)
      })

      it('rejects LOST characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.LOST })
        expect(SpellTargetingService.isEligibleTarget(diSpell, char)).toBe(false)
      })
    })

    describe('dead_or_ashed_ally spells (KADORTO resurrection)', () => {
      const kadortoSpell = createSpellData({ target: 'dead_or_ashed_ally', resurrection: true })

      it('accepts DEAD characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.DEAD })
        expect(SpellTargetingService.isEligibleTarget(kadortoSpell, char)).toBe(true)
      })

      it('accepts ASHES characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.ASHES })
        expect(SpellTargetingService.isEligibleTarget(kadortoSpell, char)).toBe(true)
      })

      it('rejects OK characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isEligibleTarget(kadortoSpell, char)).toBe(false)
      })

      it('rejects LOST characters', () => {
        const char = createTestCharacter({ status: CharacterStatus.LOST })
        expect(SpellTargetingService.isEligibleTarget(kadortoSpell, char)).toBe(false)
      })
    })
  })

  describe('isValidCharacterTarget', () => {
    describe('healing spells', () => {
      const healingSpell = createSpellData({ target: 'single', healing: { dice: '1d8' } })

      it('returns true when character needs healing (HP < maxHP)', () => {
        const injured = createTestCharacter({ hp: 5, maxHp: 10 })
        expect(SpellTargetingService.isValidCharacterTarget(healingSpell, injured)).toBe(true)
      })

      it('returns false when character at full HP', () => {
        const healthy = createTestCharacter({ hp: 10, maxHp: 10 })
        expect(SpellTargetingService.isValidCharacterTarget(healingSpell, healthy)).toBe(false)
      })

      it('returns true when character is 1 HP below max', () => {
        const slightlyInjured = createTestCharacter({ hp: 9, maxHp: 10 })
        expect(SpellTargetingService.isValidCharacterTarget(healingSpell, slightlyInjured)).toBe(true)
      })

      it('returns false for dead characters even if they need "healing"', () => {
        const dead = createTestCharacter({ hp: 0, maxHp: 10, status: CharacterStatus.DEAD })
        expect(SpellTargetingService.isValidCharacterTarget(healingSpell, dead)).toBe(false)
      })
    })

    describe('poison cure spells', () => {
      const curePoison = createSpellData({ target: 'single', statusCure: 'poison' })

      it('returns true for POISONED character', () => {
        const poisoned = createTestCharacter({ status: CharacterStatus.POISONED })
        expect(SpellTargetingService.isValidCharacterTarget(curePoison, poisoned)).toBe(true)
      })

      it('returns false for OK character', () => {
        const healthy = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isValidCharacterTarget(curePoison, healthy)).toBe(false)
      })

      it('returns false for PARALYZED character', () => {
        const paralyzed = createTestCharacter({ status: CharacterStatus.PARALYZED })
        expect(SpellTargetingService.isValidCharacterTarget(curePoison, paralyzed)).toBe(false)
      })

      it('returns false for ASLEEP character', () => {
        const asleep = createTestCharacter({ status: CharacterStatus.ASLEEP })
        expect(SpellTargetingService.isValidCharacterTarget(curePoison, asleep)).toBe(false)
      })
    })

    describe('paralysis cure spells', () => {
      const cureParalysis = createSpellData({ target: 'single', statusCure: 'paralysis' })

      it('returns true for PARALYZED character', () => {
        const paralyzed = createTestCharacter({ status: CharacterStatus.PARALYZED })
        expect(SpellTargetingService.isValidCharacterTarget(cureParalysis, paralyzed)).toBe(true)
      })

      it('returns false for OK character', () => {
        const healthy = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isValidCharacterTarget(cureParalysis, healthy)).toBe(false)
      })

      it('returns false for POISONED character', () => {
        const poisoned = createTestCharacter({ status: CharacterStatus.POISONED })
        expect(SpellTargetingService.isValidCharacterTarget(cureParalysis, poisoned)).toBe(false)
      })
    })

    describe('asleep cure spells', () => {
      const cureAsleep = createSpellData({ target: 'single', statusCure: 'asleep' })

      it('returns true for ASLEEP character', () => {
        const asleep = createTestCharacter({ status: CharacterStatus.ASLEEP })
        expect(SpellTargetingService.isValidCharacterTarget(cureAsleep, asleep)).toBe(true)
      })

      it('returns false for OK character', () => {
        const healthy = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isValidCharacterTarget(cureAsleep, healthy)).toBe(false)
      })
    })

    describe('cure all status spells', () => {
      const cureAll = createSpellData({ target: 'single', statusCure: 'all' })

      it('returns true for POISONED character', () => {
        const poisoned = createTestCharacter({ status: CharacterStatus.POISONED })
        expect(SpellTargetingService.isValidCharacterTarget(cureAll, poisoned)).toBe(true)
      })

      it('returns true for PARALYZED character', () => {
        const paralyzed = createTestCharacter({ status: CharacterStatus.PARALYZED })
        expect(SpellTargetingService.isValidCharacterTarget(cureAll, paralyzed)).toBe(true)
      })

      it('returns true for ASLEEP character', () => {
        const asleep = createTestCharacter({ status: CharacterStatus.ASLEEP })
        expect(SpellTargetingService.isValidCharacterTarget(cureAll, asleep)).toBe(true)
      })

      it('returns false for OK character', () => {
        const healthy = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isValidCharacterTarget(cureAll, healthy)).toBe(false)
      })
    })

    describe('resurrection spells', () => {
      const diSpell = createSpellData({ target: 'dead_ally', resurrection: true })

      it('returns true for DEAD character', () => {
        const dead = createTestCharacter({ status: CharacterStatus.DEAD })
        expect(SpellTargetingService.isValidCharacterTarget(diSpell, dead)).toBe(true)
      })

      it('returns false for OK character', () => {
        const alive = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isValidCharacterTarget(diSpell, alive)).toBe(false)
      })
    })

    describe('buff spells (no special validation)', () => {
      const buffSpell = createSpellData({ target: 'single', acModifier: -2 })

      it('returns true for any living character', () => {
        const char = createTestCharacter({ status: CharacterStatus.OK })
        expect(SpellTargetingService.isValidCharacterTarget(buffSpell, char)).toBe(true)
      })

      it('returns true for character at full HP', () => {
        const healthy = createTestCharacter({ hp: 10, maxHp: 10, status: CharacterStatus.OK })
        expect(SpellTargetingService.isValidCharacterTarget(buffSpell, healthy)).toBe(true)
      })

      it('returns false for dead character', () => {
        const dead = createTestCharacter({ status: CharacterStatus.DEAD })
        expect(SpellTargetingService.isValidCharacterTarget(buffSpell, dead)).toBe(false)
      })
    })
  })

  describe('getValidCharacterTargets', () => {
    it('filters party to only valid healing targets', () => {
      const healingSpell = createSpellData({ target: 'single', healing: { dice: '1d8' } })
      const injured = createTestCharacter({ id: 'injured', hp: 5, maxHp: 10 })
      const healthy = createTestCharacter({ id: 'healthy', hp: 10, maxHp: 10 })
      const dead = createTestCharacter({ id: 'dead', hp: 0, maxHp: 10, status: CharacterStatus.DEAD })

      const party = [injured, healthy, dead]
      const validTargets = SpellTargetingService.getValidCharacterTargets(healingSpell, party)

      expect(validTargets).toHaveLength(1)
      expect(validTargets[0].id).toBe('injured')
    })

    it('filters party to only valid resurrection targets', () => {
      const diSpell = createSpellData({ target: 'dead_ally', resurrection: true })
      const alive = createTestCharacter({ id: 'alive', status: CharacterStatus.OK })
      const dead1 = createTestCharacter({ id: 'dead1', status: CharacterStatus.DEAD })
      const dead2 = createTestCharacter({ id: 'dead2', status: CharacterStatus.DEAD })
      const ashes = createTestCharacter({ id: 'ashes', status: CharacterStatus.ASHES })

      const party = [alive, dead1, dead2, ashes]
      const validTargets = SpellTargetingService.getValidCharacterTargets(diSpell, party)

      expect(validTargets).toHaveLength(2)
      expect(validTargets.map(c => c.id)).toEqual(['dead1', 'dead2'])
    })

    it('returns empty array when no valid targets', () => {
      const healingSpell = createSpellData({ target: 'single', healing: { dice: '1d8' } })
      const healthy1 = createTestCharacter({ id: 'h1', hp: 10, maxHp: 10 })
      const healthy2 = createTestCharacter({ id: 'h2', hp: 15, maxHp: 15 })

      const party = [healthy1, healthy2]
      const validTargets = SpellTargetingService.getValidCharacterTargets(healingSpell, party)

      expect(validTargets).toHaveLength(0)
    })
  })

  describe('getEligibleCharacterTargets', () => {
    it('returns all living characters for healing spells', () => {
      const healingSpell = createSpellData({ target: 'single', healing: { dice: '1d8' } })
      const char1 = createTestCharacter({ id: 'c1', hp: 5, maxHp: 10, status: CharacterStatus.OK })
      const char2 = createTestCharacter({ id: 'c2', hp: 10, maxHp: 10, status: CharacterStatus.POISONED })
      const dead = createTestCharacter({ id: 'dead', status: CharacterStatus.DEAD })

      const party = [char1, char2, dead]
      const eligible = SpellTargetingService.getEligibleCharacterTargets(healingSpell, party)

      expect(eligible).toHaveLength(2)
      expect(eligible.map(c => c.id)).toEqual(['c1', 'c2'])
    })

    it('returns only dead characters for resurrection spells', () => {
      const diSpell = createSpellData({ target: 'dead_ally', resurrection: true })
      const alive = createTestCharacter({ id: 'alive', status: CharacterStatus.OK })
      const dead = createTestCharacter({ id: 'dead', status: CharacterStatus.DEAD })

      const party = [alive, dead]
      const eligible = SpellTargetingService.getEligibleCharacterTargets(diSpell, party)

      expect(eligible).toHaveLength(1)
      expect(eligible[0].id).toBe('dead')
    })

    it('returns dead and ashed for KADORTO-type spells', () => {
      const kadortoSpell = createSpellData({ target: 'dead_or_ashed_ally', resurrection: true })
      const alive = createTestCharacter({ id: 'alive', status: CharacterStatus.OK })
      const dead = createTestCharacter({ id: 'dead', status: CharacterStatus.DEAD })
      const ashes = createTestCharacter({ id: 'ashes', status: CharacterStatus.ASHES })
      const lost = createTestCharacter({ id: 'lost', status: CharacterStatus.LOST })

      const party = [alive, dead, ashes, lost]
      const eligible = SpellTargetingService.getEligibleCharacterTargets(kadortoSpell, party)

      expect(eligible).toHaveLength(2)
      expect(eligible.map(c => c.id)).toEqual(['dead', 'ashes'])
    })
  })

  describe('getNoValidTargetsMessage', () => {
    it('returns appropriate message for healing spells', () => {
      const spell = createSpellData({ healing: { dice: '1d8' } })
      expect(SpellTargetingService.getNoValidTargetsMessage(spell))
        .toBe('No one needs healing - all party members are at full HP.')
    })

    it('returns appropriate message for poison cure', () => {
      const spell = createSpellData({ statusCure: 'poison' })
      expect(SpellTargetingService.getNoValidTargetsMessage(spell))
        .toBe('No one is poisoned.')
    })

    it('returns appropriate message for paralysis cure', () => {
      const spell = createSpellData({ statusCure: 'paralysis' })
      expect(SpellTargetingService.getNoValidTargetsMessage(spell))
        .toBe('No one is paralyzed.')
    })

    it('returns appropriate message for asleep cure', () => {
      const spell = createSpellData({ statusCure: 'asleep' })
      expect(SpellTargetingService.getNoValidTargetsMessage(spell))
        .toBe('No one is asleep.')
    })

    it('returns appropriate message for cure all status', () => {
      const spell = createSpellData({ statusCure: 'all' })
      expect(SpellTargetingService.getNoValidTargetsMessage(spell))
        .toBe('No one has a status ailment to cure.')
    })

    it('returns appropriate message for resurrection spells', () => {
      const spell = createSpellData({ resurrection: true })
      expect(SpellTargetingService.getNoValidTargetsMessage(spell))
        .toBe('No one needs resurrection.')
    })

    it('returns generic message for other spells', () => {
      const spell = createSpellData({})
      expect(SpellTargetingService.getNoValidTargetsMessage(spell))
        .toBe('No valid targets available.')
    })
  })

  describe('integration: eligibility vs validity separation', () => {
    it('shows all living party members in dialog but only enables injured ones', () => {
      const healingSpell = createSpellData({ target: 'single', healing: { dice: '1d8' } })
      const injured = createTestCharacter({ id: 'injured', hp: 5, maxHp: 10 })
      const healthy = createTestCharacter({ id: 'healthy', hp: 10, maxHp: 10 })
      const poisoned = createTestCharacter({ id: 'poisoned', hp: 3, maxHp: 10, status: CharacterStatus.POISONED })

      const party = [injured, healthy, poisoned]

      // All three should be SHOWN in the dialog
      const eligible = SpellTargetingService.getEligibleCharacterTargets(healingSpell, party)
      expect(eligible).toHaveLength(3)

      // Only 2 should have Select button ENABLED
      const valid = SpellTargetingService.getValidCharacterTargets(healingSpell, party)
      expect(valid).toHaveLength(2)
      expect(valid.map(c => c.id)).toEqual(['injured', 'poisoned'])
    })

    it('shows only dead in dialog and all dead are valid for resurrection', () => {
      const diSpell = createSpellData({ target: 'dead_ally', resurrection: true })
      const alive = createTestCharacter({ id: 'alive', status: CharacterStatus.OK })
      const dead1 = createTestCharacter({ id: 'dead1', status: CharacterStatus.DEAD })
      const dead2 = createTestCharacter({ id: 'dead2', status: CharacterStatus.DEAD })

      const party = [alive, dead1, dead2]

      // Only dead should be shown
      const eligible = SpellTargetingService.getEligibleCharacterTargets(diSpell, party)
      expect(eligible).toHaveLength(2)

      // All dead are valid resurrection targets
      const valid = SpellTargetingService.getValidCharacterTargets(diSpell, party)
      expect(valid).toHaveLength(2)
    })
  })
})
