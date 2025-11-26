import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes'
import { StatusBadgeComponent } from '../status-badge/status-badge.component'
import { SpellPointsDisplayComponent } from '../spell-points-display/spell-points-display.component'
import { CharacterActionsComponent } from '../character-actions/character-actions.component'
import { SpellLearningService } from '@services/SpellLearningService'
import { LevelUpService, MAX_LEVEL } from '@services/LevelUpService'

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
 *   [mode]="'TAVERN'"
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
  @Input() character!: Character
  @Input() mode: InspectionMode = 'TAVERN'
  @Input() actions: CharacterAction[] = []
  @Input() showXpProgress: boolean = true

  @Output() actionClick = new EventEmitter<CharacterActionEvent>()

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
   * Check if there are actions to display
   */
  get hasActions(): boolean {
    return this.actions.length > 0
  }

  /**
   * Format large numbers with commas
   */
  formatNumber(value: number): string {
    return value.toLocaleString()
  }

  /**
   * Handle action click from CharacterActionsComponent
   */
  handleActionClick(event: CharacterActionEvent): void {
    this.actionClick.emit(event)
  }
}
