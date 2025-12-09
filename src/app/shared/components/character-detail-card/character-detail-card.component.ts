import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes'
import { StatusBadgeComponent } from '../status-badge/status-badge.component'
import { SpellPointsDisplayComponent } from '../spell-points-display/spell-points-display.component'
import { CharacterActionsComponent } from '../character-actions/character-actions.component'
import { SpellLearningService } from '@services/SpellLearningService'
import { LevelUpService, MAX_LEVEL } from '@services/LevelUpService'
import { CharacterService } from '@services/CharacterService'
import { ClassService } from '@services/ClassService'
import { SpriteService } from '@services/SpriteService'

export type InspectionMode = 'TRAINING_GROUNDS' | 'TAVERN' | 'CAMP'

/**
 * CharacterDetailCardComponent - Full character display with stats and actions
 *
 * Displays comprehensive character information:
 * - Header with race, class, level, alignment, status
 * - Attributes (STR, INT, PIE, VIT, AGI, LUK)
 * - Combat stats (HP, AC, XP)
 * - XP progress to next level
 * - Spell points for casters
 * - Character-level action buttons
 *
 * @example
 * <app-character-detail-card
 *   [character]="character"
 *   [inspectionMode]="'TAVERN'"
 *   [actions]="characterActions"
 *   (actionClick)="onAction($event)">
 * </app-character-detail-card>
 */
@Component({
  selector: 'app-character-detail-card',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    SpellPointsDisplayComponent,
    CharacterActionsComponent
  ],
  templateUrl: './character-detail-card.component.html',
  styleUrls: ['./character-detail-card.component.scss']
})
export class CharacterDetailCardComponent {
  // Expose enum to template
  readonly CharacterStatus = CharacterStatus

  // Inputs
  @Input() character!: Character
  @Input() inspectionMode: InspectionMode = 'TAVERN'
  @Input() actions: CharacterAction[] = []
  @Input() showXpProgress: boolean = true

  // Outputs
  @Output() actionClick = new EventEmitter<CharacterActionEvent>()

  /** Track if sprite failed to load */
  spriteError = false

  /**
   * Get sprite URL for character portrait
   */
  get spriteUrl(): string {
    return SpriteService.getSpriteUrl(this.character)
  }

  /**
   * Handle sprite load error - set flag to show placeholder
   */
  onSpriteError(): void {
    this.spriteError = true
  }

  /**
   * Handle sprite load success - clear error flag
   */
  onSpriteLoad(): void {
    this.spriteError = false
  }

  /**
   * Check if character is a spellcaster
   */
  get isSpellcaster(): boolean {
    return SpellLearningService.isCaster(this.character)
  }

  /**
   * Check if character has spell points to display
   */
  get hasSpellPoints(): boolean {
    if (!this.character.spellPoints) return false
    return !!(this.character.spellPoints.mage || this.character.spellPoints.priest)
  }

  /**
   * Get XP required for next level
   */
  get nextLevelXP(): number {
    return LevelUpService.getXPRequirement(this.character.level + 1, this.character.class)
  }

  /**
   * Get XP remaining to next level
   */
  get xpToNextLevel(): number {
    return Math.max(0, this.nextLevelXP - this.character.experience)
  }

  /**
   * Check if character can still level up
   */
  get canStillLevel(): boolean {
    return this.character.level < MAX_LEVEL
  }

  /**
   * Get HP as a percentage (0-100)
   */
  get hpPercentage(): number {
    if (this.character.maxHp <= 0) return 0
    return Math.round((this.character.hp / this.character.maxHp) * 100)
  }

  /**
   * Get HP bar color class based on health percentage
   */
  get hpBarColorClass(): string {
    if (this.hpPercentage > 50) return 'hp-healthy'
    if (this.hpPercentage > 25) return 'hp-wounded'
    return 'hp-critical'
  }

