import {
  Component,
  input,
  output,
  computed,
  signal,
  HostListener
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { CombatActionType, MonsterGroup, CombatCommand } from '@models/Combat'
import { Character } from '@models/Character'
import { SpellCastingService } from '@services/SpellCastingService'
import { getIdentifiedGroupDisplayText } from '@utils/MonsterNameUtils'

export type CombatDrawerMode = 'hidden' | 'action_select' | 'target_select' | 'minimized'

export interface ActionSelection {
  characterId: string
  actionType: CombatActionType
  targetGroupId?: 'A' | 'B' | 'C' | 'D'
  spellId?: string
}

/**
 * CombatDrawerComponent - Slide-up drawer for combat action selection.
 *
 * This component provides the "Theater Stage" bottom drawer for combat,
 * replacing the scene footer during combat mode.
 *
 * Features:
 * - Slide-up animation from bottom
 * - Action buttons (Attack, Cast Spell, Parry, Flee)
 * - Target group selection row
 * - Round/character status display
 * - Keyboard shortcuts (A, C, P, F, 1-4, ESC, ENTER)
 *
 * @example
 * <app-combat-drawer
 *   [mode]="'action_select'"
 *   [roundNumber]="combatState().roundNumber"
 *   [activeCharacter]="currentCharacter()"
 *   [activeCharacterIndex]="currentIndex()"
 *   [totalCharacters]="partySize()"
 *   [monsterGroups]="combatState().monsterGroups"
 *   [canFlee]="combatState().canFlee"
 *   [allActionsSelected]="allActionsSelected()"
 *   [hasSpells]="currentCharacter().spellPoints?.mage || currentCharacter().spellPoints?.priest"
 *   (actionSelected)="onAction($event)"
 *   (targetSelected)="onTarget($event)"
 *   (executeRound)="onExecute()"
 *   (back)="onBack()"
 *   (openSpellMenu)="onOpenSpells()"
 * />
 */
@Component({
  selector: 'app-combat-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combat-drawer.component.html',
  styleUrls: ['./combat-drawer.component.scss']
})
export class CombatDrawerComponent {
  // Inputs
  readonly mode = input<CombatDrawerMode>('hidden')
  readonly roundNumber = input(1)
  readonly activeCharacter = input<Character | null>(null)
  readonly activeCharacterIndex = input(0)
  readonly totalCharacters = input(0)
  readonly monsterGroups = input<MonsterGroup[]>([])
  readonly canFlee = input(false)
  readonly allActionsSelected = input(false)
  readonly hasSpells = input(false)
  readonly selectedActions = input<Map<string, CombatCommand>>(new Map())
  readonly isExecuting = input(false)
  readonly isTargetingMode = input(false)  // External targeting mode (for spells)

  // Outputs
  readonly actionSelected = output<CombatActionType>()
  readonly targetSelected = output<'A' | 'B' | 'C' | 'D'>()
  readonly executeRound = output<void>()
  readonly back = output<void>()
  readonly openSpellMenu = output<void>()

  // Internal state
  readonly internalTargetSelection = signal(false)  // Internal targeting (for attack)
  readonly pendingAction = signal<CombatActionType | null>(null)

  // Computed: show target row if internal OR external targeting is active
  readonly showTargetSelection = computed(() =>
    this.internalTargetSelection() || this.isTargetingMode()
  )

  // Computed: alive monster groups for targeting
  readonly aliveGroups = computed(() =>
    this.monsterGroups().filter(g => g.monsters.some(m => m.hp > 0))
  )

  // Computed: current character's selected action text
  readonly currentActionText = computed(() => {
    const char = this.activeCharacter()
    if (!char) return null
    const action = this.selectedActions().get(char.id)
    if (!action) return null
    return this.getActionDisplayText(action)
  })

  // Computed: title for drawer header
  readonly headerTitle = computed(() => {
    const mode = this.mode()
    if (mode === 'minimized') {
      return `ROUND ${this.roundNumber()} - EXECUTING...`
    }
    const char = this.activeCharacter()
    const idx = this.activeCharacterIndex()
    const total = this.totalCharacters()
    if (!char) return `ROUND ${this.roundNumber()}`
    return `ROUND ${this.roundNumber()} - ${char.name.toUpperCase()} (${idx + 1}/${total})`
  })

  // Computed: is this the first character (hide back button)
  readonly isFirstCharacter = computed(() => this.activeCharacterIndex() === 0)

  /**
   * Handle keyboard shortcuts for combat actions
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const mode = this.mode()
    if (mode === 'hidden' || mode === 'minimized' || this.isExecuting()) return

    const key = event.key.toUpperCase()

    // Target selection mode
    if (this.showTargetSelection()) {
      if (key === 'ESCAPE') {
        this.cancelTargetSelection()
        event.preventDefault()
        return
      }
      // Number keys 1-4 for group selection
      if (event.key >= '1' && event.key <= '4') {
        const groups = this.aliveGroups()
        const index = parseInt(event.key) - 1
        if (index < groups.length) {
          this.selectTarget(groups[index].id)
          event.preventDefault()
        }
        return
      }
      // Letter keys A-D for direct group selection
      if (['A', 'B', 'C', 'D'].includes(key)) {
        const groupId = key as 'A' | 'B' | 'C' | 'D'
        const group = this.aliveGroups().find(g => g.id === groupId)
        if (group) {
          this.selectTarget(groupId)
          event.preventDefault()
        }
        return
      }
      return
    }

    // Action selection mode
    if (mode === 'action_select') {
      switch (key) {
        case 'A':
          this.selectAction('ATTACK')
          event.preventDefault()
          break
        case 'C':
          if (this.hasSpells()) {
            this.openSpellMenu.emit()
            event.preventDefault()
          }
          break
        case 'P':
          this.selectAction('PARRY')
          event.preventDefault()
          break
        case 'F':
          if (this.canFlee()) {
            this.selectAction('RUN')
            event.preventDefault()
          }
          break
        case 'ESCAPE':
          if (!this.isFirstCharacter()) {
            this.back.emit()
            event.preventDefault()
          }
          break
        case 'ENTER':
          if (this.allActionsSelected()) {
            this.executeRound.emit()
            event.preventDefault()
          }
          break
      }
    }
  }

  /**
   * Handle action button click
   */
  selectAction(actionType: CombatActionType): void {
    if (this.isExecuting()) return

    // Actions that don't need targeting
    if (actionType === 'PARRY' || actionType === 'RUN') {
      this.actionSelected.emit(actionType)
      return
    }

    // Attack needs target selection
    if (actionType === 'ATTACK') {
      this.pendingAction.set(actionType)
      this.internalTargetSelection.set(true)
      return
    }

    // Cast spell opens spell menu
    if (actionType === 'CAST_SPELL') {
      this.openSpellMenu.emit()
      return
    }
  }

  /**
   * Handle target group selection
   */
  selectTarget(groupId: 'A' | 'B' | 'C' | 'D'): void {
    // For internal targeting (attack), use pendingAction
    // For external targeting (spell), just emit the target
    const action = this.pendingAction()

    this.internalTargetSelection.set(false)
    this.pendingAction.set(null)

    if (action) {
      // Internal targeting - emit action first, then target
      this.actionSelected.emit(action)
    }
    // Always emit target for both internal and external targeting
    this.targetSelected.emit(groupId)
  }

  /**
   * Cancel target selection and return to action menu
   */
  cancelTargetSelection(): void {
    this.internalTargetSelection.set(false)
    this.pendingAction.set(null)
  }

  /**
   * Get group display name with proper identification support
   * Before LATUMAPIC: "A: 3 SMALL HUMANOIDS"
   * After LATUMAPIC: "A: 3 KOBOLDS"
   */
  getGroupDisplayName(group: MonsterGroup): string {
    const aliveCount = group.monsters.filter(m => m.hp > 0).length
    const firstMonster = group.monsters[0]
    if (!firstMonster) return `${group.id}: ???`

    const displayText = getIdentifiedGroupDisplayText(aliveCount, firstMonster, group.identified)
    return `${group.id}: ${displayText}`
  }

  /**
   * Get color for group button
   */
  getGroupColor(groupId: 'A' | 'B' | 'C' | 'D'): string {
    const colors = {
      A: '#ff6b6b',
      B: '#4ecdc4',
      C: '#ffe66d',
      D: '#a8e6cf'
    }
    return colors[groupId]
  }

  /**
   * Check if group has alive monsters
   */
  hasAliveMonsters(group: MonsterGroup): boolean {
    return group.monsters.some(m => m.hp > 0)
  }

  /**
   * Get action display text for a command
   */
  private getActionDisplayText(command: CombatCommand): string {
    switch (command.type) {
      case 'ATTACK':
        return 'ATTACK'
      case 'PARRY':
        return 'PARRY'
      case 'RUN':
        return 'FLEE'
      case 'CAST_SPELL':
        if (command.data) {
          const spell = SpellCastingService.getSpell(command.data)
          return spell ? spell.name.toUpperCase() : 'CAST'
        }
        return 'CAST'
      default:
        return command.type
    }
  }
}
