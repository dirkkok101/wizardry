/**
 * DungeonSpellEffectService - Handles spell effect application in dungeon context
 *
 * Extracted from MazeComponent's 240-line applyDungeonSpellEffect() method.
 * Pure functions that process spell effects and return results.
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { DungeonState } from '@models/Dungeon'
import { SpellData } from '@services/SpellCastingService'
import { RandomService } from '@services/RandomService'
import { LightService } from '@services/LightService'

/**
 * Result from applying a dungeon spell effect
 */
export interface DungeonSpellResult {
  message: string
  updatedCaster?: Character
  updatedTarget?: Character
  partyHeal?: number // Heal amount for all living party members
  dungeonUpdate?: Partial<DungeonState>
  navigateTo?: string
  identifyMonsters?: boolean // Flag to identify current combat monsters
}

/**
 * Context needed for spell effects that depend on dungeon state
 */
export interface DungeonSpellContext {
  dungeon: DungeonState | undefined
  currentLevel: number
  position: { x: number; y: number } | undefined
  facing: string
}

/**
 * Pure service for processing dungeon spell effects
 */
export const DungeonSpellEffectService = {
  /**
   * Apply a spell effect in dungeon context
   */
  applyEffect(
    spell: SpellData,
    caster: Character,
    target: Character | null,
    context: DungeonSpellContext
  ): DungeonSpellResult {
    // Handle healing spells (single target)
    if (spell.healing && target) {
      return this.applyHealingSpell(spell, caster, target)
    }

    // Handle party healing (MADI)
    if (spell.healing && spell.target === 'party') {
      return this.applyPartyHealing(spell, caster)
    }

    // Handle status cure spells
    if (spell.statusCure && target) {
      return this.applyStatusCure(spell, caster, target)
    }

    // Handle resurrection spells
    if (spell.resurrection && target) {
      return this.applyResurrection(spell, caster, target)
    }

    // Handle utility spells
    if (spell.utility) {
      return this.applyUtilitySpell(spell, caster, context)
    }

    // Handle expedition AC buff spells
    if (spell.acModifier && spell.buffDuration === 'expedition') {
      return this.applyExpeditionBuff(spell, caster, context.dungeon)
    }

    // Default case
    return {
      message: `${caster.name} casts ${spell.name}!`
    }
  },

  /**
   * Apply healing spell to single target
   */
  applyHealingSpell(
    spell: SpellData,
    caster: Character,
    target: Character
  ): DungeonSpellResult {
    if (spell.healing?.type === 'full') {
      const updatedTarget = { ...target, hp: target.maxHp }
      return {
        message: `${caster.name} casts ${spell.name}! ${target.name} is fully healed!`,
        updatedTarget
      }
    }

    if (spell.healing?.dice) {
      const healAmount = RandomService.rollDiceNotation(spell.healing.dice)
      const newHp = Math.min(target.hp + healAmount, target.maxHp)
      const actualHeal = newHp - target.hp
      const updatedTarget = { ...target, hp: newHp }
      return {
        message: `${caster.name} casts ${spell.name}! ${target.name} heals ${actualHeal} HP.`,
        updatedTarget
      }
    }

    return { message: `${caster.name} casts ${spell.name}!` }
  },

  /**
   * Apply party-wide healing (MADI)
   */
  applyPartyHealing(spell: SpellData, caster: Character): DungeonSpellResult {
    const healAmount = spell.healing?.dice
      ? RandomService.rollDiceNotation(spell.healing.dice)
      : 0
    return {
      message: `${caster.name} casts ${spell.name}! The party heals ${healAmount} HP.`,
      partyHeal: healAmount
    }
  },

  /**
   * Apply status cure spell
   */
  applyStatusCure(
    spell: SpellData,
    caster: Character,
    target: Character
  ): DungeonSpellResult {
    let cured = false
    const updatedTarget = { ...target }

    if (spell.statusCure === 'paralysis' && target.status === CharacterStatus.PARALYZED) {
      updatedTarget.status = CharacterStatus.OK
      cured = true
    } else if (spell.statusCure === 'poison' && target.status === CharacterStatus.POISONED) {
      updatedTarget.status = CharacterStatus.OK
      cured = true
    } else if (spell.statusCure === 'all') {
      if ([CharacterStatus.PARALYZED, CharacterStatus.POISONED, CharacterStatus.ASLEEP].includes(target.status)) {
        updatedTarget.status = CharacterStatus.OK
        cured = true
      }
    }

    if (cured) {
      return {
        message: `${caster.name} casts ${spell.name}! ${target.name}'s ailment is cured!`,
        updatedTarget
      }
    }

    return {
      message: `${caster.name} casts ${spell.name}! But ${target.name} is not afflicted.`
    }
  },

  /**
   * Apply resurrection spell
   */
  applyResurrection(
    spell: SpellData,
    caster: Character,
    target: Character
  ): DungeonSpellResult {
    const successRate = spell.resurrectionSuccessRate || 0.9
    const success = RandomService.roll(successRate)

    if (success) {
      const updatedTarget = {
        ...target,
        status: CharacterStatus.OK,
        hp: 1 // Resurrect with 1 HP
      }
      return {
        message: `${caster.name} casts ${spell.name}! ${target.name} is resurrected!`,
        updatedTarget
      }
    }

    // Failed resurrection - DEAD -> ASHES, ASHES -> permanently lost
    if (target.status === CharacterStatus.DEAD) {
      const updatedTarget = { ...target, status: CharacterStatus.ASHES }
      return {
        message: `${caster.name} casts ${spell.name}... but ${target.name} crumbles to ashes!`,
        updatedTarget
      }
    }

    return {
      message: `${caster.name} casts ${spell.name}... but ${target.name} is lost forever!`
    }
  },

  /**
   * Apply utility spell
   */
  applyUtilitySpell(
    spell: SpellData,
    caster: Character,
    context: DungeonSpellContext
  ): DungeonSpellResult {
    // DUMAPIC - Show coordinates
    if (spell.utility === 'show_coordinates') {
      return {
        message: `${spell.name}: Level ${context.currentLevel}, Position (${context.position?.x}, ${context.position?.y}), Facing ${context.facing}`
      }
    }

    // MILWA/LOMILWA - Light
    if (spell.utility === 'extended_light') {
      return this.applyLightSpell(spell, caster, context.dungeon)
    }

    // LOKTOFEIT - Recall to town
    if (spell.utility === 'recall') {
      return this.applyRecallSpell(spell, caster)
    }

    // MALOR - Teleport (not implemented)
    if (spell.utility === 'teleport') {
      return {
        message: `${caster.name} casts ${spell.name}... but teleportation is not yet implemented.`
      }
    }

    // CALFO - Identify trap
    if (spell.utility === 'identify_trap') {
      return {
        message: `${caster.name} casts ${spell.name}! Any traps ahead will be revealed.`
      }
    }

    // KANDI - Locate body
    if (spell.utility === 'locate_person') {
      return {
        message: `${caster.name} casts ${spell.name}! Lost souls can be sensed...`
      }
    }

    // LATUMAPIC - Identify foes
    if (spell.utility === 'identify_foe') {
      return this.applyIdentifyFoeSpell(spell, caster, context.dungeon)
    }

    return { message: `${caster.name} casts ${spell.name}!` }
  },

  /**
   * Apply light spell (MILWA/LOMILWA)
   */
  applyLightSpell(
    spell: SpellData,
    caster: Character,
    dungeon: DungeonState | undefined
  ): DungeonSpellResult {
    if (!dungeon) {
      return { message: `${spell.name} can only be cast in the dungeon.` }
    }

    const canCast = LightService.canCastLightSpell(dungeon)
    if (!canCast.canCast) {
      return { message: `${caster.name} tries to cast ${spell.name}... ${canCast.reason}` }
    }

    const isLomilwa = spell.id === 'lomilwa' || spell.id === 'lomilwa_priest'
    const spellType = isLomilwa ? 'LOMILWA' : 'MILWA'
    const newDungeonState = LightService.activateLightSpell(dungeon, spellType)

    const durationDisplay = LightService.getSpellDurationDisplay(newDungeonState)
    const durationText = durationDisplay === 'permanent' ? '' : ` (${durationDisplay})`

    return {
      message: `${caster.name} casts ${spell.name}! The area is illuminated${durationText}.`,
      dungeonUpdate: {
        lightActive: newDungeonState.lightActive,
        lightRadius: newDungeonState.lightRadius,
        lightSpellType: newDungeonState.lightSpellType,
        lightDurationRemaining: newDungeonState.lightDurationRemaining
      }
    }
  },

  /**
   * Apply recall spell (LOKTOFEIT)
   */
  applyRecallSpell(spell: SpellData, caster: Character): DungeonSpellResult {
    const successRate = Math.min((caster.level || 1) * 2, 95) / 100
    const success = RandomService.roll(successRate)

    if (success) {
      return {
        message: `${caster.name} casts ${spell.name}! The party is recalled to town!`,
        navigateTo: '/castle-menu'
      }
    }

    return {
      message: `${caster.name} casts ${spell.name}... but the spell fizzles!`
    }
  },

  /**
   * Apply identify foe spell (LATUMAPIC)
   */
  applyIdentifyFoeSpell(
    spell: SpellData,
    caster: Character,
    dungeon: DungeonState | undefined
  ): DungeonSpellResult {
    if (!dungeon) {
      return { message: `${spell.name} can only be cast in the dungeon.` }
    }

    if (dungeon.latumapicActive) {
      return { message: `${caster.name} casts ${spell.name}... but monsters are already identified.` }
    }

    return {
      message: `${caster.name} casts ${spell.name}! All monsters are now identified for this expedition.`,
      dungeonUpdate: {
        latumapicActive: true
      },
      identifyMonsters: true
    }
  },

  /**
   * Apply expedition buff spell (MAPORFIC)
   */
  applyExpeditionBuff(
    spell: SpellData,
    caster: Character,
    dungeon: DungeonState | undefined
  ): DungeonSpellResult {
    if (!dungeon) {
      return { message: `${spell.name} can only be cast in the dungeon.` }
    }

    if ((dungeon.activeExpeditionSpells ?? []).includes(spell.id)) {
      return { message: `${caster.name} casts ${spell.name}... but its protection is already active.` }
    }

    return {
      message: `${caster.name} casts ${spell.name}! Party defenses strengthened for the expedition.`,
      dungeonUpdate: {
        expeditionAcBuff: (dungeon.expeditionAcBuff ?? 0) + (spell.acModifier ?? 0),
        activeExpeditionSpells: [...(dungeon.activeExpeditionSpells ?? []), spell.id]
      }
    }
  }
}
