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
      <div class="modal-overlay" tabindex="0" #modalOverlay
           role="dialog" aria-modal="true" aria-labelledby="rest-modal-title">
        <div class="modal-content" [class.has-level-ups]="results.levelUps.length > 0">
          <h2 class="modal-title" id="rest-modal-title">Rest Complete</h2>

          <div class="modal-body" [class.has-level-ups]="results.levelUps.length > 0">
            <!-- Left column: Summary + Party Status -->
            <div class="results-column">
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
            </div>

            <!-- Right column: Level Ups (only when present) -->
            @if (results.levelUps.length > 0) {
              <div class="level-ups-column">
                <div class="level-ups">
                  <h3>Level Up!</h3>
                  @for (levelUp of results.levelUps; track levelUp.characterId) {
                    <div class="level-up-entry">
                      <div class="level-up-header">
                        <span class="char-name">{{ levelUp.characterName }}</span>
                        <span class="new-level">Level {{ levelUp.newLevel }}</span>
                      </div>
                      <div class="stat-grid">
                        <span class="stat-item">+{{ levelUp.hpIncrease }} HP</span>
                        @for (stat of getStatChanges(levelUp); track stat.name) {
                          <span class="stat-item">+{{ stat.value }} {{ stat.name }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

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
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      outline: none;
    }

    .modal-content {
      background: var(--color-bg-darkest);
      border: 2px solid var(--color-border);
      border-radius: var(--card-border-radius);
      padding: var(--space-4);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 0 20px rgba(212, 165, 116, 0.2);
    }

    .modal-content.has-level-ups {
      max-width: 800px;
    }

    .modal-body {
      display: block;
    }

    .modal-body.has-level-ups {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }

    .results-column {
      min-width: 0;
    }

    .level-ups-column {
      min-width: 0;
    }

    @media (max-width: 600px) {
      .modal-content.has-level-ups {
        max-width: 500px;
      }

      .modal-body.has-level-ups {
        grid-template-columns: 1fr;
      }
    }

    .modal-title {
      margin: 0 0 var(--space-3) 0;
      font-family: var(--font-display);
      font-size: var(--font-size-xl);
      color: var(--color-gold-primary);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .summary-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-body);
      font-size: var(--font-size-sm);
    }

    .label {
      color: var(--color-text-primary);
    }

    .value {
      color: var(--color-text-primary);
    }

    .value.gold {
      color: var(--color-gold-bright);
      font-weight: 600;
    }

    h3 {
      margin: 0 0 var(--space-2) 0;
      font-family: var(--font-display);
      font-size: var(--font-size-md);
      color: var(--color-gold-primary);
      letter-spacing: 0.05em;
    }

    .character-results {
      margin-bottom: var(--space-3);
    }

    .character-row {
      display: flex;
      justify-content: space-between;
      padding: var(--space-1) 0;
      font-family: var(--font-body);
      font-size: var(--font-size-sm);
    }

    .char-name {
      color: var(--color-text-primary);
    }

    .char-stats {
      display: flex;
      gap: var(--space-3);
    }

    .hp-gained {
      color: var(--color-status-ok);
      font-weight: 500;
    }

    .spells-restored {
      color: var(--color-magic);
      font-weight: 500;
    }

    .no-change {
      color: var(--color-text-muted);
      font-style: italic;
    }

    .level-ups {
      background: var(--color-bg-card);
      border: 1px solid var(--color-gold-primary);
      border-radius: var(--card-border-radius);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
      box-shadow: 0 0 8px rgba(212, 165, 116, 0.15);
    }

    .level-ups h3 {
      color: var(--color-gold-bright);
      text-transform: uppercase;
    }

    .level-up-entry {
      padding-bottom: var(--space-2);
      margin-bottom: var(--space-2);
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-body);
    }

    .level-up-entry:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .level-up-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-1);
      font-size: var(--font-size-sm);
    }

    .new-level {
      background: var(--color-gold-primary);
      color: var(--color-bg-darkest);
      padding: 2px var(--space-2);
      border-radius: 12px;
      font-weight: 700;
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-3);
    }

    .stat-item {
      color: var(--color-status-ok);
      font-weight: 600;
      font-size: var(--font-size-xs);
    }

    .modal-actions {
      display: flex;
      justify-content: center;
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
    }

    .primary-button {
      padding: var(--space-2) var(--space-4);
      background: transparent;
      color: var(--color-gold-primary);
      border: 1px solid var(--color-gold-primary);
      border-radius: var(--card-border-radius);
      cursor: pointer;
      font-family: var(--font-body);
      font-size: var(--font-size-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: all var(--transition-fast);
      min-width: 120px;
    }

    .primary-button:hover {
      background: var(--color-gold-primary);
      color: var(--color-bg-darkest);
      box-shadow: 0 0 8px rgba(212, 165, 116, 0.4);
    }

    .primary-button:active {
      transform: scale(0.95);
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
