import { Component, Input, Output, EventEmitter, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PartyRestResult, LevelUpDisplayData, CharacterRestResult } from '@services/InnService';

export interface RestResultsData {
  weeksRested: number;
  goldSpent: number;
  goldRemaining: number;
  perCharacter: Map<string, CharacterRestResult>;
  characterNames: Map<string, string>;
  levelUps: LevelUpDisplayData[];
}

/**
 * RestResultsModalComponent - Shows results after a rest action completes
 *
 * Displays:
 * - Time passed (weeks)
 * - Gold spent
 * - Per-character HP healed and spells restored
 * - Level-ups with stat changes
 *
 * Keyboard: Enter or Escape to dismiss
 */
@Component({
  selector: 'app-rest-results-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="modal-overlay" tabindex="0" #modalOverlay>
        <div class="modal-content">
          <h2 class="modal-title">Rest Complete</h2>

          <div class="summary-section">
            <div class="summary-item">
              <span class="label">Time Passed:</span>
              <span class="value">{{ results.weeksRested }} week(s)</span>
            </div>
            @if (results.goldSpent > 0) {
              <div class="summary-item">
                <span class="label">Gold Spent:</span>
                <span class="value gold">{{ results.goldSpent }} GP</span>
              </div>
            }
          </div>

          @if (characterResults.length > 0) {
            <div class="character-results">
              <h3>Party Status</h3>
              @for (char of characterResults; track char.id) {
                <div class="character-row">
                  <span class="char-name">{{ char.name }}</span>
                  <span class="char-stats">
                    @if (char.hpGained > 0) {
                      <span class="hp-gained">+{{ char.hpGained }} HP</span>
                    }
                    @if (char.spellsRestored) {
                      <span class="spells-restored">Spells Restored</span>
                    }
                    @if (char.hpGained === 0 && !char.spellsRestored) {
                      <span class="no-change">No change</span>
                    }
                  </span>
                </div>
              }
            </div>
          }

          @if (results.levelUps.length > 0) {
            <div class="level-ups">
              <h3>Level Up!</h3>
              @for (levelUp of results.levelUps; track levelUp.characterId) {
                <div class="level-up-entry">
                  <div class="level-up-header">
                    <span class="char-name">{{ levelUp.characterName }}</span>
                    <span class="new-level">Level {{ levelUp.newLevel }}</span>
                  </div>
                  <div class="level-up-details">
                    <span class="hp-increase">+{{ levelUp.hpIncrease }} HP</span>
                    @for (stat of getStatChanges(levelUp); track stat.name) {
                      <span class="stat-change">+{{ stat.value }} {{ stat.name }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <div class="modal-actions">
            <button class="primary-button" (click)="dismiss()">
              (Enter) Continue
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      outline: none;
    }

    .modal-content {
      background: var(--color-background, #000);
      border: 2px solid var(--color-primary, #00ff00);
      padding: 1.5rem;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-title {
      margin: 0 0 1rem 0;
      color: var(--color-primary, #00ff00);
      text-align: center;
      font-size: 1.3rem;
    }

    .summary-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border, #333);
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
    }

    .label {
      color: var(--color-text-secondary, #aaa);
    }

    .value {
      color: var(--color-text, #fff);
    }

    .value.gold {
      color: var(--color-gold, #ffd700);
    }

    h3 {
      margin: 0 0 0.5rem 0;
      color: var(--color-primary, #00ff00);
      font-size: 1rem;
    }

    .character-results {
      margin-bottom: 1rem;
    }

    .character-row {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
    }

    .char-name {
      color: var(--color-text, #fff);
    }

    .char-stats {
      display: flex;
      gap: 0.75rem;
    }

    .hp-gained {
      color: var(--color-success, #00ff00);
    }

    .spells-restored {
      color: var(--color-info, #00bfff);
    }

    .no-change {
      color: var(--color-text-muted, #666);
      font-style: italic;
    }

    .level-ups {
      background: var(--color-surface, #1a1a1a);
      border: 1px solid var(--color-gold, #ffd700);
      padding: 0.75rem;
      margin-bottom: 1rem;
    }

    .level-ups h3 {
      color: var(--color-gold, #ffd700);
    }

    .level-up-entry {
      margin-bottom: 0.5rem;
    }

    .level-up-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .new-level {
      color: var(--color-gold, #ffd700);
      font-weight: bold;
    }

    .level-up-details {
      display: flex;
      gap: 0.75rem;
      font-size: 0.9rem;
      color: var(--color-success, #00ff00);
    }

    .hp-increase, .stat-change {
      color: var(--color-success, #00ff00);
    }

    .modal-actions {
      display: flex;
      justify-content: center;
      margin-top: 1rem;
    }

    .primary-button {
      padding: 0.5rem 1.5rem;
      background: var(--color-primary, #00ff00);
      color: var(--color-background, #000);
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 1rem;
      font-weight: bold;
    }

    .primary-button:hover {
      background: var(--color-primary-bright, #00ff88);
    }
  `]
})
export class RestResultsModalComponent implements AfterViewChecked {
  @Input() visible = false;
  @Input() results!: RestResultsData;
  @Output() dismissed = new EventEmitter<void>();

  @ViewChild('modalOverlay') modalOverlay?: ElementRef<HTMLDivElement>;
  private hasFocused = false;

  @HostListener('keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (!this.visible) return;

    if (event.key === 'Enter' || event.key === 'Escape') {
      this.dismiss();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  dismiss(): void {
    this.dismissed.emit();
    this.hasFocused = false;
  }

  get characterResults(): Array<{ id: string; name: string; hpGained: number; spellsRestored: boolean }> {
    if (!this.results?.perCharacter) return [];

    return Array.from(this.results.perCharacter.entries()).map(([id, result]) => ({
      id,
      name: this.results.characterNames.get(id) ?? 'Unknown',
      hpGained: result.hpGained,
      spellsRestored: result.spellsRestored
    }));
  }

  getStatChanges(levelUp: LevelUpDisplayData): Array<{ name: string; value: number }> {
    return Object.entries(levelUp.statChanges)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }

  ngAfterViewChecked(): void {
    if (this.visible && this.modalOverlay && !this.hasFocused) {
      this.modalOverlay.nativeElement.focus();
      this.hasFocused = true;
    } else if (!this.visible) {
      this.hasFocused = false;
    }
  }
}
