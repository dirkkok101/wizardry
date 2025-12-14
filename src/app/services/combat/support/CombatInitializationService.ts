/**
 * Combat Initialization Service
 *
 * Handles the creation of initial combat state including:
 * - Monster group generation
 * - Surprise mechanics
 * - Combat state initialization
 *
 * Single Responsibility: Combat state initialization
 */

import { Character } from '@models/Character'
import { CombatState, MonsterGroup } from '@models/Combat'
import { FixedEncounterConfig } from '@models/Encounter'
import { EncounterService } from '@services/EncounterService'
import { rollSurprise } from '../support/SurpriseService'

// Re-export for convenience
export { CombatInitializationService }

/**
 * Combat initialization options
 */
export interface InitiateCombatOptions {
  /** Whether the party can flee from this encounter */
  canFlee: boolean
  /** Fixed encounter configuration (for scripted encounters) */
  fixedEncounterConfig?: FixedEncounterConfig
  /** Whether this is a friendly encounter (alignment shift mechanic) */
  isFriendlyEncounter?: boolean
  /** Reason for the encounter (affects treasure mechanics) */
  encounterReason?: 'random' | 'door_kick' | 'treasure_room' | 'alarm' | 'fixed' | 'chest_trap'
  /** Whether LATUMAPIC spell is active (pre-identifies monsters) */
  latumapicActive?: boolean
  /** Force ambush (monsters surprise party) */
  forceAmbush?: boolean
  /** Party-wide AC buff from MAPORFIC, etc. */
  expeditionAcBuff?: number
}

/**
 * Combat Initialization Service
 *
 * Creates and initializes combat state for encounters.
 */
class CombatInitializationService {
  /**
   * Calculate average party level for encounter balancing
   */
  static calculateAveragePartyLevel(party: Character[]): number {
    if (party.length === 0) return 1
    return Math.floor(party.reduce((sum, c) => sum + c.level, 0) / party.length)
  }

  /**
   * Calculate minimum party level for monster count cap
   */
  static calculateMinPartyLevel(party: Character[]): number {
    if (party.length === 0) return 1
    return Math.min(...party.map(c => c.level))
  }

  /**
   * Initialize mage level tracking for monster groups
   * Per Apple II reference (Section 10): Mage spell level degrades permanently during encounter
   */
  static initializeGroupMageLevels(groups: MonsterGroup[]): MonsterGroup[] {
    return groups.map(group => ({
      ...group,
      currentMageLevel: group.monsters[0]?.mageLevel ?? 0
    }))
  }

  /**
   * Determine surprise state for combat
   */
  static determineSurpriseState(
    forceAmbush: boolean
  ): 'party' | 'monsters' | 'none' {
    if (forceAmbush) {
      // Party was caught off guard (e.g., during camp healing)
      return 'monsters'
    }

    const { partySurprises, monstersSurprise } = rollSurprise()
    return partySurprises ? 'party' : monstersSurprise ? 'monsters' : 'none'
  }

  /**
   * Create initial combat state
   *
   * @param dungeonLevel - Current dungeon level
   * @param party - Party characters
   * @param options - Combat initialization options
   * @returns Initial combat state
   */
  static initiateCombat(
    dungeonLevel: number,
    party: Character[],
    options: InitiateCombatOptions
  ): CombatState {
    const {
      canFlee,
      fixedEncounterConfig,
      isFriendlyEncounter = false,
      encounterReason,
      latumapicActive = false,
      forceAmbush = false,
      expeditionAcBuff = 0
    } = options

    // Calculate party levels for encounter balancing
    const partyLevel = this.calculateAveragePartyLevel(party)
    const minPartyLevel = this.calculateMinPartyLevel(party)

    // Generate monster groups
    const monsterGroups = fixedEncounterConfig
      ? EncounterService.generateFixedEncounter(dungeonLevel, fixedEncounterConfig, latumapicActive)
      : EncounterService.generateEncounter(dungeonLevel, latumapicActive, partyLevel, minPartyLevel)

    // Initialize mage level tracking
    const groupsWithMageLevel = this.initializeGroupMageLevels(monsterGroups)

    // Determine surprise state
    const surpriseState = this.determineSurpriseState(forceAmbush)

    return {
      monsterGroups: groupsWithMageLevel,
      commandQueue: [],
      roundNumber: 1,
      combatLog: [],
      canFlee,
      dungeonLevel,
      statusEffects: new Map(),
      acModifiers: new Map(),
      statusDurations: new Map(),
      monstersDemoralized: false,
      surpriseState,
      isFriendlyEncounter,
      encounterReason,
      expeditionAcBuff
    }
  }
}

// Standalone function exports
export const calculateAveragePartyLevel = CombatInitializationService.calculateAveragePartyLevel
export const calculateMinPartyLevel = CombatInitializationService.calculateMinPartyLevel
export const initializeGroupMageLevels = CombatInitializationService.initializeGroupMageLevels
export const initiateCombat = CombatInitializationService.initiateCombat.bind(CombatInitializationService)
