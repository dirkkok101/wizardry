import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { GameState } from '@models/GameState'
import { SpellPointPool } from '@models/SpellPoints'
import * as PartyService from './PartyService'
import { LevelUpService } from './LevelUpService'
import { SpellLearningService } from './SpellLearningService'

export enum RoomType {
  STABLES = 'STABLES',
  BARRACKS = 'BARRACKS',
  DOUBLE = 'DOUBLE',
  PRIVATE = 'PRIVATE',
  ROYAL_SUITE = 'ROYAL_SUITE'
}

interface ValidationResult {
  allowed: boolean
  reason?: string
}

interface RestResult {
  updatedCharacter: Character
  updatedState: GameState
  isFullyHealed: boolean
  goldSpent: number
  hpRecovered: number
  spellPointsRestored: boolean
}

export interface PartyHealPlan {
  roomTier: RoomType
  weeksNeeded: number
  totalCost: number
  canAffordFull: boolean
  hpPerCharacter: Map<string, number> // charId -> HP to heal
}

export interface CharacterRestResult {
  hpBefore: number
  hpAfter: number
  hpGained: number
  spellsRestored: boolean
}

export interface LevelUpDisplayData {
  characterId: string
  characterName: string
  newLevel: number
  hpIncrease: number
  statChanges: Record<string, number>
  newSpells: string[]
}

export interface PartyRestResult {
  weeksRested: number
  goldSpent: number
  goldRemaining: number
  perCharacter: Map<string, CharacterRestResult>
  levelUps: LevelUpDisplayData[]
  updatedState: GameState
}

const ROOM_COSTS: Record<RoomType, number> = {
  [RoomType.STABLES]: 0,
  [RoomType.BARRACKS]: 10,
  [RoomType.DOUBLE]: 50,
  [RoomType.PRIVATE]: 200,
  [RoomType.ROYAL_SUITE]: 500
}

const ROOM_HEAL_RATES: Record<RoomType, number> = {
  [RoomType.STABLES]: 0,
  [RoomType.BARRACKS]: 1,
  [RoomType.DOUBLE]: 3,
  [RoomType.PRIVATE]: 7,
  [RoomType.ROYAL_SUITE]: 10
}

// Room tiers ordered from fastest (most expensive) to cheapest (slowest)
const ROOM_TIERS: RoomType[] = [
  RoomType.ROYAL_SUITE,  // 500gp, 10 HP/week
  RoomType.PRIVATE,      // 200gp, 7 HP/week
  RoomType.DOUBLE,       // 50gp, 3 HP/week
  RoomType.BARRACKS,     // 10gp, 1 HP/week
]

export class InnService {
  /**
   * Get cost per week for room type
   */
  static getRoomCost(roomType: RoomType): number {
    return ROOM_COSTS[roomType]
  }

  /**
   * Get HP healed per week for room type
   */
  static getRoomHealRate(roomType: RoomType): number {
    return ROOM_HEAL_RATES[roomType]
  }

  /**
   * Check if party can afford room
   */
  static canAffordRoom(state: GameState, roomType: RoomType): ValidationResult {
    const cost = this.getRoomCost(roomType)

    if (cost === 0) {
      return { allowed: true }
    }

    const partyGold = state.party.gold

    if (!PartyService.hasEnoughGold(state, cost)) {
      return {
        allowed: false,
        reason: `Not enough gold. Need ${cost}, have ${partyGold}.`
      }
    }

    return { allowed: true }
  }

  /**
   * Rest character for one week
   * Heals HP, deducts gold from party, returns updated character and state
   * Only STABLES restore spell points (per original Wizardry 1)
   */
  static restOneWeek(state: GameState, character: Character, roomType: RoomType): RestResult {
    const cost = this.getRoomCost(roomType)
    const healRate = this.getRoomHealRate(roomType)

    const newHp = Math.min(character.hp + healRate, character.maxHp)

    let updatedCharacter: Character = {
      ...character,
      hp: newHp
    }

    // Only Stables restore spell points (per original Wizardry 1)
    if (roomType === RoomType.STABLES) {
      updatedCharacter = this.restoreSpellPoints(updatedCharacter)
    }

    const updatedState = PartyService.removePartyGold(state, cost)

    return {
      updatedCharacter,
      updatedState,
      isFullyHealed: newHp === character.maxHp,
      goldSpent: cost,
      hpRecovered: newHp - character.hp,
      spellPointsRestored: roomType === RoomType.STABLES
    }
  }

