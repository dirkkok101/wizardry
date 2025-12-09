import { Component, computed, inject, signal, HostListener } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { GameStateService } from '@services/GameStateService'
import { EquipmentService } from '@services/EquipmentService'
import { InventoryService } from '@services/InventoryService'
import { SceneNavigationService } from '@services/SceneNavigationService'
import { SpellLearningService } from '@services/SpellLearningService'
import { ShopService } from '@services/ShopService'
import { ItemUseService, ItemUseResult } from '@services/ItemUseService'
import { SpellDataLoader } from '@services/SpellDataLoader'
import { GameStateQueries } from '@utils/GameStateQueries'
import { MessageService } from '@services/MessageService'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Item } from '@models/Item'
import { ItemSlot } from '@models/ItemType'
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes'
import { ItemCardComponent, ItemAction, ShopContext } from '@shared/components/item-card/item-card.component'
import { TradeItemDialogComponent } from '@shared/components/trade-item-dialog/trade-item-dialog.component'
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component'
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component'
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component'
import { CharacterDetailCardComponent, InspectionMode } from '@shared/components/character-detail-card/character-detail-card.component'
import { SpellPanelComponent } from '@shared/components/spell-panel/spell-panel.component'
import { SpellData } from '@services/SpellCastingService'
import { MenuItem } from '@shared/components/menu/menu.component'

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
    SpellPanelComponent
  ],
  templateUrl: './character-inspection.component.html',
  styleUrls: ['./character-inspection.component.scss']
})
export class CharacterInspectionComponent {
  private readonly gameState = inject(GameStateService)
  private readonly navigation = inject(SceneNavigationService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
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

  // Get all party members for navigation (in party order)
  readonly allPartyMembers = computed(() =>
    GameStateQueries.partyCharacters(this.gameState.state())
  )

  // Current index in party for navigation
  readonly currentIndex = computed(() => {
    const id = this.characterId()
    const members = this.allPartyMembers()
    return members.findIndex(c => c.id === id)
  })

  // Navigation helpers - cyclical (wraps around)
  readonly canNavigate = computed(() => this.allPartyMembers().length > 1)

  readonly prevCharacter = computed(() => {
    const members = this.allPartyMembers()
    if (members.length <= 1) return null
    const idx = this.currentIndex()
    // Wrap to last character if at first
    const prevIdx = idx <= 0 ? members.length - 1 : idx - 1
    return members[prevIdx]
  })

  readonly nextCharacter = computed(() => {
    const members = this.allPartyMembers()
    if (members.length <= 1) return null
    const idx = this.currentIndex()
    // Wrap to first character if at last
    const nextIdx = idx >= members.length - 1 ? 0 : idx + 1
    return members[nextIdx]
  })

  // Show party gold in Tavern mode or Shop mode
  readonly showPartyGold = computed(() => this.mode() === 'TAVERN' || this.isShopContext())

  // Check if we're in shop context (coming from shop scene)
  readonly isShopContext = computed(() => this.returnTo() === 'shop')

  // Party gold for shop context
  readonly partyGold = computed(() =>
    GameStateQueries.partyGold(this.gameState.state())
  )

  // Shop context for ItemCards (when coming from shop)
  readonly shopContext = computed((): ShopContext | null => {
    if (!this.isShopContext()) return null

    return {
      enabled: true,
      partyGold: this.partyGold(),
      identifyCost: ShopService.calculateIdentifyPrice({} as Item),
      getUncurseCost: (item: Item) => ShopService.calculateUncursePrice(item),
      getSellPrice: (item: Item) => ShopService.calculateSellPrice(item)
    }
  })

  // Equipment slots
  readonly weaponSlot = computed(() => this.getEquipmentSlot(ItemSlot.WEAPON))
  readonly armorSlot = computed(() => this.getEquipmentSlot(ItemSlot.ARMOR))
  readonly shieldSlot = computed(() => this.getEquipmentSlot(ItemSlot.SHIELD))
  readonly helmetSlot = computed(() => this.getEquipmentSlot(ItemSlot.HELMET))
  readonly gauntletsSlot = computed(() => this.getEquipmentSlot(ItemSlot.GAUNTLETS))

  // Inventory items (inventory stores full Item objects)
  readonly inventoryItems = computed(() => {
    const char = this.character()
    if (!char) return []
    return char.inventory
  })

  // Character actions based on mode
  // Note: Spell Book viewing moved to footer menu
  readonly characterActions = computed((): CharacterAction[] => {
    const char = this.character()
    if (!char) return []

    const actions: CharacterAction[] = []
    const mode = this.mode()

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
    const char = this.character()
    const prevChar = this.prevCharacter()
    const nextChar = this.nextCharacter()

    // Prev character (leftmost) - show name if available
    items.push({
      id: 'prev',
      label: prevChar ? `◀ ${prevChar.name}` : '◀ Prev',
      shortcut: 'Q',
      enabled: this.canNavigate()
    })

    // Spell Book option for casters with known spells
    if (char && SpellLearningService.isCaster(char) && char.knownSpells.length > 0) {
      items.push({ id: 'spells', label: 'Spell Book', shortcut: 'S', enabled: true })
    }

    // Return always available
    items.push({ id: 'back', label: 'Return', shortcut: 'ESC', enabled: true })

    // Next character (rightmost) - show name if available
    items.push({
      id: 'next',
      label: nextChar ? `${nextChar.name} ▶` : 'Next ▶',
      shortcut: 'E',
      enabled: this.canNavigate()
    })

    return items
  })

  // Dialog state
  showTradeDialog = signal(false)
  showDropDialog = signal(false)
  showSpellBookDialog = signal(false)
  showSpellCastDialog = signal(false)
  showPotionTargetDialog = signal(false)
  pendingAction = signal<{ action: string; item: Item } | null>(null)
  pendingPotionResult = signal<ItemUseResult | null>(null)

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

    // Equipment slots now store full Item objects directly
    switch (slot) {
      case ItemSlot.WEAPON: return char.equippedWeapon ?? null
      case ItemSlot.ARMOR: return char.equippedArmor ?? null
      case ItemSlot.SHIELD: return char.equippedShield ?? null
      case ItemSlot.HELMET: return char.equippedHelmet ?? null
      case ItemSlot.GAUNTLETS: return char.equippedGauntlets ?? null
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
      case 'sell':
        this.sellItem(char, action.item)
        break
      case 'identify':
        this.identifyItemAtShop(char, action.item)
        break
      case 'uncurse':
        this.uncurseItem(char, action.item)
        break
    }
  }

