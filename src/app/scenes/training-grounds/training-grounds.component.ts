import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { GameStateService } from '@services/GameStateService'
import { CharacterService } from '@services/CharacterService'
import { ClassChangeService } from '@services/ClassChangeService'
import { SceneNavigationService } from '@services/SceneNavigationService'
import { MessageService } from '@services/MessageService'
import { GameStateQueries } from '@utils/GameStateQueries'
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component'
import { RosterManagementDialogComponent, RosterActionEvent } from '@shared/components/roster-management-dialog/roster-management-dialog.component'
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component'
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component'
import { CachedImageDirective } from '@shared/directives/cached-image.directive'
import { MenuItem } from '@shared/components/menu/menu.component'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { SceneType } from '@models/SceneType'

interface ClassBreakdownEntry {
  class: CharacterClass
  abbr: string
  count: number
  percent: number
}

/**
 * Training Grounds Component - Roster Management Hub
 *
 * Responsibilities:
 * - Display available characters (not in party)
 * - Navigate to character creation wizard
 * - Navigate to character inspection
 * - Handle character deletion with confirmation
 * - Coordinate state updates via services
 */
@Component({
  selector: 'app-training-grounds',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmationDialogComponent,
    RosterManagementDialogComponent,
    SceneTitleComponent,
    SceneFooterComponent,
    CachedImageDirective
  ],
  templateUrl: './training-grounds.component.html',
  styleUrls: ['./training-grounds.component.scss']
})
export class TrainingGroundsComponent implements OnInit {
  private readonly gameState = inject(GameStateService)
  private readonly navigation = inject(SceneNavigationService)
  readonly messages = inject(MessageService)

  // Class abbreviations for display
  private readonly classAbbrevs: Record<CharacterClass, string> = {
    [CharacterClass.FIGHTER]: 'FIG',
    [CharacterClass.MAGE]: 'MAG',
    [CharacterClass.PRIEST]: 'PRI',
    [CharacterClass.THIEF]: 'THI',
    [CharacterClass.BISHOP]: 'BIS',
    [CharacterClass.SAMURAI]: 'SAM',
    [CharacterClass.LORD]: 'LOR',
    [CharacterClass.NINJA]: 'NIN'
  }

  // Delete confirmation dialog state
  readonly showDeleteConfirmation = signal(false)
  readonly deleteConfirmationMessage = signal('')
  private pendingDeleteId: string | null = null

  // Class change dialog state
  readonly showClassChangeDialog = signal(false)
  readonly classChangeCharacter = signal<Character | null>(null)
  readonly availableClasses = signal<CharacterClass[]>([])

  // Roster dialog state
  readonly showRosterDialog = signal(false)

  // Computed available characters using GameStateQueries
  readonly availableCharacters = computed<Character[]>(() => {
    const state = this.gameState.state()
    return GameStateQueries.availableCharacters(state)
  })

  // Roster statistics
  readonly rosterStats = computed(() => {
    const chars = this.availableCharacters()
    const alive = chars.filter(c =>
      c.status === CharacterStatus.OK || c.status === CharacterStatus.INJURED
    )
    const avgLevel = chars.length > 0
      ? Math.round(chars.reduce((sum, c) => sum + c.level, 0) / chars.length)
      : 0
    return {
      total: chars.length,
      alive: alive.length,
      dead: chars.length - alive.length,
      avgLevel,
      maxLevel: Math.max(0, ...chars.map(c => c.level))
    }
  })

  // Class breakdown for chart display
  readonly classBreakdownEntries = computed((): ClassBreakdownEntry[] => {
    const chars = this.availableCharacters()
    const total = chars.length
    const classOrder: CharacterClass[] = [
      CharacterClass.FIGHTER,
      CharacterClass.MAGE,
      CharacterClass.PRIEST,
      CharacterClass.THIEF,
      CharacterClass.BISHOP,
      CharacterClass.SAMURAI,
      CharacterClass.LORD,
      CharacterClass.NINJA
    ]

    return classOrder.map(cls => {
      const count = chars.filter(c => c.class === cls).length
      return {
        class: cls,
        abbr: this.classAbbrevs[cls],
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0
      }
    })
  })