  /**
   * Restore all spell points to maximum for a character.
   * Only called when resting in Stables (per original Wizardry 1).
   */
  static restoreSpellPoints(character: Character): Character {
    if (!character.spellPoints) {
      return character
    }

    const restorePool = (pool: SpellPointPool): SpellPointPool => ({
      level1: { ...pool.level1, current: pool.level1.max },
      level2: { ...pool.level2, current: pool.level2.max },
      level3: { ...pool.level3, current: pool.level3.max },
      level4: { ...pool.level4, current: pool.level4.max },
      level5: { ...pool.level5, current: pool.level5.max },
      level6: { ...pool.level6, current: pool.level6.max },
      level7: { ...pool.level7, current: pool.level7.max }
    })

    return {
      ...character,
      spellPoints: {
        mage: character.spellPoints.mage
          ? restorePool(character.spellPoints.mage)
          : undefined,
        priest: character.spellPoints.priest
          ? restorePool(character.spellPoints.priest)
          : undefined
      }
    }
  }

  /**
   * Calculate optimal room tier for healing entire party.
   * Cascades from fastest (Royal Suite) to cheapest (Barracks) based on affordability.
   * Returns a plan with weeks needed, total cost, and whether full heal is affordable.
   */
  static calculatePartyHealPlan(
    characters: Character[],
    partyGold: number
  ): PartyHealPlan {
    // Filter to living characters who need healing
    const livingChars = characters.filter(c =>
      c.status === CharacterStatus.OK && c.hp < c.maxHp
    )

    // Calculate HP needed per character
    const hpPerCharacter = new Map<string, number>()
    let maxHpNeeded = 0
    for (const char of livingChars) {
      const hpNeeded = char.maxHp - char.hp
      hpPerCharacter.set(char.id, hpNeeded)
      maxHpNeeded = Math.max(maxHpNeeded, hpNeeded)
    }

    // If no one needs healing, return zero plan
    if (livingChars.length === 0 || maxHpNeeded === 0) {
      return {
        roomTier: RoomType.STABLES,
        weeksNeeded: 0,
        totalCost: 0,
        canAffordFull: true,
        hpPerCharacter: new Map(),
      }
    }

    // Try each room tier from fastest to cheapest
    for (const roomTier of ROOM_TIERS) {
      const healRate = this.getRoomHealRate(roomTier)
      const costPerWeek = this.getRoomCost(roomTier)

      const weeksNeeded = Math.ceil(maxHpNeeded / healRate)
      const totalCost = weeksNeeded * costPerWeek * livingChars.length

      if (totalCost <= partyGold) {
        return {
          roomTier,
          weeksNeeded,
          totalCost,
          canAffordFull: true,
          hpPerCharacter,
        }
      }
    }

    // Can't afford full heal - calculate partial at Barracks
    const barracksCost = this.getRoomCost(RoomType.BARRACKS)
    const maxWeeks = Math.floor(partyGold / (barracksCost * livingChars.length))

    return {
      roomTier: RoomType.BARRACKS,
      weeksNeeded: maxWeeks,
      totalCost: maxWeeks * barracksCost * livingChars.length,
      canAffordFull: false,
      hpPerCharacter,
    }
  }

  /**
   * Check if a character has any depleted spell points.
   * Returns false for non-casters or characters with full spell points.
   */
  static hasDepletedSpellPoints(character: Character): boolean {
    if (!character.spellPoints) return false

    const checkPool = (pool?: SpellPointPool): boolean => {
      if (!pool) return false
      return (
        (pool.level1.max > 0 && pool.level1.current < pool.level1.max) ||
        (pool.level2.max > 0 && pool.level2.current < pool.level2.max) ||
        (pool.level3.max > 0 && pool.level3.current < pool.level3.max) ||
        (pool.level4.max > 0 && pool.level4.current < pool.level4.max) ||
        (pool.level5.max > 0 && pool.level5.current < pool.level5.max) ||
        (pool.level6.max > 0 && pool.level6.current < pool.level6.max) ||
        (pool.level7.max > 0 && pool.level7.current < pool.level7.max)
      )
    }

    return checkPool(character.spellPoints.mage) || checkPool(character.spellPoints.priest)
  }

