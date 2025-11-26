import { Component, computed, inject, signal, HostListener } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { GameStateService } from '../../services/GameStateService'
import { ItemDataLoader } from '../../services/ItemDataLoader'
import { EquipmentService } from '../../services/EquipmentService'
import { InventoryService } from '../../services/InventoryService'
import { SceneNavigationService } from '../../services/SceneNavigationService'
import { SpellLearningService } from '../../services/SpellLearningService'
import { SpellDataLoader } from '../../services/SpellDataLoader'
import { GameStateQueries } from '../../utils/GameStateQueries'
import { MessageService } from '../../services/MessageService'
import { Character } from '../../types/Character'
import { CharacterClass } from '../../types/CharacterClass'
import { Item } from '../../types/Item'
import { ItemSlot } from '../../types/ItemType'
import { CharacterAction, CharacterActionEvent } from '../../types/CharacterCardTypes'
import { ItemCardComponent, ItemAction } from '../shared/components/item-card/item-card.component'
import { TradeItemDialogComponent } from '../shared/components/trade-item-dialog/trade-item-dialog.component'
import { ConfirmationDialogComponent } from '../shared/components/confirmation-dialog/confirmation-dialog.component'
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component'
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component'
import { CharacterDetailCardComponent, InspectionMode } from '../shared/components/character-detail-card/character-detail-card.component'
import { SpellBookDialogComponent } from '../shared/components/spell-book-dialog/spell-book-dialog.component'
import { SpellSelectionDialogComponent, SpellOption } from '../shared/components/spell-selection-dialog/spell-selection-dialog.component'
import { MenuItem } from '../shared/components/menu/menu.component'

/**
 * Character Inspection Component - Full redesign with party vs character action pattern
 *
 * Features:
 * - CharacterDetailCard with stats, spell points, and character actions
 * - Equipment/Inventory with ItemCard components
 * - Mode-aware: Training Grounds, Tavern, or Camp (Maze)
 * - Party actions in footer, character/item actions on cards
 * - Spell book viewing and spell casting (Camp mode)
 * - Uses MessageService for consistent feedback
 */
