import { Component, Input, Output, EventEmitter, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterField, CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { CharacterCardComponent } from '../character-card/character-card.component';

/**
 * Character source options for the grid
 */
export type CharacterSource =
  | 'party'           // All party members
  | 'available'       // Characters not in party
  | 'afflicted'       // Party members with status != OK
  | 'all'             // All characters in roster
  | 'custom';         // Use provided characters array

/**
 * PartyCharacterGridComponent - Reusable character display grid
 *
 * This component eliminates duplicate character grid code across scenes.
 * Previously, each scene had:
 * - A computed signal to get/filter characters
 * - A @for loop with character cards
 * - An @empty block for empty state
 * - Action handlers for each card
 *
 * Now scenes can use:
 * <app-party-character-grid
 *   source="party"
 *   [visibleFields]="['race', 'class', 'level', 'hp']"
 *   [actions]="[{ type: 'inspect' }]"
 *   emptyMessage="No party members"
 *   (actionClick)="handleAction($event)"
 * />
 *
 * Supports multiple character sources:
 * - party: All current party members
 * - available: Characters not in party (optionally filtered by status)
 * - afflicted: Party members needing healing (status != OK)
 * - all: All roster characters
 * - custom: Use the provided [characters] input
 *
 * Formation layout:
 * Use [showFormation]="true" to display party characters in front/back rows
 * with 3 cards per row (matching tavern layout).
 */
@Component({
  selector: 'app-party-character-grid',
  standalone: true,
  imports: [CommonModule, CharacterCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="character-grid" [class.compact]="variant === 'compact'" [class.formation-layout]="showFormation">
      @if (title && !showFormation) {
        <h2 class="grid-title">{{ title }}</h2>
      }

      @if (showFormation) {
        <!-- Formation layout with front/back rows -->
        @if (isPartyEmpty()) {
          <div class="empty-state">
            <p>{{ emptyMessage }}</p>
          </div>
        } @else {
          <div class="formation-section">
            <h3 class="row-title">Front Row</h3>
            @if (frontRowCharacters().length > 0) {
              <div class="row-grid">
                @for (char of frontRowCharacters(); track char.id) {
                  <app-character-card
                    [character]="char"
                    [visibleFields]="visibleFields"
                    [actions]="getActionsForCharacter(char)"
                    [variant]="variant"
                    [highlighted]="isHighlighted(char)"
                    [showHpBar]="showHpBar"
                    [statusText]="getStatusText(char)"
                    (actionClick)="onActionClick($event)"
                  />
                }
              </div>
            } @else {
              <div class="empty-row">Front row is empty</div>
            }
          </div>

          <div class="formation-section">
            <h3 class="row-title">Back Row</h3>
            @if (backRowCharacters().length > 0) {
              <div class="row-grid">
                @for (char of backRowCharacters(); track char.id) {
                  <app-character-card
                    [character]="char"
                    [visibleFields]="visibleFields"
                    [actions]="getActionsForCharacter(char)"
                    [variant]="variant"
                    [highlighted]="isHighlighted(char)"
                    [showHpBar]="showHpBar"
                    [statusText]="getStatusText(char)"
                    (actionClick)="onActionClick($event)"
                  />
                }
              </div>
            } @else {
              <div class="empty-row">Back row is empty</div>
            }
          </div>
        }
      } @else {
        <!-- Standard list layout -->
        @if (displayCharacters().length > 0) {
          <div class="grid-content">
            @for (char of displayCharacters(); track char.id) {
              <app-character-card
                [character]="char"
                [visibleFields]="visibleFields"
                [actions]="getActionsForCharacter(char)"
                [variant]="variant"
                [highlighted]="isHighlighted(char)"
                [showHpBar]="showHpBar"
                [statusText]="getStatusText(char)"
                (actionClick)="onActionClick($event)"
              />
            }
          </div>
        } @else {
          <div class="empty-state">
            <p>{{ emptyMessage }}</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .character-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .grid-title {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
      color: var(--color-text-secondary, #aaa);
    }

    .grid-content {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .empty-state {
      text-align: center;
      color: var(--color-text-muted, #666);
      padding: 1rem;
      font-style: italic;
    }

    .compact .grid-content {
      gap: 0.5rem;
    }

    /* Formation layout styles */
    .formation-layout {
      gap: 1rem;
    }

    .formation-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .row-title {
      margin: 0;
      font-size: 1rem;
      color: var(--color-primary, #00ff00);
      border-bottom: 1px solid var(--color-primary, #00ff00);
      padding-bottom: 0.25rem;
    }

    .row-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .empty-row {
      color: var(--color-text-muted, #666);
      font-style: italic;
      padding: 0.75rem;
      text-align: center;
      border: 1px dashed var(--color-text-muted, #666);
    }

    /* Responsive: stack cards on smaller screens */
    @media (max-width: 900px) {
      .grid-content,
      .row-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .grid-content,
      .row-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PartyCharacterGridComponent {
  private readonly gameState = inject(GameStateService);

  /**
   * Source of characters to display
   * Default: 'party' (show current party members)
   */
  @Input() source: CharacterSource = 'party';

  /**
   * Custom characters array (used when source='custom')
   */
  @Input() characters: Character[] = [];

  /**
   * Filter by status (used with 'available' source)
   */
  @Input() filterStatus?: CharacterStatus;

  /**
   * Which fields to display on character cards
   */
  @Input() visibleFields: CharacterField[] = ['race', 'class', 'level', 'hp'];

  /**
   * Actions to display on each character card
   * Can be a static array or a function that returns actions per character
   */
  @Input() actions: CharacterAction[] | ((char: Character) => CharacterAction[]) = [{ type: 'inspect' }];

  /**
   * Message to display when no characters
   */
  @Input() emptyMessage = 'No characters';

  /**
   * Optional title above the grid
   */
  @Input() title?: string;

  /**
   * Card variant
   */
  @Input() variant: 'default' | 'compact' = 'default';

  /**
   * Show formation layout (front/back rows) instead of list
   * Only applies when source='party'
   */
  @Input() showFormation = false;

  /**
   * ID of the highlighted character (e.g., active character in combat)
   */
  @Input() highlightedCharacterId?: string | null;

  /**
   * Show HP bar on character cards
   */
  @Input() showHpBar = false;

  /**
   * Status text map (character ID -> status text)
   * Used to display selected actions or other status info on cards
   */
  @Input() statusTexts?: Map<string, string>;

  /**
   * Event emitted when an action is clicked on a character card
   */
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  /**
   * Computed characters based on source
   */
  readonly displayCharacters = computed(() => {
    const state = this.gameState.state();

    switch (this.source) {
      case 'party':
        return GameStateQueries.partyCharacters(state);

      case 'available':
        return GameStateQueries.availableCharacters(state, this.filterStatus);

      case 'afflicted':
        return GameStateQueries.afflictedCharacters(state);

      case 'all':
        return GameStateQueries.allCharacters(state);

      case 'custom':
        return this.characters;

      default:
        return [];
    }
  });

  /**
   * Front row characters (for formation layout)
   */
  readonly frontRowCharacters = computed(() =>
    GameStateQueries.frontRowCharacters(this.gameState.state())
  );

  /**
   * Back row characters (for formation layout)
   */
  readonly backRowCharacters = computed(() =>
    GameStateQueries.backRowCharacters(this.gameState.state())
  );

  /**
   * Check if party is completely empty (no characters in either row)
   */
  readonly isPartyEmpty = computed(() =>
    this.frontRowCharacters().length === 0 && this.backRowCharacters().length === 0
  );

  /**
   * Get actions for a specific character
   */
  getActionsForCharacter(char: Character): CharacterAction[] {
    if (typeof this.actions === 'function') {
      return this.actions(char);
    }
    return this.actions;
  }

  /**
   * Handle action click from character card
   */
  onActionClick(event: CharacterActionEvent): void {
    console.log('[PartyCharacterGrid] Received actionClick:', event);
    this.actionClick.emit(event);
  }

  /**
   * Check if a character is highlighted
   */
  isHighlighted(char: Character): boolean {
    return this.highlightedCharacterId === char.id;
  }

  /**
   * Get status text for a character
   */
  getStatusText(char: Character): string | null {
    return this.statusTexts?.get(char.id) ?? null;
  }
}
