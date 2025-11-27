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
 * - Restore Spells: Free, 1 week at Stables
 * - Heal Party: Costs gold, auto-selects best room tier
 * - Full Rest: Costs gold, heals HP AND restores spells
 *
 * Each card shows:
 * - Title and description
 * - Cost (gold and time)
 * - Disabled state with reason when unavailable
 */
@Component({
  selector: 'app-rest-action-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="rest-action-card"
      [class.disabled]="!config.enabled"
      [disabled]="!config.enabled"
      (click)="onSelect()"
    >
      <div class="card-header">
        <h3 class="title">{{ config.title }}</h3>
      </div>

      <p class="description">{{ config.description }}</p>

      <div class="cost-info">
        @if (config.goldCost > 0) {
          <span class="gold-cost">{{ config.goldCost }} GP</span>
          <span class="separator">-</span>
        }
        <span class="time-cost">{{ config.costText }}</span>
      </div>

      @if (!config.enabled && config.disabledReason) {
        <div class="disabled-reason">
          {{ config.disabledReason }}
        </div>
      }
    </button>
  `,
  styles: [`
    .rest-action-card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--color-surface, #1a1a1a);
      border: 2px solid var(--color-primary, #00ff00);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      width: 100%;
      font-family: inherit;
      color: inherit;
    }

    .rest-action-card:hover:not(.disabled) {
      background: var(--color-surface-hover, #2a2a2a);
      border-color: var(--color-primary-bright, #00ff88);
      transform: translateY(-2px);
    }

    .rest-action-card:active:not(.disabled) {
      transform: translateY(0);
    }

    .rest-action-card.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: var(--color-text-muted, #666);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .title {
      margin: 0;
      font-size: 1.1rem;
      color: var(--color-primary, #00ff00);
    }

    .description {
      margin: 0;
      font-size: 0.9rem;
      color: var(--color-text-secondary, #aaa);
    }

    .cost-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      padding-top: 0.25rem;
      border-top: 1px solid var(--color-border, #333);
    }

    .gold-cost {
      color: var(--color-gold, #ffd700);
      font-weight: bold;
    }

    .separator {
      color: var(--color-text-muted, #666);
    }

    .time-cost {
      color: var(--color-text-secondary, #aaa);
    }

    .disabled-reason {
      font-size: 0.85rem;
      color: var(--color-error, #ff4444);
      font-style: italic;
    }
  `]
})
export class RestActionCardComponent {
  @Input({ required: true }) config!: RestActionConfig;
  @Output() selected = new EventEmitter<RestActionType>();

  onSelect(): void {
    if (this.config.enabled) {
      this.selected.emit(this.config.type);
    }
  }
}