  private equipItem(char: Character, item: Item): void {
    try {
      const updated = EquipmentService.equipItem(char, item.id)
      this.updateCharacter(updated)
    } catch (error: any) {
      this.messages.showError(error.message || 'Failed to equip item')
    }
  }

  private unequipItem(char: Character, item: Item): void {
    try {
      const updated = EquipmentService.unequipItem(char, item.slot)
      this.updateCharacter(updated)
    } catch (error: any) {
      this.messages.showError(error.message || 'Failed to unequip item')
    }
  }

  /**
   * Use an item (potion, scroll, etc.)
   *
   * Flow:
   * 1. Call ItemUseService to process the item
   * 2. Handle healing result (Potion of Curing/Healing)
   * 3. Handle spell-casting result (Potion of Neutralization, Glass)
   * 4. Update game state with modified character/inventory
   */
  private useItem(char: Character, item: Item): void {
    // 1. Call ItemUseService
    const result = ItemUseService.useItem(char, item.id)

    if (!result.success) {
      this.messages.showError(result.message)
      return
    }

    // 2. Handle healing result (Potions of Curing/Healing)
    if (result.healing && result.healing.amount > 0) {
      this.gameState.updateState(state => {
        const newRoster = new Map(state.roster)
        newRoster.set(char.id, result.updatedCharacter)
        return { ...state, roster: newRoster }
      })
      this.messages.showSuccess(result.message)
      return
    }

    // 3. Handle spell-casting result (Potions of Neutralization/Glass)
    if (result.spellCast) {
      this.handlePotionSpell(char, item, result)
      return
    }

    // 4. Default: just update character (item consumed)
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster)
      newRoster.set(char.id, result.updatedCharacter)
      return { ...state, roster: newRoster }
    })
    this.messages.showInfo(result.message)
  }

  /**
   * Handle potion spell effects (LATUMOFIS, SOPIC, etc.)
   *
   * Different spells require different handling:
   * - Self-targeting (SOPIC): Combat-only AC buff, no effect outside combat
   * - Ally-targeting (LATUMOFIS): Need to select target for status cure
   * - Party-targeting: Apply to all party members
   */
  private handlePotionSpell(
    char: Character,
    item: Item,
    result: ItemUseResult
  ): void {
    const spellId = result.spellCast!.spellId
    const targetType = result.spellCast!.targetType

    // Get spell data for effect details
    const spell = SpellDataLoader.getSpell(spellId)
    if (!spell) {
      // Spell not found - just consume the item
      this.gameState.updateState(state => {
        const newRoster = new Map(state.roster)
        newRoster.set(char.id, result.updatedCharacter)
        return { ...state, roster: newRoster }
      })
      this.messages.showError('Spell effect unknown')
      return
    }

    // Handle based on target type
    if (targetType === 'self') {
      // Self-targeting spells (SOPIC for AC buff - combat only)
      this.applyPotionSpellToSelf(char, item, spell, result)
    } else if (targetType === 'ally') {
      // Single-target spells need target selection (LATUMOFIS)
      this.pendingPotionResult.set(result)
      this.showPotionTargetDialog.set(true)
    } else if (targetType === 'party') {
      // Party-wide effect - apply to all party members
      this.applyPotionSpellToParty(char, item, spell, result)
    } else {
      // Enemy targeting doesn't make sense outside combat
      this.gameState.updateState(state => {
        const newRoster = new Map(state.roster)
        newRoster.set(char.id, result.updatedCharacter)
        return { ...state, roster: newRoster }
      })
      this.messages.showInfo(`${item.name} has no effect outside of combat.`)
    }
  }

  /**
   * Apply self-targeting potion spell (e.g., SOPIC - Glass)
   * AC modifiers only work in combat, so just consume the potion with a message
   */
  private applyPotionSpellToSelf(
    char: Character,
    item: Item,
    spell: { acModifier?: number },
    result: ItemUseResult
  ): void {
    // SOPIC is a combat-only buff (AC modifier)
    if (spell.acModifier) {
      this.gameState.updateState(state => {
        const newRoster = new Map(state.roster)
        newRoster.set(char.id, result.updatedCharacter)
        return { ...state, roster: newRoster }
      })
      this.messages.showInfo(`${item.name} has no effect outside of combat.`)
      return
    }

    // Other self-targeting effects - just consume and show message
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster)
      newRoster.set(char.id, result.updatedCharacter)
      return { ...state, roster: newRoster }
    })
    this.messages.showInfo(result.message)
  }

  /**
   * Apply party-wide potion spell
   */
  private applyPotionSpellToParty(
    char: Character,
    item: Item,
    spell: { statusCure?: string },
    result: ItemUseResult
  ): void {
    const party = this.allPartyMembers()
    let curedCount = 0

    // Apply status cure to all party members if applicable
    if (spell.statusCure) {
      const updates: Character[] = []

      for (const member of party) {
        const cured = this.applyCureToCharacter(member, spell.statusCure)
        if (cured) {
          updates.push(cured)
          curedCount++
        }
      }

      // Update game state with all cured characters
      this.gameState.updateState(state => {
        const newRoster = new Map(state.roster)
        // Update the potion user (item consumed from inventory)
        newRoster.set(char.id, result.updatedCharacter)
        // Update any cured characters
        for (const updated of updates) {
          newRoster.set(updated.id, updated)
        }
        return { ...state, roster: newRoster }
      })

      if (curedCount > 0) {
        this.messages.showSuccess(`${item.name} cured ${curedCount} party member(s)!`)
      } else {
        this.messages.showInfo(`${item.name} had no effect - no one needed curing.`)
      }
      return
    }

    // No status cure - just consume the item
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster)
      newRoster.set(char.id, result.updatedCharacter)
      return { ...state, roster: newRoster }
    })
    this.messages.showInfo(result.message)
  }

  /**
   * Handle target selection for single-target potions (LATUMOFIS)
   */
  onPotionTargetSelected(target: Character): void {
    const result = this.pendingPotionResult()
    if (!result || !result.spellCast) {
      this.showPotionTargetDialog.set(false)
      this.pendingPotionResult.set(null)
      return
    }

    this.showPotionTargetDialog.set(false)

    const spellId = result.spellCast.spellId
    const spell = SpellDataLoader.getSpell(spellId)

    // Apply status cure to selected target
    if (spell?.statusCure) {
      this.applyStatusCure(target, spell.statusCure, result)
    } else {
      // No cure effect - just consume the item
      this.gameState.updateState(state => {
        const newRoster = new Map(state.roster)
        newRoster.set(result.updatedCharacter.id, result.updatedCharacter)
        return { ...state, roster: newRoster }
      })
      this.messages.showInfo(result.message)
    }

    this.pendingPotionResult.set(null)
  }

  /**
   * Cancel potion target selection
   */
  cancelPotionTargetDialog(): void {
    this.showPotionTargetDialog.set(false)
    this.pendingPotionResult.set(null)
  }

  /**
   * Apply status cure to a single target
   */
  private applyStatusCure(
    target: Character,
    cureType: string,
    result: ItemUseResult
  ): void {
    const curedTarget = this.applyCureToCharacter(target, cureType)

    // Update game state
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster)
      // Update the potion user (item consumed from inventory)
      newRoster.set(result.updatedCharacter.id, result.updatedCharacter)
      // Update target if cured (and not the same as user)
      if (curedTarget && curedTarget.id !== result.updatedCharacter.id) {
        newRoster.set(target.id, curedTarget)
      }
      return { ...state, roster: newRoster }
    })

    if (curedTarget) {
      this.messages.showSuccess(`${target.name}'s ${cureType} was cured!`)
    } else {
      this.messages.showInfo(`${target.name} is not ${cureType}ed.`)
    }
  }

  /**
   * Apply a cure effect to a character, returning updated character or null if no change
   */
  private applyCureToCharacter(char: Character, cureType: string): Character | null {
    // Map cure type to status
    const statusToCure = this.mapCureTypeToStatus(cureType)

    if (!statusToCure || char.status !== statusToCure) {
      return null
    }

    return {
      ...char,
      status: CharacterStatus.OK
    }
  }

  /**
   * Map cure type string to CharacterStatus
   */
  private mapCureTypeToStatus(cureType: string): CharacterStatus | null {
    switch (cureType.toLowerCase()) {
      case 'poison':
        return CharacterStatus.POISONED
      case 'paralysis':
        return CharacterStatus.PARALYZED
      case 'stoned':
        return CharacterStatus.STONED
      default:
        return null
    }
  }

  // Shop action: Sell item
  private sellItem(char: Character, item: Item): void {
    const result = ShopService.sellItem(this.gameState.state(), char.id, item)

    if (result.success && result.state) {
      this.gameState.updateState(() => result.state!)
      // Gold update in header provides visual feedback
    } else {
      this.messages.showError(result.error || 'Failed to sell item')
    }
  }

  // Shop action: Identify item (at shop, costs gold)
  private identifyItemAtShop(char: Character, item: Item): void {
    const result = ShopService.identifyItem(this.gameState.state(), char.id, item.id)

    if (result.success && result.state) {
      this.gameState.updateState(() => result.state!)
      // Item name update in inventory provides visual feedback
    } else {
      this.messages.showError(result.error || 'Failed to identify item')
    }
  }

  // Shop action: Uncurse item
  private uncurseItem(char: Character, item: Item): void {
    const result = ShopService.uncurseItem(this.gameState.state(), char.id, item.id)

    if (result.success && result.state) {
      this.gameState.updateState(() => result.state!)
      // Item visual update in inventory provides feedback
    } else {
      this.messages.showError(result.error || 'Failed to uncurse item')
    }
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
    const updatedItem: Item = { ...unidentified, identified: true }
    const updatedInventory = char.inventory.map(item =>
      item.id === unidentified.id ? updatedItem : item
    )

    const updatedChar: Character = {
      ...char,
      inventory: updatedInventory
    }
    this.updateCharacter(updatedChar)

    // Item name update in inventory provides visual feedback
    // Show warning only for cursed items (important safety info)
    if (unidentified.cursed) {
      this.messages.showError(`This is ${unidentified.name}! IT'S CURSED!`)
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

  /**
   * Handle spell selection from SpellPanelComponent
   */
  onSpellSelected(spell: SpellData): void {
    this.showSpellCastDialog.set(false)
    // TODO: Implement full spell casting with deduction and effects
    // Spell point deduction and visual effects will provide feedback
    console.log(`Cast ${spell.name}`) // Temporary logging until spell effects implemented
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

  // Navigate to another character while preserving other query params
  navigateToCharacter(characterId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { characterId },
      queryParamsHandling: 'merge'
    })
  }

  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'prev': {
        const prev = this.prevCharacter()
        if (prev) this.navigateToCharacter(prev.id)
        break
      }
      case 'next': {
        const next = this.nextCharacter()
        if (next) this.navigateToCharacter(next.id)
        break
      }
      case 'back':
        this.returnToPrevious()
        break
      case 'spells':
        this.showSpellBookDialog.set(true)
        break
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Don't handle if a dialog is open
    if (this.showTradeDialog() || this.showDropDialog() ||
        this.showSpellBookDialog() || this.showSpellCastDialog() ||
        this.showPotionTargetDialog()) {
      return
    }
    this.returnToPrevious()
  }

  @HostListener('window:keydown.s')
  handleSpellsShortcut(): void {
    // Don't handle if a dialog is open
    if (this.showTradeDialog() || this.showDropDialog() ||
        this.showSpellBookDialog() || this.showSpellCastDialog() ||
        this.showPotionTargetDialog()) {
      return
    }
    // Only open if character is a caster with spells
    const char = this.character()
    if (char && SpellLearningService.isCaster(char) && char.knownSpells.length > 0) {
      this.showSpellBookDialog.set(true)
    }
  }

  // Character navigation: ArrowLeft for previous (Q is handled by MenuComponent)
  @HostListener('window:keydown.arrowleft')
  handlePrevCharacter(): void {
    // Don't handle if a dialog is open
    if (this.showTradeDialog() || this.showDropDialog() ||
        this.showSpellBookDialog() || this.showSpellCastDialog() ||
        this.showPotionTargetDialog()) {
      return
    }
    const prev = this.prevCharacter()
    if (prev) this.navigateToCharacter(prev.id)
  }

  // Character navigation: ArrowRight for next (E is handled by MenuComponent)
  @HostListener('window:keydown.arrowright')
  handleNextCharacter(): void {
    // Don't handle if a dialog is open
    if (this.showTradeDialog() || this.showDropDialog() ||
        this.showSpellBookDialog() || this.showSpellCastDialog() ||
        this.showPotionTargetDialog()) {
      return
    }
    const next = this.nextCharacter()
    if (next) this.navigateToCharacter(next.id)
  }
}