  /**
   * Check if any party member has depleted spell points.
   */
  static partyHasDepletedSpellPoints(characters: Character[]): boolean {
    return characters.some(c => this.hasDepletedSpellPoints(c))
  }

  /**
   * Check if any party member has spell points (is a caster).
   */
  static partyHasCasters(characters: Character[]): boolean {
    return characters.some(c => c.spellPoints !== undefined)
  }

  /**
   * Execute party rest using the provided heal plan.
   * Heals HP, optionally restores spell points, and triggers level-ups
   * for characters at full HP with enough XP.
   */
  static executePartyRest(
    state: GameState,
    plan: PartyHealPlan,
    restoreSpells: boolean
  ): PartyRestResult {
    let updatedState = { ...state }
    const perCharacter = new Map<string, CharacterRestResult>()
    const levelUps: LevelUpDisplayData[] = []

    const partyMembers = state.party?.members ?? []

    for (const charId of partyMembers) {
      const char = state.roster.get(charId)
      if (!char || char.status !== CharacterStatus.OK) continue

      const hpBefore = char.hp
      let updatedChar = { ...char }

      // Heal HP based on weeks and room heal rate
      const healRate = this.getRoomHealRate(plan.roomTier)
      const hpGained = Math.min(
        plan.weeksNeeded * healRate,
        char.maxHp - char.hp
      )
      updatedChar.hp = Math.min(char.hp + hpGained, char.maxHp)

      // Restore spell points if requested
      let spellsRestored = false
      if (restoreSpells && updatedChar.spellPoints) {
        updatedChar = this.restoreSpellPoints(updatedChar)
        spellsRestored = true
      }

      // Check for level-up (requires full HP)
      if (updatedChar.hp === updatedChar.maxHp && LevelUpService.canLevelUp(updatedChar)) {
        const oldLevel = updatedChar.level
        const levelUpResult = LevelUpService.performLevelUp(updatedChar)
        updatedChar = levelUpResult.updatedCharacter

        // Learn new spells for casters
        const spellResult = SpellLearningService.learnNewSpells(updatedChar, oldLevel, updatedChar.level)
        updatedChar = spellResult.updatedCharacter

        // Convert stat changes to Record<string, number>
        const statChanges: Record<string, number> = {}
        if (levelUpResult.levelUpData.statChanges.strength)
          statChanges['STR'] = levelUpResult.levelUpData.statChanges.strength
        if (levelUpResult.levelUpData.statChanges.intelligence)
          statChanges['INT'] = levelUpResult.levelUpData.statChanges.intelligence
        if (levelUpResult.levelUpData.statChanges.piety)
          statChanges['PIE'] = levelUpResult.levelUpData.statChanges.piety
        if (levelUpResult.levelUpData.statChanges.vitality)
          statChanges['VIT'] = levelUpResult.levelUpData.statChanges.vitality
        if (levelUpResult.levelUpData.statChanges.agility)
          statChanges['AGI'] = levelUpResult.levelUpData.statChanges.agility
        if (levelUpResult.levelUpData.statChanges.luck)
          statChanges['LUC'] = levelUpResult.levelUpData.statChanges.luck

        levelUps.push({
          characterId: charId,
          characterName: char.name,
          newLevel: levelUpResult.levelUpData.newLevel,
          hpIncrease: levelUpResult.levelUpData.hpIncrease,
          statChanges,
          newSpells: spellResult.newSpells.map(s => s.name),
        })
      }

      // Update roster
      updatedState = {
        ...updatedState,
        roster: new Map(updatedState.roster).set(charId, updatedChar),
      }

      perCharacter.set(charId, {
        hpBefore,
        hpAfter: updatedChar.hp,
        hpGained,
        spellsRestored,
      })
    }

    // Deduct gold
    const goldRemaining = (state.party?.gold ?? 0) - plan.totalCost
    updatedState = {
      ...updatedState,
      party: {
        ...updatedState.party!,
        gold: goldRemaining,
      },
    }

    return {
      weeksRested: plan.weeksNeeded,
      goldSpent: plan.totalCost,
      goldRemaining,
      perCharacter,
      levelUps,
      updatedState,
    }
  }
}
