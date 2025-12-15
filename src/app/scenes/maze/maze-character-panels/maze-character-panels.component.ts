/**
 * MazeCharacterPanelsComponent - Left and right character panels
 *
 * Displays character cards in two columns (odd/even positions).
 * Handles character actions based on current mode (exploration, combat, chest).
 */

import { Component, computed, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'

import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component'
import { Character } from '@models/Character'
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes'

export type PanelMode = 'exploration' | 'combat' | 'chest'

// Re-export the CharacterActionEvent for consumers
export type { CharacterActionEvent }

/**
 * Damage indicator type matching CharacterPanelComponent's expected shape
 */
export interface DamageIndicator {
  characterId: string
  damage: number
  status?: string
}

@Component({
  selector: 'app-maze-character-panels',
  standalone: true,
  imports: [CommonModule, CharacterPanelComponent],
  template: `
    <!-- Left Column: Positions 1, 3, 5 -->
    <div class="left-panel" [class.dimmed]="dimLeftPanel()">
      <app-character-panel
        [characters]="leftColumnCharacters()"
        [actions]="actionsGetter()"
        [visibleActionTypes]="visibleActionTypes()"
        [statusTexts]="statusTexts()"
        [hitCharacterIds]="hitCharacterIds()"
        [damageIndicator]="damageIndicator()"
        [showSprites]="true"
        (actionClick)="onActionClick($event)"
      />
    </div>

    <!-- Right Column: Positions 2, 4, 6 -->
    <div class="right-panel" [class.dimmed]="dimRightPanel()">
      <app-character-panel
        [characters]="rightColumnCharacters()"
        [actions]="actionsGetter()"
        [visibleActionTypes]="visibleActionTypes()"
        [statusTexts]="statusTexts()"
        [hitCharacterIds]="hitCharacterIds()"
        [damageIndicator]="damageIndicator()"
        [showSprites]="true"
        (actionClick)="onActionClick($event)"
      />
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .left-panel, .right-panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: opacity 0.2s;
    }

    .dimmed {
      opacity: 0.5;
      pointer-events: none;
    }
  `]
})
export class MazeCharacterPanelsComponent {
  // Inputs
  characters = input.required<Character[]>()
  mode = input<PanelMode>('exploration')
  dimLeftPanel = input<boolean>(false)
  dimRightPanel = input<boolean>(false)
  statusTexts = input<Map<string, string>>(new Map())
  hitCharacterIds = input<string[]>([])
  damageIndicator = input<DamageIndicator | null>(null)

  // Action getters for different modes
  explorationActionsGetter = input.required<(char: Character) => CharacterAction[]>()
  combatActionsGetter = input.required<(char: Character) => CharacterAction[]>()
  chestActionsGetter = input.required<(char: Character) => CharacterAction[]>()

  // Outputs
  actionClick = output<CharacterActionEvent>()

  // Computed: split characters into left/right columns
  readonly leftColumnCharacters = computed(() => {
    const chars = this.characters()
    return [chars[0], chars[2], chars[4]].filter(c => c !== undefined)
  })

  readonly rightColumnCharacters = computed(() => {
    const chars = this.characters()
    return [chars[1], chars[3], chars[5]].filter(c => c !== undefined)
  })

  // Computed: get appropriate actions getter based on mode
  readonly actionsGetter = computed(() => {
    switch (this.mode()) {
      case 'combat':
        return this.combatActionsGetter()
      case 'chest':
        return this.chestActionsGetter()
      default:
        return this.explorationActionsGetter()
    }
  })

  // Computed: visible action types based on mode
  readonly visibleActionTypes = computed((): string[] => {
    switch (this.mode()) {
      case 'combat':
        return ['attack', 'cast-spell', 'parry']
      case 'chest':
        return ['open', 'inspect', 'calfo', 'disarm']
      default:
        return ['inspect', 'cast-spell']
    }
  })

  onActionClick(event: CharacterActionEvent): void {
    this.actionClick.emit(event)
  }
}
