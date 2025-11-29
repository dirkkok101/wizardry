import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type RestActionType = 'restore-spells' | 'heal-party' | 'full-rest';

export interface RestActionConfig {
  type: RestActionType;
  title: string;
  description: string;
  costText: string;
  goldCost: number;
  weeksNeeded: number;
  enabled: boolean;
  disabledReason?: string;
}

/**
 * RestActionCardComponent - Displays a rest action option at the Inn
 *
 * Shows one of three rest actions:
 * - Restore Spells (1): Free, 1 week at Stables - restores all spell points
 * - Heal Party (2): Costs gold, auto-selects best room tier
 * - Full Rest (3): Costs gold, heals HP AND restores spells
 *
 * Modern Retro-Fantasy themed with gold accents and compact layout.
 */
@Component({
  selector: 'app-rest-action-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rest-action-card" [class.disabled]="!config.enabled">
      <div class="card-header">
        <h3 class="title">{{ config.title }}</h3>
        <div class="cost-info">
          @if (config.goldCost > 0) {
            <span class="gold-cost">{{ config.goldCost }} GP</span>
          } @else {
            <span class="gold-cost free">Free</span>
          }
        </div>
      </div>

      <p class="description">{{ config.costText }}</p>

      @if (!config.enabled && config.disabledReason) {
        <div class="disabled-reason">
          {{ config.disabledReason }}
        </div>
      }

      <button
        class="action-button"
        [disabled]="!config.enabled"
        (click)="onSelect()"
      >
        [Rest]
      </button>
    </div>
  `,
  styles: [`
    .rest-action-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-2);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--card-border-radius);
      font-family: var(--font-body);
      color: var(--color-text-primary);
    }

    .rest-action-card.disabled {
      opacity: 0.6;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .title {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-sm);
      color: var(--color-gold-primary);
    }

    .cost-info {
      font-size: var(--font-size-sm);
    }

    .gold-cost {
      color: var(--color-gold-primary);
      font-weight: 600;

      &.free {
        color: var(--color-status-ok);
      }
    }

    .description {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      line-height: 1.4;
    }

    .disabled-reason {
      font-size: var(--font-size-xs);
      color: var(--color-danger);
      font-style: italic;
    }

    .action-button {
      align-self: flex-start;
      padding: var(--space-1) var(--space-2);
      background: transparent;
      border: 1px solid var(--color-gold-dim);
      border-radius: var(--card-border-radius);
      color: var(--color-gold-primary);
      font-family: var(--font-body);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--color-gold-dim);
        color: var(--color-bg-darkest);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `]
})
export class RestActionCardComponent {
  @Input({ required: true }) config!: RestActionConfig;
  @Input() shortcutKey: number = 1;
  @Output() selected = new EventEmitter<RestActionType>();

  onSelect(): void {
    if (this.config.enabled) {
      this.selected.emit(this.config.type);
    }
  }
}
