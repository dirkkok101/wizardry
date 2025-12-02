import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { GameStateService } from '@services/GameStateService'
import { CharacterService } from '@services/CharacterService'
import { ClassChangeService } from '@services/ClassChangeService'
import { SceneNavigationService } from '@services/SceneNavigationService'
import { MessageService } from '@services/MessageService'
import { GameStateQueries } from '@utils/GameStateQueries'
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component'
import { CharacterListItemComponent } from '@shared/components/character-list-item/character-list-item.component'
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component'
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component'
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component'
import { MenuItem } from '@shared/components/menu/menu.component'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Party } from '@models/GameState'
import { SceneType } from '@models/SceneType'

interface CharacterWithStatus {
  character: Character
  status: CharacterStatus
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
    CharacterListItemComponent,
    EmptyStateComponent,
    SceneTitleComponent,
    SceneFooterComponent
  ],
  templateUrl: './training-grounds.component.html',
  styleUrls: ['./training-grounds.component.scss']
})
export class TrainingGroundsComponent implements OnInit {
  private readonly gameState = inject(GameStateService)
  private readonly navigation = inject(SceneNavigationService)
  readonly messages = inject(MessageService)

  // Delete confirmation dialog state
  readonly showDeleteConfirmation = signal(false)
  readonly deleteConfirmationMessage = signal('')
  private pendingDeleteId: string | null = null

  // Class change dialog state
  readonly showClassChangeDialog = signal(false)
  readonly classChangeCharacter = signal<Character | null>(null)
  readonly availableClasses = signal<CharacterClass[]>([])

  // Computed available characters using GameStateQueries
  readonly availableCharacters = computed<CharacterWithStatus[]>(() => {
    const state = this.gameState.state()
    const party = this.gameState.party()

    return GameStateQueries.availableCharacters(state)
      .map(char => ({
        character: char,
        status: this.getCharacterStatus(char, party)
      }))
  })

  // Footer menu items
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'create', label: 'CREATE CHARACTER', shortcut: 'C', enabled: true },
    { id: 'return', label: 'Return to Castle (ESC)', shortcut: 'ESC', enabled: true }
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
  }

  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'create':
        this.handleCreateCharacter()
        break
      case 'return':
        this.navigation.returnToCastle()
        break
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.showClassChangeDialog()) {
      this.closeClassChangeDialog()
    } else if (!this.showDeleteConfirmation()) {
      this.navigation.returnToCastle()
    }
  }

  private getCharacterStatus(char: Character, _party: Party): CharacterStatus {
    return char.status
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