  /**
   * Get XP progress percentage toward next level (0-100)
   */
  get xpProgressPercentage(): number {
    if (!this.canStillLevel) return 100

    const prevLevelXP = this.character.level === 1
      ? 0
      : LevelUpService.getXPRequirement(this.character.level, this.character.class)
    const nextLevelXP = this.nextLevelXP
    const xpInLevel = nextLevelXP - prevLevelXP

    if (xpInLevel <= 0) return 100

    const currentProgress = this.character.experience - prevLevelXP
    return Math.min(100, Math.round((currentProgress / xpInLevel) * 100))
  }

  /**
   * Check if there are actions to display
   */
  get hasActions(): boolean {
    return this.actions.length > 0
  }

  // ===== Stat Modifiers (D&D-style: (stat-10)/2) =====

  /**
   * STR modifier: affects melee damage
   */
  get strModifier(): number {
    return Math.floor((this.character.strength - 10) / 2)
  }

  get strModifierDisplay(): string {
    const mod = this.strModifier
    return mod >= 0 ? `+${mod} dmg` : `${mod} dmg`
  }

  /**
   * AGI modifier: affects AC and initiative
   */
  get agiModifier(): number {
    return Math.floor((this.character.agility - 10) / 2)
  }

  get agiModifierDisplay(): string {
    const mod = this.agiModifier
    return mod >= 0 ? `+${mod} AC` : `${mod} AC`
  }

  /**
   * VIT bonus: tiered table for HP per level (authentic Wizardry mechanics)
   * Uses CharacterService.getVitalityBonus() for consistent calculations
   */
  get vitBonus(): number {
    return CharacterService.getVitalityBonus(this.character.vitality)
  }

  get vitBonusDisplay(): string {
    const bonus = this.vitBonus
    return bonus >= 0 ? `+${bonus} HP/lvl` : `${bonus} HP/lvl`
  }

  /**
   * INT modifier: affects spell damage and mage spell learning
   */
  get intModifier(): number {
    return Math.floor((this.character.intelligence - 10) / 2)
  }

  get intModifierDisplay(): string {
    const mod = this.intModifier
    return mod >= 0 ? `+${mod} learn` : `${mod} learn`
  }

  /**
   * PIE modifier: affects priest spell learning and turning undead
   */
  get pieModifier(): number {
    return Math.floor((this.character.piety - 10) / 2)
  }

  get pieModifierDisplay(): string {
    const mod = this.pieModifier
    return mod >= 0 ? `+${mod} learn` : `${mod} learn`
  }

  /**
   * LUK effect: affects flee chance and critical hits
   * (LUK-10)*2 percentage
   */
  get lukEffect(): number {
    return (this.character.luck - 10) * 2
  }

  get lukEffectDisplay(): string {
    const effect = this.lukEffect
    return effect >= 0 ? `+${effect}% flee` : `${effect}% flee`
  }

  // ===== Combat Info =====

  /**
   * Attacks per round based on class and level
   * Uses ClassService.getAttacksPerRound() for consistent calculations
   */
  get attacksPerRound(): number {
    return ClassService.getAttacksPerRound(this.character.class, this.character.level)
  }

  /**
   * Damage display: weapon damage + STR modifier
   * Uses equipped weapon if available, otherwise base unarmed (1d2)
   */
  get damageDisplay(): string {
    const mod = this.strModifier
    const weapon = this.character.equippedWeapon

    // Use weapon damage dice if equipped, otherwise unarmed
    let baseDamage = '1d2'
    if (weapon?.damageRoll?.dice) {
      baseDamage = weapon.damageRoll.dice
    }

    if (mod === 0) return baseDamage
    return mod > 0 ? `${baseDamage}+${mod}` : `${baseDamage}${mod}`
  }

  /**
   * Format large numbers with commas
   */
  formatNumber(value: number): string {
    return value.toLocaleString('en-US')
  }

  /**
   * Handle action click from CharacterActionsComponent
   */
  handleActionClick(event: CharacterActionEvent): void {
    this.actionClick.emit(event)
  }
}
