/**
 * ChestOrchestrator - Coordinates async chest interaction flows
 *
 * Part of the Pure Services Architecture refactoring.
 * This orchestrator:
 * - Coordinates between MazeStateStore and pure services
 * - Handles async flows (trap effects, treasure distribution)
 * - Does NOT own any signals (state lives in MazeStateStore)
 * - Uses pure services for calculations (ChestService, TrapService)
 *
 * Replaces the async coordination logic from ChestFlowController.
 */

import { Injectable, inject } from '@angular/core'
import { Character } from '@models/Character'
import { Chest } from '@models/Chest'
import { CharacterStatus } from '@models/CharacterStatus'
import { TrapId } from '@models/Trap'
import { GameStateService } from '@services/GameStateService'
import { MazeStateStore, ChestSummary, DamageIndicator, PendingTrapInfo } from '@services/MazeStateStore'
import { ChestOrchestrationService } from '@services/ChestOrchestrationService'
import { ChestService } from '@services/ChestService'
import { TrapService } from '@services/TrapService'
import { TrapDataLoader } from '@services/TrapDataLoader'
import { RandomService } from '@services/RandomService'

@Injectable({
  providedIn: 'root'
})
export class ChestOrchestrator {
  private readonly stateStore = inject(MazeStateStore)
  private readonly gameState = inject(GameStateService)
  private readonly chestOrchestration = inject(ChestOrchestrationService)

  // ============================================================
  // CHEST INITIALIZATION
  // ============================================================

  /**
   * Initialize chest from combat victory (no letterbox)
   */
  initFromCombat(chest: Chest): void {
    this.stateStore.startChest(chest)
    this.stateStore.setChestPhase('action_select')
    this.stateStore.setChestLastMessage('Choose an action from a character card.')
  }

  /**
   * Initialize chest from exploration (with letterbox)
   */
  initFromExploration(chest: Chest): void {
    this.stateStore.startChest(chest)
    this.stateStore.setChestLetterbox('treasure')
    this.stateStore.setChestPhase('reveal')
    this.stateStore.setChestLastMessage('You found a treasure chest!')
  }

  // ============================================================
  // CHARACTER SELECTION
  // ============================================================

  /**
   * Select a character to handle the chest
   */
  selectOpener(character: Character): void {
    this.stateStore.selectChestOpener(character)
    this.stateStore.setChestPhase('action_select')
    this.stateStore.setChestLastMessage(`${character.name} will handle the chest.`)
  }

  /**
   * Select a caster for CALFO spell
   */
  selectCaster(caster: Character): void {
    this.stateStore.setChestCaster(caster)
    this.castCalfo(caster)
  }

  /**
   * Handle character selection by index (from UI)
   */
  onCharacterSelected(index: number): void {
    const party = this.getPartyCharacters()
    const available = this.getAvailableCharacters()
    if (index >= 0 && index < available.length) {
      this.selectOpener(available[index])
    }
  }

  /**
   * Handle caster selection by index (from UI)
   */
  onCasterSelected(index: number): void {
    const casters = this.getCalfoEligibleCasters()
    if (index >= 0 && index < casters.length) {
      this.selectCaster(casters[index])
    }
  }

  /**
   * Get inspect chance for a character
   */
  getInspectChance(character: Character): number {
    return this.chestOrchestration.calculateInspectChance(character)
  }