  // Footer menu items
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'roster', label: 'View Roster', shortcut: 'R', enabled: this.availableCharacters().length > 0 },
    { id: 'create', label: 'Create Character', shortcut: 'C', enabled: true },
    { id: 'return', label: 'Return to Castle', shortcut: 'ESC', enabled: true }
  ])

  ngOnInit(): void {
    this.messages.clear()
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }))
  }

  handleCreateCharacter(): void {
    this.navigation.createCharacter()
  }

  handleInspectCharacter(characterId: string): void {
    this.navigation.inspectCharacter(characterId, 'training-grounds')
  }

  handleDeleteCharacter(characterId: string): void {
    const character = this.gameState.state().roster.get(characterId)
    if (!character) return

    this.pendingDeleteId = characterId
    this.deleteConfirmationMessage.set(
      `Are you sure you want to delete ${character.name}? This action cannot be undone.`
    )
    this.showDeleteConfirmation.set(true)
  }

  confirmDelete(): void {
    if (!this.pendingDeleteId) return

    try {
      const characterId = this.pendingDeleteId
      this.gameState.updateState(state =>
        CharacterService.deleteCharacter(state, characterId)
      )
      this.messages.clear()
    } catch (error) {
      console.error('Failed to delete character:', error)
      this.messages.showError((error as Error).message)
    }

    this.closeDeleteDialog()
  }

  cancelDelete(): void {
    this.closeDeleteDialog()
  }

  // Class change methods
  hasAvailableClasses(character: Character): boolean {
    return ClassChangeService.getAvailableClasses(character).length > 0
  }

  handleChangeClass(character: Character): void {
    const available = ClassChangeService.getAvailableClasses(character)
    this.classChangeCharacter.set(character)
    this.availableClasses.set(available)
    this.showClassChangeDialog.set(true)
  }

  confirmClassChange(newClass: CharacterClass): void {
    const char = this.classChangeCharacter()
    if (!char) return

    const result = ClassChangeService.changeClass(char, newClass)
    if (result.success && result.updatedCharacter) {
      this.gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(char.id, result.updatedCharacter!)
      }))
      const years = Math.floor(result.ageIncrease / 52)
      this.messages.showSuccess(`${char.name} is now a ${newClass}! (Aged ${years} years)`)
    } else {
      this.messages.showError(result.error || 'Class change failed')
    }
    this.closeClassChangeDialog()
  }

  cancelClassChange(): void {
    this.closeClassChangeDialog()
    // Return to roster dialog
    this.showRosterDialog.set(true)
  }

  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'roster':
        this.showRosterDialog.set(true)
        break
      case 'create':
        this.handleCreateCharacter()
        break
      case 'return':
        this.navigation.returnToCastle()
        break
    }
  }

  // Roster dialog action handler
  handleRosterAction(event: RosterActionEvent): void {
    switch (event.action) {
      case 'inspect':
        this.closeRosterDialog()
        this.handleInspectCharacter(event.character.id)
        break
      case 'changeClass':
        this.closeRosterDialog()
        this.handleChangeClass(event.character)
        break
      case 'delete':
        this.closeRosterDialog()
        this.handleDeleteCharacter(event.character.id)
        break
    }
  }

  closeRosterDialog(): void {
    this.showRosterDialog.set(false)
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.showRosterDialog()) {
      this.closeRosterDialog()
    } else if (this.showClassChangeDialog()) {
      this.cancelClassChange()  // Return to roster dialog, not scene
    } else if (!this.showDeleteConfirmation()) {
      this.navigation.returnToCastle()
    }
  }

  private closeDeleteDialog(): void {
    this.showDeleteConfirmation.set(false)
    this.deleteConfirmationMessage.set('')
    this.pendingDeleteId = null
  }

  private closeClassChangeDialog(): void {
    this.showClassChangeDialog.set(false)
    this.classChangeCharacter.set(null)
    this.availableClasses.set([])
  }
}