@Component({
  selector: 'app-character-inspection',
  standalone: true,
  imports: [
    CommonModule,
    ItemCardComponent,
    TradeItemDialogComponent,
    ConfirmationDialogComponent,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterDetailCardComponent,
    SpellBookDialogComponent,
    SpellSelectionDialogComponent
  ],
  templateUrl: './character-inspection.component.html',
  styleUrls: ['./character-inspection.component.scss']
})
export class CharacterInspectionComponent {
  private readonly gameState = inject(GameStateService)
  private readonly navigation = inject(SceneNavigationService)
  private readonly route = inject(ActivatedRoute)
  readonly messages = inject(MessageService)

  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as Record<string, string>
  })

  readonly characterId = computed(() =>
    this.queryParams()['characterId'] || null
  )

  readonly returnTo = computed(() =>
    this.queryParams()['returnTo'] || 'castle-menu'
  )

  // Determine inspection mode from query params or returnTo
  readonly mode = computed((): InspectionMode => {
    const modeParam = this.queryParams()['mode']
    if (modeParam === 'TRAINING_GROUNDS' || modeParam === 'TAVERN' || modeParam === 'CAMP') {
      return modeParam
    }
    // Fallback based on returnTo
    const returnTo = this.returnTo()
    if (returnTo === 'training-grounds') return 'TRAINING_GROUNDS'
    if (returnTo === 'tavern') return 'TAVERN'
    if (returnTo === 'maze') return 'CAMP'
    return 'TAVERN' // Default
  })

  readonly character = computed(() => {
    const id = this.characterId()
    if (!id) return null
    return GameStateQueries.getCharacter(this.gameState.state(), id) || null
  })

  // Get party members for trading (excluding current character)
  readonly partyMembers = computed(() => {
    const currentId = this.characterId()
    return GameStateQueries.partyCharacters(this.gameState.state())
      .filter(char => char.id !== currentId)
  })

  // Show party gold in Tavern mode
  readonly showPartyGold = computed(() => this.mode() === 'TAVERN')

  // Equipment slots
  readonly weaponSlot = computed(() => this.getEquipmentSlot(ItemSlot.WEAPON))
  readonly armorSlot = computed(() => this.getEquipmentSlot(ItemSlot.ARMOR))
  readonly shieldSlot = computed(() => this.getEquipmentSlot(ItemSlot.SHIELD))
  readonly helmetSlot = computed(() => this.getEquipmentSlot(ItemSlot.HELMET))
  readonly gauntletsSlot = computed(() => this.getEquipmentSlot(ItemSlot.GAUNTLETS))

  // Inventory items
  readonly inventoryItems = computed(() => {
    const char = this.character()
    if (!char) return []

    return char.inventory
      .map(id => typeof id === 'string' ? ItemDataLoader.getItem(id) : id)
      .filter((item): item is Item => item !== null)
  })

  // Character actions based on mode
  readonly characterActions = computed((): CharacterAction[] => {
    const char = this.character()
    if (!char) return []

    const actions: CharacterAction[] = []
    const mode = this.mode()

    // Spell book viewing available in all modes for casters
    if (SpellLearningService.isCaster(char) && char.knownSpells.length > 0) {
      actions.push({ type: 'read-spells', label: 'Spells' })
    }

    switch (mode) {
      case 'TRAINING_GROUNDS':
        // Training-specific: class change, delete (not implemented yet)
        break

      case 'TAVERN':
        // Bishop identification
        if (char.class === CharacterClass.BISHOP && this.hasUnidentifiedItems()) {
          actions.push({ type: 'identify', label: 'Identify' })
        }
        break

      case 'CAMP':
        // Spell casting
        if (SpellLearningService.isCaster(char) && this.hasSpellPoints()) {
          actions.push({ type: 'cast-spell', label: 'Cast' })
        }
        // Bishop identification
        if (char.class === CharacterClass.BISHOP && this.hasUnidentifiedItems()) {
          actions.push({ type: 'identify', label: 'Identify' })
        }
        break
    }

    return actions
  })

  // Footer menu items (party-level actions)
  readonly footerMenuItems = computed((): MenuItem[] => {
    const items: MenuItem[] = []

    // Return always available
    items.push({ id: 'back', label: 'Return', shortcut: 'ESC', enabled: true })

    return items
  })

  // Dialog state
  showTradeDialog = signal(false)
  showDropDialog = signal(false)
  showSpellBookDialog = signal(false)
  showSpellCastDialog = signal(false)
  pendingAction = signal<{ action: string; item: Item } | null>(null)

  readonly ItemSlot = ItemSlot

  // Check if character has unidentified items
  private hasUnidentifiedItems(): boolean {
    const items = this.inventoryItems()
    return items.some(item => !item.identified)
  }

  // Check if character has spell points
  private hasSpellPoints(): boolean {
    const char = this.character()
    if (!char || !char.spellPoints) return false

    const mage = char.spellPoints.mage
    const priest = char.spellPoints.priest

    if (mage) {
      for (let i = 1; i <= 7; i++) {
        const key = `level${i}` as keyof typeof mage
        if (mage[key]?.current > 0) return true
      }
    }
    if (priest) {
      for (let i = 1; i <= 7; i++) {
        const key = `level${i}` as keyof typeof priest
        if (priest[key]?.current > 0) return true
      }
    }
    return false
  }

  // Show Use button only in Camp mode
  readonly showUseButton = computed(() => this.mode() === 'CAMP')

  // Show item actions only in Tavern and Camp modes
  readonly showItemActions = computed(() => this.mode() !== 'TRAINING_GROUNDS')

  private getEquipmentSlot(slot: ItemSlot): Item | null {
    const char = this.character()
    if (!char) return null

    const slotField = this.getSlotField(slot)
    if (!slotField) return null

    const itemId = char[slotField] as string | undefined
    if (!itemId) return null

    return ItemDataLoader.getItem(itemId)
  }

  private getSlotField(slot: ItemSlot): keyof Character | null {
    switch (slot) {
      case ItemSlot.WEAPON: return 'equippedWeapon'
      case ItemSlot.ARMOR: return 'equippedArmor'
      case ItemSlot.SHIELD: return 'equippedShield'
      case ItemSlot.HELMET: return 'equippedHelmet'
      case ItemSlot.GAUNTLETS: return 'equippedGauntlets'
      default: return null
    }
  }

  // Handle character card actions
  handleCharacterAction(event: CharacterActionEvent): void {
    switch (event.actionType) {
      case 'read-spells':
        this.showSpellBookDialog.set(true)
        break
      case 'cast-spell':
        this.showSpellCastDialog.set(true)
        break
      case 'identify':
        this.identifyNextItem()
        break
    }
  }

  // Handle item card actions
  handleItemAction(action: ItemAction): void {
    const char = this.character()
    if (!char) return

    switch (action.type) {
      case 'equip':
        this.equipItem(char, action.item)
        break
      case 'unequip':
        this.unequipItem(char, action.item)
        break
      case 'trade':
        this.pendingAction.set({ action: 'trade', item: action.item })
        this.showTradeDialog.set(true)
        break
      case 'drop':
        this.pendingAction.set({ action: 'drop', item: action.item })
        this.showDropDialog.set(true)
        break
      case 'use':
        this.useItem(char, action.item)
        break
    }
  }

  private equipItem(char: Character, item: Item): void {
    try {
      const updated = EquipmentService.equipItem(char, item.id)
      this.updateCharacter(updated)
      this.messages.showSuccess(`Equipped ${item.name}`)
    } catch (error: any) {
      this.messages.showError(error.message || 'Failed to equip item')
    }
  }

  private unequipItem(char: Character, item: Item): void {
    try {
      const updated = EquipmentService.unequipItem(char, item.slot)
      this.updateCharacter(updated)
      this.messages.showSuccess(`Unequipped ${item.name}`)
    } catch (error: any) {
      this.messages.showError(error.message || 'Failed to unequip item')
    }
  }

  private useItem(_char: Character, item: Item): void {
    // Item use would be implemented here
    this.messages.showSuccess(`Used ${item.name}`)
    // TODO: Implement actual item use logic
  }

  private identifyNextItem(): void {
    const char = this.character()
    if (!char) return

    const unidentified = this.inventoryItems().find(item => !item.identified)
    if (!unidentified) {
      this.messages.showError('No unidentified items')
      return
    }

    // Mark item as identified
    const updatedItem = { ...unidentified, identified: true }
    const updatedInventory = char.inventory.map(id => {
      if (typeof id === 'string' && id === unidentified.id) {
        return updatedItem
      }
      return id
    })

    const updatedChar: Character = {
      ...char,
      inventory: updatedInventory
    }
    this.updateCharacter(updatedChar)

    if (unidentified.cursed) {
      this.messages.showError(`This is ${unidentified.name}! IT'S CURSED!`)
    } else {
      this.messages.showSuccess(`This is ${unidentified.name}!`)
    }
  }

  confirmTrade(recipientId: string): void {
    const pending = this.pendingAction()
    const char = this.character()
    if (!pending || !char || pending.action !== 'trade') return

    const recipient = this.gameState.state().roster.get(recipientId)
    if (!recipient) return

    try {
      const result = InventoryService.transferItem(char, recipient, pending.item.id)
      this.updateCharacter(result.from)
      this.updateCharacter(result.to)
      this.showTradeDialog.set(false)
      this.pendingAction.set(null)
      this.messages.showSuccess(`Traded ${pending.item.name} to ${recipient.name}`)
    } catch (error: any) {
      this.messages.showError(error.message || 'Failed to trade item')
    }
  }

  confirmDrop(): void {
    const pending = this.pendingAction()
    const char = this.character()
    if (!pending || !char || pending.action !== 'drop') return

    try {
      const updated = InventoryService.dropItem(char, pending.item.id)
      this.updateCharacter(updated)
      this.showDropDialog.set(false)
      this.pendingAction.set(null)
      this.messages.showSuccess(`Dropped ${pending.item.name}`)
    } catch (error: any) {
      this.messages.showError(error.message || 'Failed to drop item')
    }
  }

  cancelDialog(): void {
    this.showTradeDialog.set(false)
    this.showDropDialog.set(false)
    this.pendingAction.set(null)
  }

  closeSpellBookDialog(): void {
    this.showSpellBookDialog.set(false)
  }

  // Spell casting (available spell options)
  readonly availableSpellOptions = computed((): SpellOption[] => {
    const char = this.character()
    if (!char || !char.knownSpells) return []

    const options: SpellOption[] = []
    let index = 1

    for (const spellId of char.knownSpells) {
      const spell = SpellDataLoader.getSpell(spellId)
      if (!spell) continue

      // Only dungeon-castable spells
      if (!spell.castableIn.includes('dungeon')) continue

      // Get spell points for this level
      const pool = spell.casterType === 'mage' ? char.spellPoints?.mage : char.spellPoints?.priest
      const levelKey = `level${spell.level}` as keyof typeof pool
      const spellPoints = pool?.[levelKey] ?? { current: 0, max: 0 }

      options.push({
        spell,
        index: index++,
        enabled: spellPoints.current > 0,
        spellPoints
      })

      if (index > 9) break // Max 9 options
    }

    return options
  })

  onSpellSelected(spell: any): void {
    this.showSpellCastDialog.set(false)
    // Handle spell casting - would need target selection for single-target spells
    this.messages.showSuccess(`Cast ${spell.name}!`)
    // TODO: Implement full spell casting with deduction and effects
  }

  onSpellDialogCancelled(): void {
    this.showSpellCastDialog.set(false)
  }

  private updateCharacter(updated: Character): void {
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(updated.id, updated)
    }))
  }

  returnToPrevious(): void {
    this.navigation.returnFromInspection(this.returnTo())
  }

  handleFooterAction(itemId: string): void {
    if (itemId === 'back') {
      this.returnToPrevious()
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Don't handle if a dialog is open
    if (this.showTradeDialog() || this.showDropDialog() ||
        this.showSpellBookDialog() || this.showSpellCastDialog()) {
      return
    }
    this.returnToPrevious()
  }
}
