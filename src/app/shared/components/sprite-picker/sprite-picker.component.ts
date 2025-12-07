import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SpriteService, SpriteInfo } from '@services/SpriteService'
import { Race } from '@models/Race'
import { CharacterClass } from '@models/CharacterClass'

/**
 * SpritePickerComponent - Carousel-style character sprite selector
 *
 * Displays a gold-framed portrait with left/right navigation buttons.
 * Auto-suggests a sprite based on race and class, but allows browsing
 * all 20 available sprites.
 *
 * Usage:
 * ```html
 * <app-sprite-picker
 *   [race]="selectedRace"
 *   [characterClass]="selectedClass"
 *   [selectedSpriteId]="spriteId"
 *   (spriteChange)="onSpriteChange($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-sprite-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sprite-picker.component.html',
  styleUrls: ['./sprite-picker.component.scss']
})
export class SpritePickerComponent implements OnInit, OnChanges {
  /** Current race for auto-suggestion */
  @Input() race?: Race

  /** Current class for auto-suggestion */
  @Input() characterClass?: CharacterClass

  /** Currently selected sprite ID */
  @Input() selectedSpriteId?: string

  /** Emits when sprite selection changes */
  @Output() spriteChange = new EventEmitter<string>()

  /** Current sprite being displayed */
  currentSprite: SpriteInfo | null = null

  /** Image load error state */
  imageError = false

  ngOnInit(): void {
    this.initializeSprite()
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When race or class changes, auto-suggest new sprite (only if no sprite selected yet)
    if ((changes['race'] || changes['characterClass']) && !this.selectedSpriteId) {
      this.autoSuggestSprite()
    }

    // When selectedSpriteId changes externally, update display
    if (changes['selectedSpriteId'] && this.selectedSpriteId) {
      this.currentSprite = SpriteService.getSpriteById(this.selectedSpriteId) ?? null
      this.imageError = false
    }
  }

  private initializeSprite(): void {
    if (this.selectedSpriteId) {
      this.currentSprite = SpriteService.getSpriteById(this.selectedSpriteId) ?? null
    } else {
      this.autoSuggestSprite()
    }
  }

  private autoSuggestSprite(): void {
    if (this.race && this.characterClass) {
      const suggested = SpriteService.suggestSprite(this.race, this.characterClass)
      if (suggested) {
        this.currentSprite = suggested
        this.imageError = false
        this.spriteChange.emit(suggested.id)
      }
    }
  }

  selectPrevious(): void {
    if (!this.currentSprite) return
    this.currentSprite = SpriteService.getPreviousSprite(this.currentSprite.id)
    this.imageError = false
    this.spriteChange.emit(this.currentSprite.id)
  }

  selectNext(): void {
    if (!this.currentSprite) return
    this.currentSprite = SpriteService.getNextSprite(this.currentSprite.id)
    this.imageError = false
    this.spriteChange.emit(this.currentSprite.id)
  }

  onImageError(): void {
    this.imageError = true
  }

  onImageLoad(): void {
    this.imageError = false
  }
}