  /**
   * Get disarm chance for a character at a given maze level
   */
  getDisarmChance(character: Character, mazeLevel: number): number {
    return this.chestOrchestration.calculateDisarmChance(character, mazeLevel)
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  /**
   * Handle open action
   */
  handleOpen(): void {
    const chest = this.stateStore.pendingChest()
    const opener = this.stateStore.chestOpener()
    if (!chest || !opener) return

    // Pre-select recipient for inventory warning
    const party = this.getPartyCharacters()
    const recipient = ChestService.selectRecipient(party)
    this.stateStore.setPreSelectedRecipient(recipient)

    // Check inventory space
    if (recipient) {
      const warning = ChestService.checkInventorySpace(recipient, chest)
      if (warning) {
        this.stateStore.setChestInventoryWarning(warning.warning)
        this.stateStore.setChestPhase('inventory_warning')
        return
      }
    }

    this.openChest(false)
  }

  /**
   * Open the chest (optionally skipping inventory warning)
   */
  openChest(skipWarning: boolean): void {
    const chest = this.stateStore.pendingChest()
    const opener = this.stateStore.chestOpener()
    if (!chest || !opener) return

    this.stateStore.setChestInventoryWarning(null)

    // Check if trapped and not disarmed
    if (chest.trapped && !chest.trapDisarmed) {
      this.triggerTrap(chest, opener)
      return
    }

    // Safe to open - show opening animation then distribute treasure
    this.showOpening()
  }

  /**
   * Handle inspect action
   */
  handleInspect(): void {
    const chest = this.stateStore.pendingChest()
    const opener = this.stateStore.chestOpener()
    if (!chest || !opener || chest.trapIdentified) return

    const result = TrapService.attemptInspection(opener, chest)

    if (result.triggered) {
      this.stateStore.setChestLastMessage('You accidentally triggered the trap!')
      this.triggerTrap(chest, opener)
      return
    }

    if (result.success) {
      // Inspection successful - update chest state
      this.stateStore.setPendingChest({ ...chest, trapIdentified: true })

      if (chest.trapped && chest.trapId) {
        // Create scrambled state for trap identification puzzle
        const scrambledState = TrapService.createScrambledState(chest.trapId)
        // Perform initial inspection to reveal some letters
        const inspectedState = TrapService.performInspection(opener, scrambledState)
        this.stateStore.setScrambledTrapState(inspectedState)
        this.stateStore.setChestLastMessage('You detected a trap! Try to identify it...')
        this.stateStore.setChestPhase('trap_display')
      } else {
        this.stateStore.setChestLastMessage('No trap detected - the chest appears safe.')
        this.stateStore.setChestPhase('action_select')
      }
    } else {
      this.stateStore.setChestLastMessage(`${opener.name} didn't find anything suspicious.`)
      this.stateStore.setChestPhase('action_select')
    }
  }

  /**
   * Handle inspect more during trap display
   */
  handleInspectMore(): void {
    const scrambled = this.stateStore.scrambledTrapState()
    const opener = this.stateStore.chestOpener()
    if (!scrambled || !opener || scrambled.fullyRevealed) return

    const revealed = TrapService.performInspection(opener, scrambled)
    this.stateStore.setScrambledTrapState(revealed)

    if (revealed.fullyRevealed) {
      this.stateStore.setChestLastMessage(`Trap identified: ${revealed.trapName}`)
    } else {
      this.stateStore.setChestLastMessage(`${opener.name} inspects again...`)
    }
  }

  /**
   * Handle CALFO action - shows caster selection if multiple eligible
   */
  handleCalfo(): void {
    const casters = this.getCalfoEligibleCasters()
    if (casters.length === 0) return

    if (casters.length === 1) {
      this.castCalfo(casters[0])
    } else {
      this.stateStore.setChestPhase('caster_select')
      this.stateStore.setChestLastMessage('Select a caster for CALFO spell.')
    }
  }

  /**
   * Handle CALFO from trap display phase
   */
  handleCalfoFromTrapDisplay(): void {
    const casters = this.getCalfoEligibleCasters()
    if (casters.length === 0) {
      this.stateStore.setChestPhase('action_select')
      return
    }

    if (casters.length === 1) {
      this.castCalfo(casters[0])
    } else {
      this.stateStore.setChestPhase('caster_select')
      this.stateStore.setChestLastMessage('Select a caster for CALFO spell.')
    }
  }

  /**
   * Cast CALFO spell
   */
  private castCalfo(caster: Character): void {
    const chest = this.stateStore.pendingChest()
    if (!chest) return

    // Consume spell point first
    this.consumeCalfoSpellPoint(caster)

    const result = TrapService.castCalfo(caster, chest)

    if (result.success && result.trapIdentified && chest.trapped && chest.trapId) {
      // Create scrambled state and reveal all letters via CALFO
      const scrambledState = TrapService.createScrambledState(chest.trapId)
      const revealedState = TrapService.performCalfo(caster, scrambledState)
      this.stateStore.setScrambledTrapState(revealedState)
      this.stateStore.setPendingChest({ ...chest, trapIdentified: true })
      this.stateStore.setChestLastMessage(`${caster.name} casts CALFO! All letters revealed.`)
      this.stateStore.setChestPhase('trap_display')
    } else if (result.success && !chest.trapped) {
      this.stateStore.setPendingChest({ ...chest, trapIdentified: true })
      this.stateStore.setChestLastMessage('CALFO reveals the chest is not trapped.')
      this.stateStore.setChestPhase('action_select')
    } else {
      this.stateStore.setChestLastMessage('CALFO fails to reveal the trap type.')
      this.stateStore.setChestPhase('action_select')
    }

    this.stateStore.setChestCaster(null)
  }

  /**
   * Consume CALFO spell point from caster
   */
  private consumeCalfoSpellPoint(caster: Character): void {
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster)
      const char = newRoster.get(caster.id)
      if (char?.spellPoints?.priest?.level2) {
        const currentSP = char.spellPoints.priest.level2.current
        newRoster.set(caster.id, {
          ...char,
          spellPoints: {
            ...char.spellPoints,
            priest: {
              ...char.spellPoints.priest,
              level2: { ...char.spellPoints.priest.level2, current: Math.max(0, currentSP - 1) }
            }
          }
        })
      }
      return { ...state, roster: newRoster }
    })
  }

  /**
   * Handle disarm action - shows trap input phase
   */
  handleDisarm(): void {
    const chest = this.stateStore.pendingChest()
    const opener = this.stateStore.chestOpener()
    if (!chest || !opener || !chest.trapIdentified || chest.trapDisarmed) return

    this.stateStore.setChestPhase('trap_input')
    this.stateStore.setChestTrapInput('')
    this.stateStore.setChestLastMessage('Enter the trap name to disarm it.')
  }

  /**
   * Submit trap name for disarm attempt
   */
  submitTrapName(): void {
    const chest = this.stateStore.pendingChest()
    const opener = this.stateStore.chestOpener()
    const input = this.stateStore.chestTrapInput()
    if (!chest || !opener || !chest.trapId) return

    const result = TrapService.attemptDisarm(opener, chest, input)

    if (result.triggered) {
      this.stateStore.setChestLastMessage('Wrong! The trap triggers!')
      this.triggerTrap(chest, opener)
      return
    }

    if (result.success) {
      this.stateStore.setPendingChest({ ...chest, trapDisarmed: true, trapped: false })
      this.stateStore.setChestLastMessage(`${opener.name} successfully disarmed the trap!`)
      this.stateStore.setChestTrapInput('')
      this.stateStore.setScrambledTrapState(null)
      this.stateStore.setChestPhase('action_select')
      // Auto-open after brief delay to show success message
      setTimeout(() => {
        if (this.stateStore.chestPhase() === 'action_select' && this.stateStore.pendingChest()?.trapDisarmed) {
          this.openChest(false)
        }
      }, 800)
    } else {
      this.stateStore.setChestLastMessage('Disarm failed - try again or open anyway.')
      this.stateStore.setChestPhase('action_select')
    }
  }

  /**
   * Update trap input text
   */
  updateTrapInput(char: string): void {
    const current = this.stateStore.chestTrapInput()
    if (char === 'BACKSPACE') {
      this.stateStore.setChestTrapInput(current.slice(0, -1))
    } else if (char.length === 1 && /[A-Z]/.test(char)) {
      this.stateStore.setChestTrapInput(current + char)
    }
  }

  /**
   * Handle leave action
   */
  handleLeave(): void {
    this.closeOverlay()
  }

  /**
   * Handle cancel action
   */
  handleCancel(): void {
    const phase = this.stateStore.chestPhase()
    if (phase === 'trap_input') {
      this.stateStore.setChestPhase('action_select')
    } else if (phase === 'caster_select') {
      this.stateStore.setChestPhase('action_select')
    } else if (phase === 'trap_display') {
      this.stateStore.setChestPhase('action_select')
    }
  }

  /**
   * Handle continue action
   */
  handleContinue(): void {
    const phase = this.stateStore.chestPhase()
    if (phase === 'result') {
      this.closeOverlay()
    } else if (phase === 'inventory_warning') {
      this.openChest(true)
    }
  }

  // ============================================================
  // OPENING ANIMATION
  // ============================================================

  /**
   * Show opening animation and distribute treasure
   */
  private async showOpening(): Promise<void> {
    this.stateStore.setChestPhase('opening')
    this.stateStore.setChestSprite('open')

    await this.delay(600)

    this.distributeTreasure()
  }

  // ============================================================
  // TRAP HANDLING
  // ============================================================

  /**
   * Trigger trap with damage/status effects
   */
  private async triggerTrap(chest: Chest, opener: Character): Promise<void> {
    if (!chest.trapId) return

    const party = this.getPartyCharacters()
    const result = TrapService.applyTrapEffects(chest.trapId, opener, party)

    // Show dramatic trap triggered letterbox
    this.stateStore.setChestPhase('trap_triggered')
    this.stateStore.setTrapLetterboxName(result.trapName)
    this.stateStore.setChestLetterbox('trap_triggered')

    await this.delay(1500)

    this.stateStore.clearChestLetterbox()

    // Handle special effects
    if (result.specialEffect === 'teleport') {
      this.applyTrapDamage(result)
      this.handleTeleport()
      return
    }

    if (result.specialEffect === 'combat') {
      this.applyTrapDamage(result)
      this.handleAlarm()
      return
    }

    // Build affected character list
    const damagedIds = Array.from(result.damageDealt.keys())
    const statusIds = Array.from(result.statusApplied.keys())
    const affectedCharIds = [...new Set([...damagedIds, ...statusIds])]

    this.stateStore.setHitCharacterIds(affectedCharIds)

    // Store trap info for summary
    const pendingTrapInfo: PendingTrapInfo = {
      trapTriggered: true,
      trapId: chest.trapId,
      trapMessage: result.message,
      damageDealt: result.damageDealt,
      statusEffects: result.statusApplied
    }
    this.stateStore.setPendingTrapInfo(pendingTrapInfo)

    // Show damage indicators sequentially
    for (const charId of affectedCharIds) {
      const damage = result.damageDealt.get(charId) ?? 0
      const status = result.statusApplied.get(charId)

      const indicator: DamageIndicator = {
        characterId: charId,
        damage,
        status: status ? this.formatStatus(status) : undefined
      }
      this.stateStore.setCurrentDamageIndicator(indicator)

      await this.delay(800)
    }

    this.stateStore.clearCurrentDamageIndicator()
    this.stateStore.setHitCharacterIds([])

    // Apply damage to game state
    this.applyTrapDamage(result)

    // Continue to open chest
    this.stateStore.setPendingChest({ ...chest, trapDisarmed: true })
    this.stateStore.setChestLastMessage(result.message)
    this.showOpening()
  }

  /**
   * Apply trap damage to game state
   */
  private applyTrapDamage(result: ReturnType<typeof TrapService.applyTrapEffects>): void {
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster)

      for (const [charId, damage] of result.damageDealt) {
        const char = newRoster.get(charId)
        if (char) {
          const newHp = Math.max(0, char.hp - damage)
          const newStatus = result.statusApplied.get(charId) ?? char.status
          newRoster.set(charId, {
            ...char,
            hp: newHp,
            status: newHp === 0 ? CharacterStatus.DEAD : newStatus
          })
        }
      }

      // Apply status effects without damage
      for (const [charId, status] of result.statusApplied) {
        if (!result.damageDealt.has(charId)) {
          const char = newRoster.get(charId)
          if (char) {
            newRoster.set(charId, { ...char, status })
          }
        }
      }

      return { ...state, roster: newRoster }
    })
  }

  /**
   * Handle teleport trap effect
   */
  private handleTeleport(): void {
    const maxCoord = 19
    const newX = RandomService.random(0, maxCoord)
    const newY = RandomService.random(0, maxCoord)
    const facings: Array<'NORTH' | 'SOUTH' | 'EAST' | 'WEST'> = ['NORTH', 'SOUTH', 'EAST', 'WEST']
    const newFacing = RandomService.pickRandom(facings)

    this.gameState.updateState(state => ({
      ...state,
      dungeon: state.dungeon ? {
        ...state.dungeon,
        position: { x: newX, y: newY, facing: newFacing }
      } : undefined,
      pendingChest: undefined
    }))

    this.stateStore.addMessage(`Teleported to (${newX}, ${newY})!`)
    this.closeOverlay()
    // Signal MazeComponent to re-render (it watches this signal)
    this.stateStore.requestRender()
  }

  /**
   * Handle alarm trap effect
   */
  private handleAlarm(): void {
    this.gameState.updateState(state => ({
      ...state,
      pendingChest: undefined
    }))

    const currentMessage = this.stateStore.chestLastMessage()
    this.stateStore.setChestLastMessage(currentMessage + ' Monsters approach!')
    this.closeOverlay()

    this.stateStore.addMessage('An alarm sounds! Monsters rush to attack!')

    // Signal MazeComponent to initiate encounter (it watches this signal)
    const level = this.getCurrentLevel()
    this.stateStore.requestAlarmEncounter(level, false)
  }

  // ============================================================
  // TREASURE DISTRIBUTION
  // ============================================================

  /**
   * Distribute treasure from chest to party
   */
  private distributeTreasure(): void {
    const chest = this.stateStore.pendingChest()
    const opener = this.stateStore.chestOpener()
    if (!chest || !opener) return

    const party = this.getPartyCharacters()
    const preSelected = this.stateStore.preSelectedRecipient()
    const result = ChestService.distributeTreasure(chest, party, preSelected ?? undefined)

    this.stateStore.setPreSelectedRecipient(null)

    // Update game state
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster)

      if (result.recipientId && result.itemsReceived.length > 0) {
        const recipient = newRoster.get(result.recipientId)
        if (recipient) {
          newRoster.set(result.recipientId, {
            ...recipient,
            inventory: [...recipient.inventory, ...result.itemsReceived]
          })
        }
      }

      return {
        ...state,
        roster: newRoster,
        party: {
          ...state.party,
          gold: state.party.gold + result.goldAdded
        }
      }
    })

    // Build summary
    const trapInfo = this.stateStore.pendingTrapInfo()
    const summary: ChestSummary = {
      goldObtained: result.goldAdded,
      itemsObtained: result.itemsReceived,
      itemsLost: result.itemsLost,
      recipientName: result.recipientName,
      trapTriggered: trapInfo?.trapTriggered ?? false,
      trapName: trapInfo?.trapId ? TrapDataLoader.getTrapDisplayName(trapInfo.trapId) : null,
      damageDealt: trapInfo?.damageDealt ?? new Map(),
      statusEffects: trapInfo?.statusEffects ?? new Map()
    }
    this.stateStore.setChestSummary(summary)

    this.stateStore.setPendingTrapInfo(null)
    this.stateStore.setChestLastMessage(ChestService.getDistributionMessage(result))
    this.stateStore.setChestPhase('result')
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  /**
   * Close chest overlay and reset state
   */
  closeOverlay(): void {
    this.stateStore.closeChest()
  }

  /**
   * Reset all state (e.g., when leaving maze)
   */
  reset(): void {
    this.closeOverlay()
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Get party characters from game state
   */
  private getPartyCharacters(): Character[] {
    const state = this.gameState.state()
    return state.party.members
      .map(id => state.roster.get(id))
      .filter((c): c is Character => !!c)
  }

  /**
   * Get available characters for chest handling
   */
  getAvailableCharacters(): Character[] {
    return this.chestOrchestration.getAvailableCharacters(this.getPartyCharacters())
  }

  /**
   * Get CALFO-eligible casters
   */
  getCalfoEligibleCasters(): Character[] {
    return this.chestOrchestration.getCalfoEligibleCasters(this.getPartyCharacters())
  }

  /**
   * Get recommended handler for chest
   */
  getRecommendedHandler() {
    const chest = this.stateStore.pendingChest()
    if (!chest) return null
    return this.chestOrchestration.getRecommendedHandler(
      this.getPartyCharacters(),
      chest.mazeLevel
    )
  }

  /**
   * Get current dungeon level
   */
  private getCurrentLevel(): number {
    const state = this.gameState.state()
    return state.dungeon?.level ?? 1
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Format status for display
   */
  private formatStatus(status: CharacterStatus): string {
    const statusMap: Record<CharacterStatus, string> = {
      [CharacterStatus.OK]: 'OK',
      [CharacterStatus.POISONED]: 'Poisoned',
      [CharacterStatus.PARALYZED]: 'Paralyzed',
      [CharacterStatus.STONED]: 'Petrified',
      [CharacterStatus.DEAD]: 'Dead',
      [CharacterStatus.ASHES]: 'Ashes',
      [CharacterStatus.LOST]: 'Lost',
      [CharacterStatus.INJURED]: 'Injured',
      [CharacterStatus.ASLEEP]: 'Asleep'
    }
    return statusMap[status] ?? String(status)
  }

  // ============================================================
  // KEYBOARD HANDLING
  // ============================================================

  /**
   * Handle keyboard input for chest overlay
   * Returns whether the event should be prevented (for BACKSPACE/ENTER handling)
   */
  handleKeyboard(key: string): { preventDefault: boolean; stopPropagation: boolean } {
    const phase = this.stateStore.chestPhase()
    const result = { preventDefault: false, stopPropagation: false }

    // ESC to cancel/leave
    if (key === 'ESCAPE') {
      this.handleCancel()
      return result
    }

    // ENTER for continue
    if (key === 'ENTER' && (phase === 'trap_display' || phase === 'result')) {
      this.handleContinue()
      return result
    }

    // Caster select mode
    if (phase === 'caster_select') {
      const num = parseInt(key)
      const casters = this.getCalfoEligibleCasters()
      if (num >= 1 && num <= casters.length) {
        this.selectCaster(casters[num - 1])
      }
      return result
    }

    // Trap name input mode
    if (phase === 'trap_input') {
      if (key === 'BACKSPACE') {
        this.updateTrapInput('BACKSPACE')
        result.preventDefault = true
        return result
      } else if (key.length === 1 && /[A-Z]/.test(key)) {
        this.updateTrapInput(key)
        result.preventDefault = true
        return result
      }
      if (key === 'ENTER') {
        result.preventDefault = true
        result.stopPropagation = true
        this.submitTrapName()
        return result
      }
    }

    // Inventory warning mode
    if (phase === 'inventory_warning') {
      if (key === 'Y') {
        this.openChest(true)
      } else if (key === 'N') {
        this.stateStore.setChestPhase('action_select')
        this.stateStore.setChestInventoryWarning(null)
      }
      return result
    }

    // Trap display mode
    if (phase === 'trap_display') {
      if (key === 'I') {
        this.handleInspectMore()
      } else if (key === 'C') {
        this.handleCalfoFromTrapDisplay()
      }
      return result
    }

    // Action select mode
    if (phase === 'action_select') {
      switch (key) {
        case 'O': this.handleOpen(); break
        case 'I': this.handleInspect(); break
        case 'C': this.handleCalfo(); break
        case 'D': this.handleDisarm(); break
        case 'L': this.handleLeave(); break
      }
    }

    return result
  }

  // ============================================================
  // FOOTER MENU ITEMS
  // ============================================================

  /**
   * Get full footer menu items for chest overlay
   */
  getChestFooterMenuItems(): Array<{ id: string; label: string; shortcut: string; enabled: boolean }> {
    const chest = this.stateStore.pendingChest()
    const phase = this.stateStore.chestPhase()
    const opener = this.stateStore.chestOpener()
    const calfoEligible = this.getCalfoEligibleCasters()

    if (phase === 'idle' || phase === 'reveal' || phase === 'opening') {
      return []
    }

    if (phase === 'caster_select') {
      return [{ id: 'cancel', label: 'Cancel', shortcut: 'ESC', enabled: true }]
    }

    if (phase === 'trap_display') {
      const canInspectMore = !this.stateStore.scrambledTrapState()?.fullyRevealed
      const items: Array<{ id: string; label: string; shortcut: string; enabled: boolean }> = [
        { id: 'continue', label: 'Done', shortcut: 'ENTER', enabled: true }
      ]
      if (canInspectMore) {
        items.unshift({ id: 'inspect-more', label: 'Inspect Again', shortcut: 'I', enabled: true })
      }
      if (calfoEligible.length > 0 && !this.stateStore.scrambledTrapState()?.fullyRevealed) {
        items.splice(1, 0, { id: 'calfo', label: 'CALFO', shortcut: 'C', enabled: true })
      }
      return items
    }

    if (phase === 'trap_input') {
      return [
        { id: 'submit-disarm', label: 'Disarm', shortcut: 'ENTER', enabled: true },
        { id: 'cancel', label: 'Cancel', shortcut: 'ESC', enabled: true }
      ]
    }

    if (phase === 'inventory_warning') {
      return [
        { id: 'confirm-open', label: 'Open Anyway', shortcut: 'Y', enabled: true },
        { id: 'cancel', label: 'Cancel', shortcut: 'N', enabled: true }
      ]
    }

    if (phase === 'result') {
      return [{ id: 'continue', label: 'Return to Maze', shortcut: 'ENTER', enabled: true }]
    }

    // action_select mode
    if (!chest || !opener) {
      return [{ id: 'leave', label: 'Leave', shortcut: 'L', enabled: true }]
    }

    const items: Array<{ id: string; label: string; shortcut: string; enabled: boolean }> = []
    items.push({ id: 'open', label: 'Open', shortcut: 'O', enabled: true })

    if (!chest.trapIdentified) {
      items.push({ id: 'inspect', label: 'Inspect', shortcut: 'I', enabled: true })
    }

    if (!chest.trapIdentified && calfoEligible.length > 0) {
      items.push({ id: 'calfo', label: 'CALFO', shortcut: 'C', enabled: true })
    }

    if (chest.trapIdentified && chest.trapped && !chest.trapDisarmed) {
      items.push({ id: 'disarm', label: 'Disarm', shortcut: 'D', enabled: true })
    }

    items.push({ id: 'leave', label: 'Leave', shortcut: 'L', enabled: true })
    return items
  }

  /**
   * Get simple leave button menu for chest overlay footer
   */
  getChestLeaveMenuItem(): Array<{ id: string; label: string; shortcut: string; enabled: boolean }> {
    const phase = this.stateStore.chestPhase()

    if (phase === 'trap_input') {
      return [
        { id: 'submit-disarm', label: 'Disarm', shortcut: 'ENTER', enabled: true },
        { id: 'cancel', label: 'Cancel', shortcut: 'ESC', enabled: true }
      ]
    }

    if (phase === 'inventory_warning') {
      return [
        { id: 'confirm-open', label: 'Open Anyway', shortcut: 'Y', enabled: true },
        { id: 'cancel', label: 'Cancel', shortcut: 'N', enabled: true }
      ]
    }

    if (phase === 'result') {
      return [{ id: 'continue', label: 'Return to Maze', shortcut: 'ENTER', enabled: true }]
    }

    if (phase === 'trap_display') {
      return [
        { id: 'continue', label: 'Done', shortcut: 'ENTER', enabled: true },
        { id: 'leave', label: 'Leave', shortcut: 'L', enabled: true }
      ]
    }

    // Default: just Leave button (actions are on character cards)
    return [{ id: 'leave', label: 'Leave', shortcut: 'L', enabled: true }]
  }
}
