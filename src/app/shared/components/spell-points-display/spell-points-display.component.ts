import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { CharacterSpellPoints, SpellPointPool } from '../../../../types/SpellPoints'
import { MaxCurrent } from '../../../../types/MaxCurrent'

/**
 * SpellPointsDisplayComponent - Displays spell point pools for casters
 *
 * Shows mage and/or priest spell points organized by level (L1-L7).
 * Highlights depleted levels and shows current/max for each.
 *
 * @example
 * <app-spell-points-display [spellPoints]="character.spellPoints" />
 */
@Component({
  selector: 'app-spell-points-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (spellPoints?.mage || spellPoints?.priest) {
      <div class="spell-points-display">
        @if (spellPoints?.mage) {
          <div class="spell-pool mage">
            <span class="pool-label">MAGE:</span>
            <span class="levels">
              @for (level of displayLevels(spellPoints!.mage!); track level.level) {
                <span
                  class="level"
                  [class.depleted]="level.current === 0"
                  [class.hidden]="level.max === 0 && !showEmptyLevels">
                  L{{ level.level }}: {{ level.current }}/{{ level.max }}
                </span>
              }
            </span>
          </div>
        }
        @if (spellPoints?.priest) {
          <div class="spell-pool priest">
            <span class="pool-label">PRIEST:</span>
            <span class="levels">
              @for (level of displayLevels(spellPoints!.priest!); track level.level) {
                <span
                  class="level"
                  [class.depleted]="level.current === 0"
                  [class.hidden]="level.max === 0 && !showEmptyLevels">
                  L{{ level.level }}: {{ level.current }}/{{ level.max }}
                </span>
              }
            </span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .spell-points-display {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .spell-pool {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .pool-label {
      font-weight: bold;
      color: var(--color-text-green, #00ff00);
      min-width: 4rem;
    }

    .mage .pool-label {
      color: var(--color-mage, #6699ff);
    }

    .priest .pool-label {
      color: var(--color-priest, #ffcc00);
    }

    .levels {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .level {
      font-family: var(--font-mono, monospace);
      color: var(--color-text-green, #00ff00);
    }

    .level.depleted {
      color: var(--color-text-dim, #666666);
    }

    .level.hidden {
      display: none;
    }
  `]
})
export class SpellPointsDisplayComponent {
  @Input() spellPoints?: CharacterSpellPoints
  @Input() showEmptyLevels: boolean = false

  /**
   * Convert spell point pool to array of level data for display
   */
  displayLevels(pool: SpellPointPool): Array<{ level: number; current: number; max: number }> {
    const levels: Array<{ level: number; current: number; max: number }> = []

    for (let i = 1; i <= 7; i++) {
      const key = `level${i}` as keyof SpellPointPool
      const points: MaxCurrent = pool[key] ?? { current: 0, max: 0 }
      levels.push({
        level: i,
        current: points.current,
        max: points.max
      })
    }

    return levels
  }
}
