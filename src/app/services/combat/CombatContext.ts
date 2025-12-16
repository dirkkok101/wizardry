/**
 * Combat Context
 *
 * Immutable context object that encapsulates all combat-related state
 * and provides convenient accessor methods. Replaces the "data clumps"
 * anti-pattern where the same parameters are passed together repeatedly.
 *
 * Usage:
 * ```typescript
 * const context = CombatContext.create(state, party, frontRow)
 * const character = context.getCharacter(id)
 * const isParrying = context.isParrying(id)
 * ```
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import {
  CombatState,
  MonsterInstance,
  MonsterGroup,
  Combatant,
  CombatStatusEffect,
  DurationTrackedStatus,
} from '@models/Combat'
import { CombatHelpers } from './CombatHelpers'

export interface ICombatContext {
  readonly state: CombatState
  readonly party: ReadonlyArray<Character>
  readonly frontRow: ReadonlyArray<string>
  readonly parryingCombatants: ReadonlySet<string>
  readonly characterUpdates: ReadonlyMap<string, Character>

  // Character accessors
  getCharacter(id: string): Character | undefined
  getEffectiveCharacter(id: string): Character | undefined
  isCharacterInFrontRow(id: string): boolean
  getAlivePartyMembers(): Character[]
  getAliveFrontRow(): Character[]
  getAliveBackRow(): Character[]

  // Monster accessors
  getMonster(id: string): MonsterInstance | undefined
  getMonsterGroup(monsterId: string): MonsterGroup | undefined
  getMonsterGroupById(groupId: 'A' | 'B' | 'C' | 'D'): MonsterGroup | undefined
  getAllAliveMonsters(): MonsterInstance[]
  getAllActingMonsters(): MonsterInstance[]

  // Status checks
  isParrying(combatantId: string): boolean
  hasStatusEffect(combatantId: string, effect: CombatStatusEffect): boolean
  getStatusDuration(combatantId: string, status: DurationTrackedStatus): number
  getAcModifier(combatantId: string): number

  // Combat state checks
  canFlee(): boolean
  isDemoralized(): boolean
  getDungeonLevel(): number
  getRoundNumber(): number

  // Utility
  getCombatantName(combatant: Combatant): string
  isMonster(combatant: Combatant): combatant is MonsterInstance
  isCharacter(combatant: Combatant): combatant is Character
}

export class CombatContext implements ICombatContext {
  readonly state: CombatState
  readonly party: ReadonlyArray<Character>
  readonly frontRow: ReadonlyArray<string>
  readonly parryingCombatants: ReadonlySet<string>
  readonly characterUpdates: ReadonlyMap<string, Character>

  private constructor(
    state: CombatState,
    party: Character[],
    frontRow: string[],
    parryingCombatants: Set<string> = new Set(),
    characterUpdates: Map<string, Character> = new Map()
  ) {
    this.state = state
    this.party = Object.freeze([...party])
    this.frontRow = Object.freeze([...frontRow])
    this.parryingCombatants = parryingCombatants
    this.characterUpdates = characterUpdates
  }

  /**
   * Create a new CombatContext
   */
  static create(
    state: CombatState,
    party: Character[],
    frontRow: string[],
    parryingCombatants: Set<string> = new Set(),
    characterUpdates: Map<string, Character> = new Map()
  ): CombatContext {
    return new CombatContext(state, party, frontRow, parryingCombatants, characterUpdates)
  }

  /**
   * Create a new context with updated state (immutable update)
   */
  withState(newState: CombatState): CombatContext {
    return new CombatContext(
      newState,
      [...this.party],
      [...this.frontRow],
      new Set(this.parryingCombatants),
      new Map(this.characterUpdates)
    )
  }

  /**
   * Create a new context with updated character updates
   */
  withCharacterUpdates(updates: Map<string, Character>): CombatContext {
    return new CombatContext(
      this.state,
      [...this.party],
      [...this.frontRow],
      new Set(this.parryingCombatants),
      new Map([...this.characterUpdates, ...updates])
    )
  }

  /**
   * Create a new context with a combatant marked as parrying
   */
  withParrying(combatantId: string): CombatContext {
    const newParrying = new Set(this.parryingCombatants)
    newParrying.add(combatantId)
    return new CombatContext(
      this.state,
      [...this.party],
      [...this.frontRow],
      newParrying,
      new Map(this.characterUpdates)
    )
  }

  // ============================================================================
  // Character Accessors
  // ============================================================================

  getCharacter(id: string): Character | undefined {
    return this.party.find(c => c.id === id)
  }

  /**
   * Get character with any pending updates applied
   */
  getEffectiveCharacter(id: string): Character | undefined {
    return this.characterUpdates.get(id) ?? this.getCharacter(id)
  }

  isCharacterInFrontRow(id: string): boolean {
    return this.frontRow.includes(id)
  }

  getAlivePartyMembers(): Character[] {
    return this.party.filter(c => {
      const effective = this.getEffectiveCharacter(c.id)
      return effective && this.isCharacterAlive(effective)
    })
  }

  getAliveFrontRow(): Character[] {
    return this.party.filter(c => {
      const effective = this.getEffectiveCharacter(c.id)
      return effective &&
             this.isCharacterInFrontRow(c.id) &&
             this.isCharacterAlive(effective)
    })
  }

  getAliveBackRow(): Character[] {
    return this.party.filter(c => {
      const effective = this.getEffectiveCharacter(c.id)
      return effective &&
             !this.isCharacterInFrontRow(c.id) &&
             this.isCharacterAlive(effective)
    })
  }

  private isCharacterAlive(character: Character): boolean {
    return character.hp > 0 &&
           character.status !== CharacterStatus.DEAD &&
           character.status !== CharacterStatus.ASHES &&
           character.status !== CharacterStatus.LOST
  }

  // ============================================================================
  // Monster Accessors
  // ============================================================================

  getMonster(id: string): MonsterInstance | undefined {
    for (const group of this.state.monsterGroups) {
      const monster = group.monsters.find(m => m.id === id)
      if (monster) return monster
    }
    return undefined
  }

  getMonsterGroup(monsterId: string): MonsterGroup | undefined {
    return this.state.monsterGroups.find(g =>
      g.monsters.some(m => m.id === monsterId)
    )
  }

  getMonsterGroupById(groupId: 'A' | 'B' | 'C' | 'D'): MonsterGroup | undefined {
    return this.state.monsterGroups.find(g => g.id === groupId)
  }

  getAllAliveMonsters(): MonsterInstance[] {
    return this.state.monsterGroups.flatMap(g =>
      CombatHelpers.getAliveMonsters(g.monsters)
    )
  }

  /**
   * Get all monsters that can act (alive and not incapacitated)
   */
  getAllActingMonsters(): MonsterInstance[] {
    return this.state.monsterGroups.flatMap(g =>
      g.monsters.filter(m =>
        CombatHelpers.isMonsterAlive(m) &&
        m.status !== 'ASLEEP' &&
        m.status !== 'PARALYZED'
      )
    )
  }

  // ============================================================================
  // Status Checks
  // ============================================================================

  isParrying(combatantId: string): boolean {
    return this.parryingCombatants.has(combatantId)
  }

  hasStatusEffect(combatantId: string, effect: CombatStatusEffect): boolean {
    const effects = this.state.statusEffects.get(combatantId)
    return effects ? effects.has(effect) : false
  }

  getStatusDuration(combatantId: string, status: DurationTrackedStatus): number {
    const durations = this.state.statusDurations.get(combatantId)
    return durations?.get(status) ?? 0
  }

  getAcModifier(combatantId: string): number {
    return this.state.acModifiers.get(combatantId) ?? 0
  }

  // ============================================================================
  // Combat State Checks
  // ============================================================================

  canFlee(): boolean {
    return this.state.canFlee
  }

  isDemoralized(): boolean {
    return this.state.monstersDemoralized ?? false
  }

  getDungeonLevel(): number {
    return this.state.dungeonLevel
  }

  getRoundNumber(): number {
    return this.state.roundNumber
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  getCombatantName(combatant: Combatant): string {
    if (this.isMonster(combatant)) {
      const group = this.getMonsterGroup(combatant.id)
      const identified = group?.identified ?? false
      return identified ? combatant.name : combatant.unidentifiedName
    }
    return combatant.name
  }

  isMonster(combatant: Combatant): combatant is MonsterInstance {
    return 'monsterId' in combatant
  }

  isCharacter(combatant: Combatant): combatant is Character {
    return 'class' in combatant
  }

  /**
   * Get total AC modifier for a combatant including all sources
   * - Combat-duration buffs (MOGREF, KALKI)
   * - Expedition buffs (MAPORFIC)
   * - Parry bonus
   */
  getTotalAcModifier(combatantId: string): number {
    const combatBuff = this.getAcModifier(combatantId)
    const parryBonus = this.isParrying(combatantId) ? -2 : 0

    // Expedition buff only applies to party members
    const isPartyMember = this.party.some(c => c.id === combatantId)
    const expeditionBuff = isPartyMember ? (this.state.expeditionAcBuff ?? 0) : 0

    return combatBuff + parryBonus + expeditionBuff
  }

  /**
   * Get the position of a monster within its group (for hit chance calculation)
   */
  getMonsterPosition(monsterId: string): number {
    const group = this.getMonsterGroup(monsterId)
    if (!group) return 0
    return group.monsters.findIndex(m => m.id === monsterId)
  }
}
