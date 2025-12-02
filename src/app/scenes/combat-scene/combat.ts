// src/app/scenes/combat/combat.ts
import { Component, computed, signal, OnInit, OnDestroy, ViewChild, ElementRef, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '@services/GameStateService'
import { CombatService } from '@services/CombatService'
import { RandomService } from '@services/RandomService'
import { SpellCastingService } from '@services/SpellCastingService'
import { VictoryService, VictoryRewards } from '@services/VictoryService'
import { ChestService } from '@services/ChestService'
import { SceneType } from '@models/SceneType'
import { RewardTier } from '@models/Chest'
import { CombatState, CombatCommand, Combatant, CombatActionType, MonsterGroup, MonsterInstance, CombatRoundEvent, CombatRoundResult, CharacterUpdate } from '@models/Combat'
import { Character } from '@models/Character'
import { MenuItem } from '@shared/components/menu/menu.component'
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component'
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component'
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component'
import { MonsterGroupListItemComponent } from '@shared/components/monster-group-list-item/monster-group-list-item.component'
import { MonsterGroupSelectionDialogComponent, MonsterGroupOption } from '@shared/components/monster-group-selection-dialog/monster-group-selection-dialog.component'
import { CharacterSelectionDialogComponent, CharacterOption } from '@shared/components/character-selection-dialog/character-selection-dialog.component'
import { SpellPanelComponent } from '@shared/components/spell-panel/spell-panel.component'
import { getGroupDisplayText } from '@utils/MonsterNameUtils'
import { CharacterStatus } from '@models/CharacterStatus'
import { getCombatMessageDelay, getActionResultDelay, isCombatAuditEnabled, setCombatAuditEnabled } from '@config/CombatSettings'

interface SelectedAction {
  characterId: string
  command: CombatCommand
}

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MonsterGroupListItemComponent,
    MonsterGroupSelectionDialogComponent,
    CharacterSelectionDialogComponent,
    SpellPanelComponent
  ],
  templateUrl: './combat.html',
  styleUrls: ['./combat.scss']
})
export class CombatComponent implements OnInit, OnDestroy {
  // ViewChild for auto-scrolling combat log
  @ViewChild('logMessages') private logMessagesRef!: ElementRef<HTMLDivElement>

  // Expose Array for template use
  readonly Array = Array

  // Computed from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly party = computed(() => this.gameState.state().party)
  readonly roster = computed(() => this.gameState.state().roster)

  // Local UI state
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())
  readonly isExecutingRound = signal<boolean>(false)
  readonly isAnimatingMessages = signal<boolean>(false)
  readonly animatingMessages = signal<string[]>([])  // Messages currently being animated
  readonly displayedAnimatingMessages = signal<string[]>([])  // Messages shown so far in animation
  private messageAnimationTimer: ReturnType<typeof setTimeout> | null = null

  // Event-based animation state
  // These signals hold display state during animation, separate from game state
  // This allows visual updates to sync with message display
  readonly displayMonsterGroups = signal<MonsterGroup[] | null>(null)  // null = use game state
  readonly displayCharacterOverrides = signal<Map<string, CharacterUpdate>>(new Map())  // character ID -> override
  private pendingEvents: CombatRoundEvent[] = []
  private currentEventIndex = 0
  private pendingRoundResult: CombatRoundResult | null = null
  readonly showVictoryModal = signal<boolean>(false)
  readonly victoryRewards = signal<VictoryRewards | null>(null)
  readonly itemDistribution = signal<Map<string, string[]>>(new Map()) // characterId -> itemIds[]
  readonly showDefeatModal = signal<boolean>(false)
  readonly deathLocation = signal<{ level: number; x: number; y: number } | null>(null)
  readonly activeCharacterIndex = signal<number>(0)
  readonly selectedActionType = signal<CombatActionType | null>(null)
  readonly selectedSpellId = signal<string | null>(null)
  readonly showSpellMenu = signal<boolean>(false)
  readonly showGroupSelectionDialog = signal<boolean>(false)
  readonly selectedGroupId = signal<'A' | 'B' | 'C' | 'D' | null>(null)
  readonly showCharacterSelectionDialog = signal<boolean>(false)
  readonly selectedTargetCharacterId = signal<string | null>(null)
  readonly isSurpriseRound = signal<boolean>(false)

  // Computed party characters - applies display overrides during animation for sync with messages
  readonly partyCharacters = computed(() => {
    const members = this.party().members
    const roster = this.roster()
    const overrides = this.displayCharacterOverrides()

    return members
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
      .map(char => {
        // Apply display overrides during animation
        const override = overrides.get(char.id)
        if (override) {
          return {
            ...char,
            ...(override.hp !== undefined && { hp: override.hp }),
            ...(override.status !== undefined && { status: override.status as CharacterStatus })
          }
        }
        return char
      })
  })

  // Front row party characters (for formation layout) - applies display overrides during animation
  readonly frontRowCharacters = computed(() => {
    const frontRowIds = this.party().formation.frontRow
    const roster = this.roster()
    const overrides = this.displayCharacterOverrides()
    return frontRowIds
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
      .map(char => {
        const override = overrides.get(char.id)
        if (override) {
          return {
            ...char,
            ...(override.hp !== undefined && { hp: override.hp }),
            ...(override.status !== undefined && { status: override.status as CharacterStatus })
          }
        }
        return char
      })
  })

  // Back row party characters (for formation layout) - applies display overrides during animation
  readonly backRowCharacters = computed(() => {
    const backRowIds = this.party().formation.backRow
    const roster = this.roster()
    const overrides = this.displayCharacterOverrides()
    return backRowIds
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
      .map(char => {
        const override = overrides.get(char.id)
        if (override) {
          return {
            ...char,
            ...(override.hp !== undefined && { hp: override.hp }),
            ...(override.status !== undefined && { status: override.status as CharacterStatus })
          }
        }
        return char
      })
  })

  // Front row monster groups
  readonly frontRowMonsterGroups = computed(() => {
    return this.monsterGroups().filter(g => g.formation === 'front')
  })

  // Back row monster groups
  readonly backRowMonsterGroups = computed(() => {
    return this.monsterGroups().filter(g => g.formation === 'back')
  })

  // Get all monsters from all groups (flattened)
  readonly monsters = computed(() => {
    const combat = this.combatState()
    if (!combat) return []
    return CombatService.getAllMonsters(combat)
  })

  // Get monster groups - uses display state during animation for sync with messages
  readonly monsterGroups = computed(() => {
    // During animation, use display state if available
    const displayGroups = this.displayMonsterGroups()
    if (displayGroups !== null) {
      return displayGroups
    }
    // Otherwise use game state
    const combat = this.combatState()
    return combat?.monsterGroups || []
  })

  // Determine if we're in group targeting mode
  readonly isGroupTargetMode = computed(() => {
    const action = this.selectedActionType()
    if (!action) return false

    // Group targeting for DISPEL command
    if (action === 'DISPEL') return true

    // Group targeting for group-target spells
    if (action === 'CAST_SPELL') {
      const spellId = this.selectedSpellId()
      if (!spellId) return false

      const spell = SpellCastingService.getSpell(spellId)
      return spell?.target === 'group'
    }

    return false
  })

  // Determine if we're in monster (single-target) mode
  // Only for offensive spells targeting enemies, not healing spells targeting party
  readonly isMonsterTargetMode = computed(() => {
    const action = this.selectedActionType()
    if (!action) return false

    // Single monster targeting for ATTACK
    if (action === 'ATTACK') return true

    // Single monster targeting for offensive single-target spells
    if (action === 'CAST_SPELL') {
      const spellId = this.selectedSpellId()
      if (!spellId) return false

      const spell = SpellCastingService.getSpell(spellId)
      // Only offensive spells target monsters; healing spells target party
      return spell?.target === 'single' && spell?.category === 'offensive'
    }

    return false
  })

  // Determine if we're in character (party member) targeting mode
  // For healing spells, buff spells targeting single allies
  readonly isCharacterTargetMode = computed(() => {
    const action = this.selectedActionType()
    if (!action) return false

    if (action === 'CAST_SPELL') {
      const spellId = this.selectedSpellId()
      if (!spellId) return false

      const spell = SpellCastingService.getSpell(spellId)
      if (!spell) return false

      // Healing and buff spells with single target go to party members
      if (spell.target === 'single' && (spell.category === 'healing' || spell.category === 'buff')) {
        return true
      }

      // Resurrection spells target dead party members
      if (spell.target === 'dead_body' || spell.target === 'ashes') {
        return true
      }
    }

    return false
  })

  // Combine committed combat log with currently animating messages
  // Sequential order (oldest first) with auto-scroll to show newest
  readonly combatLog = computed(() => {
    const combat = this.combatState()
    const committedLog = combat?.combatLog || []
    const animating = this.displayedAnimatingMessages()
    return [...committedLog, ...animating]
  })

  readonly roundNumber = computed(() => {
    const combat = this.combatState()
    return combat?.roundNumber || 1
  })

  readonly allActionsSelected = computed(() => {
    const chars = this.partyCharacters()
    const actions = this.selectedActions()

    // All alive characters must have selected an action
    return chars
      .filter(c => c.hp > 0)
      .every(c => actions.has(c.id))
  })

  // Selected action texts for character cards (shows what action each character will take)
  readonly selectedActionTexts = computed((): Map<string, string> => {
    const actions = this.selectedActions()
    const textMap = new Map<string, string>()

    for (const [charId, command] of actions.entries()) {
      const actionText = this.getActionDisplayText(command)
      textMap.set(charId, actionText)
    }

    return textMap
  })

  // Get alive party members (for action selection)
  readonly alivePartyMembers = computed(() => {
    return this.partyCharacters().filter(c => c.hp > 0)
  })

  // Current active character (the one selecting an action)
  readonly activeCharacter = computed(() => {
    const aliveMembers = this.alivePartyMembers()
    const index = this.activeCharacterIndex()
    return aliveMembers[index] || null
  })

  // Active character ID (null-safe for template usage)
  readonly activeCharacterId = computed(() => this.activeCharacter()?.id ?? null)

  // Available spells for active character
  readonly availableSpells = computed(() => {
    const char = this.activeCharacter()
    if (!char) return []

    return SpellCastingService.getAvailableSpells(char)
  })

  // Spell points by level for active character
  readonly spellPointsByLevel = computed(() => {
    const char = this.activeCharacter()
    if (!char || !char.spellPoints) return new Map<string, { current: number; max: number }>()

    const pointsMap = new Map<string, { current: number; max: number }>()

    // Collect mage spell points
    if (char.spellPoints.mage) {
      for (let level = 1; level <= 7; level++) {
        const key = `level${level}` as keyof typeof char.spellPoints.mage
        const points = char.spellPoints.mage[key]
        if (points) {
          pointsMap.set(`mage-${level}`, { current: points.current, max: points.max })
        }
      }
    }

    // Collect priest spell points
    if (char.spellPoints.priest) {
      for (let level = 1; level <= 7; level++) {
        const key = `level${level}` as keyof typeof char.spellPoints.priest
        const points = char.spellPoints.priest[key]
        if (points) {
          pointsMap.set(`priest-${level}`, { current: points.current, max: points.max })
        }
      }
    }

    return pointsMap
  })

  // Action menu items for current active character
  readonly actionMenuItems = computed((): MenuItem[] => {
    const char = this.activeCharacter()
    if (!char) return []

    const combat = this.combatState()
    const hasSpells = this.availableSpells().length > 0
    // Disable all actions while round is executing
    const isExecuting = this.isExecutingRound()

    return [
      { id: 'attack', label: 'Attack', shortcut: 'A', enabled: !isExecuting },
      { id: 'cast', label: 'Cast Spell', shortcut: 'C', enabled: hasSpells && !isExecuting },
      { id: 'parry', label: 'Parry', shortcut: 'P', enabled: !isExecuting },
      { id: 'flee', label: 'Flee', shortcut: 'F', enabled: (combat?.canFlee ?? false) && !isExecuting }
    ]
  })

  // Round execution menu
  readonly roundMenuItems = computed((): MenuItem[] => [
    {
      id: 'execute',
      label: `Execute Round ${this.roundNumber()}`,
      shortcut: 'ENTER',
      enabled: this.allActionsSelected() && !this.isExecutingRound()
    }
  ])

  // Victory modal menu
  readonly victoryMenuItems = computed((): MenuItem[] => [
    { id: 'return', label: 'Return to Maze', shortcut: 'ENTER', enabled: true }
  ])

  // Defeat modal menu
  readonly defeatMenuItems = computed((): MenuItem[] => [
    { id: 'castle', label: 'Return to Castle', shortcut: 'ENTER', enabled: true }
  ])

  // Group selection options (only alive groups)
  readonly groupSelectionOptions = computed((): MonsterGroupOption[] => {
    return this.monsterGroups()
      .filter(group => this.hasAliveMonsters(group))
      .map(group => ({
        id: group.id,
        displayName: this.getGroupDisplayName(group),
        enabled: true
      }))
  })

  // Dialog prompt based on action type
  readonly groupSelectionPrompt = computed((): string => {
    const actionType = this.selectedActionType()
    const spellId = this.selectedSpellId()

    if (actionType === 'ATTACK') {
      return 'SELECT TARGET GROUP'
    }

    if (actionType === 'CAST_SPELL' && spellId) {
      const spell = SpellCastingService.getSpell(spellId)
      if (spell) {
        return `${spell.name.toUpperCase()} - SELECT TARGET`
      }
    }

    return 'SELECT TARGET GROUP'
  })

  // Character selection options for healing/buff spells
  readonly characterSelectionOptions = computed((): CharacterOption[] => {
    const spellId = this.selectedSpellId()
    if (!spellId) return []

    const spell = SpellCastingService.getSpell(spellId)
    if (!spell) return []

    const chars = this.partyCharacters()

    // Filter based on spell target type
    return chars.map((char, idx) => {
      let enabled = true

      if (spell.target === 'dead_body') {
        // Only dead characters can be targeted
        enabled = char.status === CharacterStatus.DEAD
      } else if (spell.target === 'ashes') {
        // Only ashes characters can be targeted
        enabled = char.status === CharacterStatus.ASHES
      } else if (spell.target === 'single') {
        // For healing spells, target living characters (or characters that need healing)
        if (spell.category === 'healing') {
          // Allow targeting any living character (they might want to pre-heal)
          enabled = char.hp > 0
        } else {
          // For buff spells, target living characters
          enabled = char.hp > 0
        }
      }

      return {
        character: char,
        index: idx + 1, // 1-based for keyboard shortcuts
        enabled
      }
    })
  })

  // Character selection dialog prompt
  readonly characterSelectionPrompt = computed((): string => {
    const spellId = this.selectedSpellId()
    if (!spellId) return 'SELECT TARGET'

    const spell = SpellCastingService.getSpell(spellId)
    if (spell) {
      return `${spell.name.toUpperCase()} - SELECT TARGET`
    }

    return 'SELECT TARGET'
  })

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {
    // Auto-scroll combat log to bottom when new messages are added
    effect(() => {
      // Access the combatLog to track changes
      this.combatLog()
      // Schedule scroll after Angular renders the new messages
      queueMicrotask(() => this.scrollLogToBottom())
    })
  }

  /**
   * Scroll the combat log container to the bottom to show newest messages
   */
  private scrollLogToBottom(): void {
    const el = this.logMessagesRef?.nativeElement
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }

  ngOnInit(): void {
    console.log('[Combat] Initializing combat scene')
    const state = this.gameState.state()
    console.log('[Combat] Party members:', state.party.members)
    console.log('[Combat] Monster groups:', state.combat?.monsterGroups.length || 0)

    // Expose audit setter for debugging from browser console
    const win = window as unknown as { setCombatAuditEnabled: typeof setCombatAuditEnabled }
    win.setCombatAuditEnabled = setCombatAuditEnabled
    console.log('[Combat] To enable action audit: setCombatAuditEnabled(true)')

    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.COMBAT
    }))

    // Check for surprise after component initialization
    queueMicrotask(() => {
      const combat = this.combatState()
      if (combat?.surpriseState === 'party' && combat.roundNumber === 1) {
        console.log('[Combat] Party is surprised! Auto-executing monster round.')
        this.handlePartySurprise()
      } else if (combat?.surpriseState === 'monsters' && combat.roundNumber === 1) {
        console.log('[Combat] Monsters are surprised! Party gets free round.')
        this.addCombatMessage('You surprised the monsters!')
      }
    })
  }

  ngOnDestroy(): void {
    // Clean up any pending animation timer
    if (this.messageAnimationTimer) {
      clearTimeout(this.messageAnimationTimer)
      this.messageAnimationTimer = null
    }
  }

  /**
   * Start animating combat messages one at a time with delays
   * Messages are displayed with different delays based on type:
   * - Action messages use messageDelayMs (longer delay between different actions)
   * - Result messages (prefixed with →) use actionResultDelayMs (shorter delay for suspense)
   *
   * @param messages Array of messages to display
   * @param onComplete Callback when all messages are displayed
   */
  private startMessageAnimation(messages: string[], onComplete: () => void): void {
    const actionDelay = getCombatMessageDelay()
    const resultDelay = getActionResultDelay()

    // If both delays are 0, show all messages immediately
    if (actionDelay === 0 && resultDelay === 0) {
      // Strip result markers for display
      const displayMessages = messages.map(msg => CombatService.stripResultMarker(msg))
      this.animatingMessages.set(messages)  // Keep original for commitAnimatedMessages()
      this.displayedAnimatingMessages.set(displayMessages)
      onComplete()
      return
    }

    this.animatingMessages.set(messages)
    this.displayedAnimatingMessages.set([])
    this.isAnimatingMessages.set(true)

    let currentIndex = 0

    const showNextMessage = () => {
      if (currentIndex >= messages.length) {
        // All messages shown
        this.isAnimatingMessages.set(false)
        this.messageAnimationTimer = null
        onComplete()
        return
      }

      const message = messages[currentIndex]

      // Strip result marker for display
      const displayMessage = CombatService.stripResultMarker(message)

      // Add message to displayed
      this.displayedAnimatingMessages.update(displayed => [...displayed, displayMessage])
      currentIndex++

      // Determine delay for NEXT message (if any)
      if (currentIndex < messages.length) {
        const nextMessage = messages[currentIndex]
        const nextIsResult = CombatService.isResultMessage(nextMessage)
        // Use result delay if next message is a result, otherwise use action delay
        const delay = nextIsResult ? resultDelay : actionDelay
        this.messageAnimationTimer = setTimeout(showNextMessage, delay)
      } else {
        // All messages shown
        this.isAnimatingMessages.set(false)
        this.messageAnimationTimer = null
        onComplete()
      }
    }

    // Show first message immediately
    showNextMessage()
  }

  /**
   * Start event-based animation for combat rounds.
   * Processes events in sequence, displaying messages and applying state changes
   * IN SYNC with the result messages (→ prefixed) for real-time visual feedback.
   *
   * This ensures that when "→ Fighter takes 10 damage!" is displayed, the HP bar
   * updates immediately rather than waiting until all messages are shown.
   */
  private startEventAnimation(): void {
    const actionDelay = getCombatMessageDelay()
    const resultDelay = getActionResultDelay()

    // Collect all messages from all events for display
    const allMessages: string[] = []
    for (const event of this.pendingEvents) {
      allMessages.push(...event.messages)
    }

    // If no delays, apply all state at once and show all messages
    if (actionDelay === 0 && resultDelay === 0) {
      // Apply final state immediately
      this.applyAllEventStates()
      // Display all messages
      const displayMessages = allMessages.map(msg => CombatService.stripResultMarker(msg))
      this.animatingMessages.set(allMessages)
      this.displayedAnimatingMessages.set(displayMessages)
      this.onRoundAnimationComplete()
      return
    }

    this.animatingMessages.set(allMessages)
    this.displayedAnimatingMessages.set([])
    this.isAnimatingMessages.set(true)
    this.currentEventIndex = 0

    // Track message index within current event
    let eventMessageIndex = 0
    // Track whether we've applied state for the current event
    // (state is applied when first result message is shown)
    let stateAppliedForCurrentEvent = false

    // Helper to finalize current event and move to next
    const moveToNextEvent = () => {
      // Ensure state is applied even if there were no result messages
      if (!stateAppliedForCurrentEvent) {
        const currentEvent = this.pendingEvents[this.currentEventIndex]
        this.applyEventState(currentEvent)
      }

      // Move to next event
      this.currentEventIndex++
      eventMessageIndex = 0
      stateAppliedForCurrentEvent = false

      // If more events, continue after action delay
      if (this.currentEventIndex < this.pendingEvents.length) {
        this.messageAnimationTimer = setTimeout(processNextMessage, actionDelay)
      } else {
        // All events done
        this.isAnimatingMessages.set(false)
        this.messageAnimationTimer = null
        this.onRoundAnimationComplete()
      }
    }

    const processNextMessage = () => {
      // Check if all events processed
      if (this.currentEventIndex >= this.pendingEvents.length) {
        this.isAnimatingMessages.set(false)
        this.messageAnimationTimer = null
        this.onRoundAnimationComplete()
        return
      }

      const currentEvent = this.pendingEvents[this.currentEventIndex]

      // Check if all messages in current event are shown
      if (eventMessageIndex >= currentEvent.messages.length) {
        moveToNextEvent()
        return
      }

      // Show next message in current event
      const message = currentEvent.messages[eventMessageIndex]
      const isResultMessage = CombatService.isResultMessage(message)
      const displayMessage = CombatService.stripResultMarker(message)

      // Apply state changes when showing the FIRST result message
      // This provides real-time feedback - HP bar updates when damage message appears
      if (isResultMessage && !stateAppliedForCurrentEvent) {
        this.applyEventState(currentEvent)
        stateAppliedForCurrentEvent = true
      }

      this.displayedAnimatingMessages.update(displayed => [...displayed, displayMessage])

      // Real-time audit logging - log message as it appears in UI
      if (isCombatAuditEnabled()) {
        if (isResultMessage) {
          console.log(`    -> ${displayMessage}`)
        } else {
          console.log(`  ${displayMessage}`)
        }
      }

      eventMessageIndex++

      // Determine delay for NEXT message
      if (eventMessageIndex < currentEvent.messages.length) {
        // More messages in this event
        const nextMessage = currentEvent.messages[eventMessageIndex]
        const nextIsResult = CombatService.isResultMessage(nextMessage)
        const delay = nextIsResult ? resultDelay : actionDelay
        this.messageAnimationTimer = setTimeout(processNextMessage, delay)
      } else {
        // Event messages done, move to next event
        moveToNextEvent()
      }
    }

    // Start processing
    processNextMessage()
  }

  /**
   * Apply state changes from a single event to display signals.
   * Called after the event's messages have been displayed.
   */
  private applyEventState(event: CombatRoundEvent): void {
    // Apply monster group snapshot if present
    if (event.monsterGroupsSnapshot) {
      this.displayMonsterGroups.set([...event.monsterGroupsSnapshot])
    }

    // Apply character updates if present
    if (event.characterUpdates && event.characterUpdates.size > 0) {
      this.displayCharacterOverrides.update(current => {
        const updated = new Map(current)
        for (const [charId, charUpdate] of event.characterUpdates!.entries()) {
          const existing = updated.get(charId) || {}
          updated.set(charId, {
            ...existing,
            ...charUpdate
          })
        }
        return updated
      })
    }
  }

  /**
   * Apply all event states at once (for instant mode with 0 delays)
   */
  private applyAllEventStates(): void {
    for (const event of this.pendingEvents) {
      this.applyEventState(event)
    }
  }

  /**
   * Commit animated messages to the combat log in game state
   * Strips result markers before storing
   */
  private commitAnimatedMessages(): void {
    const messages = this.animatingMessages()
    if (messages.length === 0) return

    // Strip result markers before committing to log
    const cleanMessages = messages.map(msg => CombatService.stripResultMarker(msg))

    this.gameState.updateState(state => {
      if (!state.combat) return state
      return {
        ...state,
        combat: {
          ...state.combat,
          combatLog: [...state.combat.combatLog, ...cleanMessages]
        }
      }
    })

    // Clear animation state
    this.animatingMessages.set([])
    this.displayedAnimatingMessages.set([])
  }

  /**
   * Add a single message to the combat log immediately
   * Used for surprise announcements and other immediate messages
   */
  private addCombatMessage(message: string): void {
    this.gameState.updateState(state => {
      if (!state.combat) return state
      return {
        ...state,
        combat: {
          ...state.combat,
          combatLog: [...state.combat.combatLog, message]
        }
      }
    })
  }

  /**
   * Handle action menu selection (new footer menu pattern)
   */
  handleActionSelection(itemId: string): void {
    if (itemId === 'execute') {
      this.executeRound()
      return
    }

    if (itemId === 'return') {
      this.returnToMaze()
      return
    }

    if (itemId === 'castle') {
      this.returnToCastle()
      return
    }

    // Handle combat actions - map menu IDs to CombatActionType
    const actionTypeMap: Record<string, CombatActionType> = {
      'attack': 'ATTACK',
      'cast': 'CAST_SPELL',
      'parry': 'PARRY',
      'flee': 'RUN'
    }
    const actionType = actionTypeMap[itemId]
    if (actionType) {
      this.selectActionType(actionType)
    }
  }

  selectActionType(actionType: CombatActionType): void {
    // If ATTACK - show group selection dialog
    if (actionType === 'ATTACK') {
      this.selectedActionType.set(actionType)
      this.showGroupSelectionDialog.set(true)
    } else if (actionType === 'PARRY') {
      // PARRY doesn't need a target
      this.confirmAction(actionType, undefined)
    } else if (actionType === 'RUN') {
      // RUN (flee) doesn't need a target
      this.confirmAction(actionType, undefined)
    } else if (actionType === 'CAST_SPELL') {
      // Show spell selection menu
      this.selectedActionType.set(actionType)
      this.showSpellMenu.set(true)
    }
  }

  selectSpell(spellId: string): void {
    // Store the selected spell ID
    this.selectedSpellId.set(spellId)
    this.showSpellMenu.set(false)

    // Get spell data to check targeting requirements
    const spell = SpellCastingService.getSpell(spellId)
    if (!spell) {
      console.error(`Unknown spell: ${spellId}`)
      this.cancelActionSelection()
      return
    }

    // Determine target selection based on spell target type
    // No target selection needed for party-wide, self, or all-enemies spells
    if (spell.target === 'party' || spell.target === 'all_allies' ||
        spell.target === 'self' || spell.target === 'all_enemies') {
      this.confirmAction('CAST_SPELL', undefined)
      return
    }

    // Single-target healing/buff spells need character selection
    if (spell.target === 'single' && (spell.category === 'healing' || spell.category === 'buff')) {
      this.showCharacterSelectionDialog.set(true)
      return
    }

    // Resurrection spells need dead/ashes character selection
    if (spell.target === 'dead_body' || spell.target === 'ashes') {
      this.showCharacterSelectionDialog.set(true)
      return
    }

    // Single-target offensive spells and group spells need monster group selection
    this.showGroupSelectionDialog.set(true)
  }

  /**
   * Select a monster group from dialog
   * Handles both group-targeting (spells) and single-target (attacks, single-target spells)
   */
  selectGroup(groupId: 'A' | 'B' | 'C' | 'D'): void {
    const group = this.monsterGroups().find(g => g.id === groupId)
    if (!group || !this.hasAliveMonsters(group)) return

    // Set selected group ID
    this.selectedGroupId.set(groupId)

    const actionType = this.selectedActionType()
    if (!actionType) return

    // For group-targeting mode (group spells, DISPEL)
    if (this.isGroupTargetMode()) {
      this.confirmAction(actionType, undefined)
      this.showGroupSelectionDialog.set(false)
      return
    }

    // For single-target mode (ATTACK, single-target spells)
    if (this.isMonsterTargetMode()) {
      // Pick a random alive monster from the group
      const aliveMonsters = group.monsters.filter(m => m.hp > 0)
      if (aliveMonsters.length > 0) {
        const targetMonster = RandomService.pickRandom(aliveMonsters)!
        this.confirmAction(actionType, targetMonster)
      } else {
        // No alive monsters (shouldn't happen, but handle gracefully)
        this.confirmAction(actionType, undefined)
      }
      this.showGroupSelectionDialog.set(false)
      return
    }

    // Neither mode active - just close dialog
    this.showGroupSelectionDialog.set(false)
  }

  confirmAction(actionType: CombatActionType, target?: Combatant): void {
    const character = this.activeCharacter()
    if (!character) return

    // Create combat command using CombatService
    const command = CombatService.createCommand(
      character,
      actionType,
      target
    )

    // Attach targetGroupId if a group was selected
    const groupId = this.selectedGroupId()
    if (groupId) {
      command.targetGroupId = groupId
    }

    // If casting a spell, attach spell ID and target character ID to command data
    if (actionType === 'CAST_SPELL') {
      const spellId = this.selectedSpellId()
      const targetCharId = this.selectedTargetCharacterId()
      if (spellId) {
        command.data = {
          spellId,
          ...(targetCharId && { targetCharacterId: targetCharId })
        }
      }
    }

    // Update selected actions (immutable)
    this.selectedActions.update(actions => {
      const newActions = new Map(actions)
      newActions.set(character.id, command)
      return newActions
    })

    // Reset UI state
    this.selectedActionType.set(null)
    this.selectedSpellId.set(null)
    this.selectedGroupId.set(null)
    this.selectedTargetCharacterId.set(null)
    this.showSpellMenu.set(false)
    this.showGroupSelectionDialog.set(false)
    this.showCharacterSelectionDialog.set(false)

    // Advance to next character
    this.advanceToNextCharacter()
  }

  /**
   * Cancel group selection and return to action menu
   */
  cancelGroupSelection(): void {
    this.showGroupSelectionDialog.set(false)
    this.selectedActionType.set(null)
    this.selectedSpellId.set(null)
    this.selectedGroupId.set(null)
  }

  /**
   * Select a party member from character selection dialog
   * Used for healing spells, buff spells, and resurrection spells
   */
  selectCharacter(character: Character): void {
    // Store the selected target character
    this.selectedTargetCharacterId.set(character.id)
    this.showCharacterSelectionDialog.set(false)

    const actionType = this.selectedActionType()
    if (!actionType) return

    // Character is already a valid Combatant (Combatant = Character | MonsterInstance)
    this.confirmAction(actionType, character)
  }

  /**
   * Cancel character selection and return to action menu
   */
  cancelCharacterSelection(): void {
    this.showCharacterSelectionDialog.set(false)
    this.selectedActionType.set(null)
    this.selectedSpellId.set(null)
    this.selectedTargetCharacterId.set(null)
  }

  advanceToNextCharacter(): void {
    const aliveMembers = this.alivePartyMembers()
    const currentIndex = this.activeCharacterIndex()

    // Move to next alive character who hasn't selected an action
    let nextIndex = currentIndex + 1

    while (nextIndex < aliveMembers.length) {
      const nextChar = aliveMembers[nextIndex]
      if (!this.selectedActions().has(nextChar.id)) {
        this.activeCharacterIndex.set(nextIndex)
        return
      }
      nextIndex++
    }

    // If we've gone through all characters, stay at the last one
    // (executeRound button will be enabled)
  }

  cancelActionSelection(): void {
    this.selectedActionType.set(null)
    this.selectedSpellId.set(null)
    this.selectedGroupId.set(null)
    this.selectedTargetCharacterId.set(null)
    this.showSpellMenu.set(false)
    this.showGroupSelectionDialog.set(false)
    this.showCharacterSelectionDialog.set(false)
  }

  // ============= SURPRISE ROUND HANDLING =============

  /**
   * Handle party being surprised - show message and auto-execute monster round
   */
  private async handlePartySurprise(): Promise<void> {
    // 1. Set surprise flag and disable menus
    this.isSurpriseRound.set(true)
    this.isExecutingRound.set(true)

    // 2. Show surprise message in combat log
    this.addCombatMessage('Your party is SURPRISED!')
    await this.delay(1500)

    // 3. Execute monster-only round
    this.executeMonsterSurpriseRound()
  }

  /**
   * Helper to create a delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Execute monster actions only for surprise round (party cannot act)
   */
  private executeMonsterSurpriseRound(): void {
    const state = this.gameState.state()
    const combat = state.combat
    if (!combat) return

    console.log('[Combat] ===== EXECUTING SURPRISE ROUND (Monsters Only) =====')

    // Get characters from roster
    const roster = this.roster()
    const partyMembers = this.party().members
    const chars = partyMembers
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)

    const frontRow = this.party().formation.frontRow

    // Generate monster commands (party has none due to surprise)
    const actingMonsters = CombatService.getAllActingMonsters(combat)
    console.log('[Combat] Acting monsters in surprise round:', actingMonsters.length)

    const monsterCommands = actingMonsters.map(m => {
      const cmd = CombatService.selectMonsterAction(m, chars, frontRow)
      console.log(`[Combat] Monster ${m.name} -> ${cmd.type} command`)
      return cmd
    })

    // Create state with monster commands only
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: monsterCommands
    }

    // Execute round with events
    const result = CombatService.executeRoundWithEvents(stateWithCommands, chars, frontRow)
    console.log('[Combat] Surprise round result:', {
      events: result.events.length,
      victory: result.victory,
      defeat: result.defeat
    })

    // Setup animation (reuse existing pattern)
    this.displayMonsterGroups.set([...combat.monsterGroups])
    this.displayCharacterOverrides.set(new Map())
    this.pendingRoundResult = result
    this.pendingEvents = result.events
    this.currentEventIndex = 0

    // Start event-based animation
    this.startEventAnimation()
  }

  // ============= NORMAL ROUND EXECUTION =============

  executeRound(): void {
    const combat = this.combatState()
    if (!combat) return

    console.log('[Combat] ===== EXECUTING ROUND', combat.roundNumber, '=====')

    // Get characters from roster (not computed, to avoid display overrides)
    const roster = this.roster()
    const partyMembers = this.party().members
    const chars = partyMembers
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
    const actions = this.selectedActions()

    const DEBUG = CombatService.DEBUG_COMBAT

    if (DEBUG) {
      console.log('[Combat] Party status before round:')
      chars.forEach(c => console.debug(`  ${c.name}: ${c.hp}/${c.maxHp} HP, Status: ${c.status}`))
    }

    const monsters = CombatService.getAllMonsters(combat)
    if (DEBUG) {
      console.log('[Combat] Monster status before round:')
      monsters.forEach(m => console.debug(`  ${m.name}: ${m.hp}/${m.maxHp} HP`))
    }

    // Create party commands from selected actions
    // Use expandAttackCommands to expand ATTACK commands for multi-attack classes
    // This preserves the original initiative for all attacks (they happen at the same time)
    const rawPartyCommands = Array.from(actions.values())
    const partyCommands = CombatService.expandAttackCommands(rawPartyCommands)

    if (DEBUG) {
      console.log('[Combat] Building party commands from', actions.size, 'selected actions')
      console.log('[Combat] Expanded to', partyCommands.length, 'total commands')
      partyCommands.forEach(cmd => {
        console.debug(`[Combat] ${cmd.actor.name} (${cmd.type}) -> target: ${this.getTargetName(cmd.target)}`)
      })
    }

    if (DEBUG) console.log('[Combat] Total party commands:', partyCommands.length)

    // Create monster commands using AI (only for monsters that can act)
    const actingMonsters = CombatService.getAllActingMonsters(combat)
    const frontRow = this.party().formation.frontRow

    if (DEBUG) {
      console.log('[Combat] Acting monsters:', actingMonsters.length, 'of', monsters.length, 'total')
      actingMonsters.forEach(m => console.debug(`  - ${m.name} (id: ${m.id}, hp: ${m.hp}, status: ${m.status})`))
    }

    const monsterCommands = actingMonsters.map(m => {
      const cmd = CombatService.selectMonsterAction(m, chars, frontRow)
      if (DEBUG) console.debug(`[Combat] Monster ${m.name} (${m.id}) -> ${cmd.type} command, target: ${this.getTargetName(cmd.target)}`)
      return cmd
    })

    if (DEBUG) console.log('[Combat] Total monster commands:', monsterCommands.length)

    // Update combat state with all commands
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: [...partyCommands, ...monsterCommands]
    }

    if (DEBUG) {
      console.log('[Combat] ===== COMMAND QUEUE SUMMARY =====')
      console.log(`[Combat] Total commands: ${stateWithCommands.commandQueue.length} (${partyCommands.length} party + ${monsterCommands.length} monster)`)
      stateWithCommands.commandQueue.forEach((cmd, idx) => {
        const isMonster = 'monsterId' in cmd.actor
        console.debug(`  ${idx + 1}. ${cmd.actor.name} (${isMonster ? 'M' : 'P'}) -> ${cmd.type} -> ${this.getTargetName(cmd.target)} [init: ${cmd.initiative}]`)
      })
      console.log('[Combat] ================================')
    }

    // Execute round with event-based tracking for animation synchronization
    this.isExecutingRound.set(true)
    const result = CombatService.executeRoundWithEvents(stateWithCommands, chars, frontRow)

    if (DEBUG) {
      console.log('[Combat] Round result:', {
        victory: result.victory,
        defeat: result.defeat,
        fled: result.fled,
        events: result.events.length
      })
    }

    // Log round start with queued actions (audit)
    if (isCombatAuditEnabled() && result.audit) {
      console.log(`\n===== COMBAT ROUND ${combat.roundNumber} =====`)
      console.log(`Queued Actions (by initiative):`)
      for (const action of result.audit.actions) {
        const target = action.targetName ? ` -> ${action.targetName}` : ''
        const details = action.details ? ` [${action.details}]` : ''
        const status = action.status === 'skipped' ? ` (${action.skipReason})` : ''
        console.log(`  ${action.actorName} ${action.actionType}${target}${details} [init: ${action.initiative}]${status}`)
      }
      console.log(`\n--- Executing ---`)
    }

    // Initialize display state from current state (before animation changes anything)
    this.displayMonsterGroups.set([...combat.monsterGroups])
    this.displayCharacterOverrides.set(new Map())

    // Clear selected actions and reset to first character
    this.selectedActions.set(new Map())
    this.activeCharacterIndex.set(0)

    // Store the round result for state commit after animation
    this.pendingRoundResult = result
    this.pendingEvents = result.events
    this.currentEventIndex = 0

    // Start event-based animation
    this.startEventAnimation()
  }

  /**
   * Called when all round messages have been displayed.
   * Commits final state to game state and clears display signals.
   */
  private onRoundAnimationComplete(): void {
    console.log('[Combat] Message animation complete')

    const result = this.pendingRoundResult
    if (!result) {
      console.error('[Combat] No pending round result!')
      this.clearAnimationState()
      return
    }

    // Log round end summary (audit)
    if (isCombatAuditEnabled()) {
      console.log(`\n--- Round Complete ---`)

      // Party summary
      console.log(`Party:`)
      const roster = this.roster()
      for (const charId of this.party().members) {
        const char = roster.get(charId)
        if (char) {
          const updated = result.finalCharacterUpdates.get(charId)
          const hp = updated?.hp ?? char.hp
          const status = updated?.status ?? char.status
          console.log(`  ${char.name}: ${hp}/${char.maxHp} HP (${status})`)
        }
      }

      // Monster summary
      console.log(`Monsters:`)
      const remainingMonsters = result.finalState.monsterGroups.flatMap(g => g.monsters.filter(m => m.status !== 'DEAD'))
      if (remainingMonsters.length === 0) {
        console.log(`  (none remaining)`)
      } else {
        for (const m of remainingMonsters) {
          console.log(`  ${m.name}: ${m.hp}/${m.maxHp} HP (${m.status})`)
        }
      }

      // Action summary
      if (result.audit) {
        console.log(`\nActions: ${result.audit.summary.executed} executed, ${result.audit.summary.skipped} skipped`)

        // Show skipped actions if any
        if (result.audit.summary.skipped > 0) {
          console.log(`Skipped:`)
          for (const action of result.audit.actions.filter(a => a.status === 'skipped')) {
            const target = action.targetName ? ` -> ${action.targetName}` : ''
            console.log(`  ${action.actorName} ${action.actionType}${target} (${action.skipReason})`)
          }
        }
      }
      console.log(`=====================================\n`)
    }

    // Commit final state to game state (this is where actual state changes happen)
    // First, collect all messages for the combat log
    const allMessages = this.animatingMessages()
    const cleanMessages = allMessages.map(msg => CombatService.stripResultMarker(msg))

    this.gameState.updateState(state => {
      // Update roster with final character states
      let newRoster = new Map(state.roster)

      // Apply final character damage/status
      for (const [charId, damagedChar] of result.finalCharacterUpdates.entries()) {
        newRoster.set(charId, damagedChar)
      }

      // Deduct spell points for casters
      for (const [charId, {character, spellId}] of result.spellCasters.entries()) {
        const currentChar = newRoster.get(charId) || character
        const updatedChar = SpellCastingService.deductSpellPoints(currentChar, spellId)
        newRoster.set(charId, updatedChar)
      }

      // Apply status cures (sleep/paralysis wore off)
      // Preserve spell points from current roster state to avoid overwriting deductions
      for (const [charId, curedChar] of result.curedCharacters.entries()) {
        const currentChar = newRoster.get(charId)
        if (currentChar) {
          // Preserve spell points and other state, only update status
          newRoster.set(charId, { ...currentChar, status: curedChar.status })
        } else {
          newRoster.set(charId, curedChar)
        }
      }

      // Merge final combat state with committed messages
      const updatedCombat = {
        ...result.finalState,
        combatLog: [...(state.combat?.combatLog || []), ...cleanMessages]
      }

      return {
        ...state,
        roster: newRoster,
        combat: updatedCombat
      }
    })

    // Clear display state signals - game state is now the source of truth
    this.clearAnimationState()

    // Clear surprise round flag if it was set
    if (this.isSurpriseRound()) {
      this.isSurpriseRound.set(false)
    }

    // Mark round execution as complete
    this.isExecutingRound.set(false)

    // Log final state after round
    const updatedChars = this.partyCharacters()
    console.log('[Combat] Party status after round:')
    updatedChars.forEach(c => console.log(`  ${c.name}: ${c.hp}/${c.maxHp} HP, Status: ${c.status}`))

    const alivePartyCount = updatedChars.filter(c => c.hp > 0).length
    const deadPartyCount = updatedChars.filter(c => c.hp <= 0).length
    console.log('[Combat] Alive:', alivePartyCount, 'Dead:', deadPartyCount)

    const combat = this.combatState()
    if (combat) {
      const updatedMonsters = CombatService.getAllMonsters(combat)
      const aliveMonsterCount = updatedMonsters.filter(m => m.hp > 0).length
      const deadMonsterCount = updatedMonsters.filter(m => m.hp <= 0).length
      console.log('[Combat] Monsters - Alive:', aliveMonsterCount, 'Dead:', deadMonsterCount)
    }

    // Clear pending result
    this.pendingRoundResult = null

    // Check for victory, defeat, or flee
    if (result.victory) {
      console.log('[Combat] VICTORY! All monsters defeated')
      this.handleVictory()
    } else if (result.defeat) {
      console.log('[Combat] DEFEAT! All party members fallen')
      this.handleDefeat()
    } else if (result.fled) {
      console.log('[Combat] FLED! Party escaped')
      this.handleFlee()
    } else {
      console.log('[Combat] Combat continues to next round')
    }
  }

  /**
   * Clear animation state signals.
   * Called after animation completes to return to game state as source of truth.
   */
  private clearAnimationState(): void {
    this.displayMonsterGroups.set(null)
    this.displayCharacterOverrides.set(new Map())
    this.pendingEvents = []
    this.currentEventIndex = 0
    this.animatingMessages.set([])
    this.displayedAnimatingMessages.set([])
  }

  private handleFlee(): void {
    console.log('[Combat] handleFlee() called - returning to maze')

    // Clear combat state
    this.gameState.updateState(state => ({
      ...state,
      combat: undefined
    }))

    // Return to maze
    this.router.navigate(['/maze'])
  }

  private async handleVictory(): Promise<void> {
    const combat = this.combatState()
    if (!combat) return

    const party = this.party()
    const roster = this.roster()
    const partyMembers = party.members

    // Get all defeated monsters from all groups
    const allMonsters = CombatService.getAllMonsters(combat)

    // Calculate rewards (using living character count)
    const rewards = VictoryService.calculateVictoryRewards(
      allMonsters,
      roster,
      partyMembers
    )

    // Distribute XP to roster immediately (only living characters get XP)
    const newRoster = VictoryService.distributeRewards(
      roster,
      partyMembers,
      rewards.xpPerCharacter
    )

    // Determine if monsters leave behind a treasure chest or just loose gold
    // In original Wizardry, not all encounters had chests - some just dropped gold
    // Higher level monsters are more likely to have treasure chests
    const maxMonsterLevel = Math.max(...allMonsters.map(m => m.level || 1), 1)
    const chestProbability = this.getChestProbability(maxMonsterLevel)
    const hasChest = RandomService.roll(chestProbability)

    if (hasChest) {
      // Monsters left behind a treasure chest - navigate to chest scene
      await this.handleVictoryWithChest(newRoster, rewards, party, maxMonsterLevel, allMonsters)
    } else {
      // Monsters dropped loose gold - distribute directly and show victory modal
      this.handleVictoryWithLooseGold(newRoster, rewards)
    }
  }

  /**
   * Calculate probability of monsters leaving a treasure chest
   * Based on original Wizardry where some encounters (rewards #0-9) dropped loose gold
   * and others (rewards #10-19) had treasure chests
   */
  private getChestProbability(maxMonsterLevel: number): number {
    // Higher level monsters are more likely to guard treasure chests
    if (maxMonsterLevel <= 2) return 0.30  // 30% for levels 1-2
    if (maxMonsterLevel <= 4) return 0.50  // 50% for levels 3-4
    if (maxMonsterLevel <= 6) return 0.70  // 70% for levels 5-6
    return 0.90                             // 90% for level 7+
  }

  /**
   * Handle victory when monsters leave behind a treasure chest
   * Uses authentic Wizardry 1 treasure tables via ChestService
   */
  private async handleVictoryWithChest(
    newRoster: Map<string, Character>,
    rewards: VictoryRewards,
    party: { position: { x: number; y: number; level: number; facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' }; members: string[]; gold: number },
    maxMonsterLevel: number,
    allMonsters: MonsterInstance[]
  ): Promise<void> {
    // Determine reward tier based on monster level (Reward 2 system: 10-19)
    // Level 1-2 = tier 10, Level 3-4 = tier 11, etc.
    const rewardTier = Math.min(19, Math.max(10, 10 + Math.floor((maxMonsterLevel - 1) / 2))) as RewardTier

    // Generate chest using authentic Wizardry 1 treasure tables
    const chest = await ChestService.generateChest(
      rewardTier,
      party.position.level,
      { x: party.position.x, y: party.position.y, facing: party.position.facing },
      'combat_victory'
    )

    // Update game state: distribute XP, clear combat, set pending chest and combat rewards
    this.gameState.updateState(state => ({
      ...state,
      roster: newRoster,
      combat: undefined,
      pendingChest: chest,
      pendingCombatRewards: {
        totalXP: rewards.totalXP,
        xpPerCharacter: rewards.xpPerCharacter,
        livingCharacterCount: rewards.livingCharacterCount,
        monstersDefeated: allMonsters.length
      }
    }))

    // Store rewards for display
    this.victoryRewards.set(rewards)

    // Navigate to victory scene (shows XP first, then navigates to chest)
    this.router.navigate(['/victory'])
  }

  /**
   * Handle victory when monsters drop loose gold (no chest)
   * This matches original Wizardry where some encounters just dropped gold directly
   */
  private handleVictoryWithLooseGold(
    newRoster: Map<string, Character>,
    rewards: VictoryRewards
  ): void {
    // Get all monsters for counting
    const allMonsters = this.combatState()?.monsterGroups.flatMap(g => g.monsters) || []

    // Update game state: distribute XP, add gold directly to party, clear combat
    // Also set pendingCombatRewards for victory display (no pendingChest)
    this.gameState.updateState(state => ({
      ...state,
      roster: newRoster,
      party: {
        ...state.party,
        gold: state.party.gold + rewards.totalGold
      },
      combat: undefined,
      pendingCombatRewards: {
        totalXP: rewards.totalXP,
        xpPerCharacter: rewards.xpPerCharacter,
        livingCharacterCount: rewards.livingCharacterCount,
        monstersDefeated: allMonsters.length
      }
      // Note: pendingChest is NOT set, so victory scene knows there's no chest
    }))

    // Store rewards for display (gold goes directly to party, no items without chest)
    const looseGoldRewards: VictoryRewards = {
      ...rewards,
      items: []  // No items without a chest
    }
    this.victoryRewards.set(looseGoldRewards)

    // Navigate to victory scene (shows XP, then returns to maze since no chest)
    this.router.navigate(['/victory'])
  }

  private handleDefeat(): void {

    const state = this.gameState.state()
    const party = state.party
    const roster = state.roster

    // Store death location for modal display (before clearing party)
    const deathLoc = {
      level: party.position.level,
      x: party.position.x,
      y: party.position.y
    }
    this.deathLocation.set(deathLoc)

    console.log('[Combat] Death location: Level', deathLoc.level, 'at (', deathLoc.x, ',', deathLoc.y, ')')

    // Create body entries for all dead party members at current dungeon position
    const bodies = new Map(state.bodies || new Map())

    party.members.forEach(charId => {
      const character = roster.get(charId)
      if (character && character.hp <= 0) {
        console.log('[Combat] Creating body for', character.name, 'at death location')
        bodies.set(charId, {
          characterId: charId,
          level: party.position.level,
          x: party.position.x,
          y: party.position.y
        })
      }
    })

    console.log('[Combat] Total bodies created:', bodies.size)
    console.log('[Combat] Clearing party members and showing defeat modal')

    // Clear party members and combat state
    this.gameState.updateState(currentState => ({
      ...currentState,
      party: {
        ...currentState.party,
        members: [],
        formation: {
          frontRow: [],
          backRow: []
        }
      },
      bodies,
      combat: undefined
    }))

    // Show defeat modal
    this.showDefeatModal.set(true)
    console.log('[Combat] Defeat modal shown:', this.showDefeatModal())
    console.log('[Combat] Death location stored:', this.deathLocation())
  }

  getCharacterName(charId: string): string {
    return this.roster().get(charId)?.name || 'Unknown'
  }

  returnToMaze(): void {
    this.showVictoryModal.set(false)
    this.itemDistribution.set(new Map()) // Clear distribution
    this.router.navigate(['/maze'])
  }

  returnToCastle(): void {
    this.showDefeatModal.set(false)
    this.deathLocation.set(null)
    this.router.navigate(['/castle'])
  }

  /**
   * Find the group containing a specific monster
   */
  findGroupContainingMonster(monsterId: string): MonsterGroup | undefined {
    return this.monsterGroups().find(group =>
      group.monsters.some(m => m.id === monsterId)
    )
  }

  /**
   * Check if a group has any alive monsters
   */
  hasAliveMonsters(group: MonsterGroup): boolean {
    return group.monsters.some(m => m.hp > 0)
  }

  /**
   * Get count of alive monsters in a group
   */
  getAliveCount(group: MonsterGroup): number {
    return group.monsters.filter(m => m.hp > 0).length
  }

  /**
   * Get formatted display text for a monster group
   * Format: "{count} {PLURAL_NAME}" (e.g., "3 ORCS", "5 ZOMBIES")
   * Matches original Wizardry (1981) display format
   */
  getGroupDisplayName(group: MonsterGroup): string {
    const aliveCount = this.getAliveCount(group)
    if (aliveCount === 0 || group.monsters.length === 0) {
      return 'DEFEATED'
    }

    // Get monster name from first monster in group (all have same name)
    const monsterName = group.monsters[0]?.name || 'UNKNOWN'
    return getGroupDisplayText(aliveCount, monsterName)
  }

  /**
   * Get display text for a combat command (for showing selected action on character card)
   */
  getActionDisplayText(command: CombatCommand): string {
    switch (command.type) {
      case 'ATTACK':
        return 'ATTACK'
      case 'PARRY':
        return 'PARRY'
      case 'RUN':
        return 'FLEE'
      case 'DISPEL':
        return 'DISPEL'
      case 'CAST_SPELL':
        if (command.data?.spellId) {
          const spell = SpellCastingService.getSpell(command.data.spellId)
          return spell ? spell.name.toUpperCase() : 'CAST'
        }
        return 'CAST'
      case 'USE_ITEM':
        return 'USE ITEM'
      case 'ADVANCE':
        return 'ADVANCE'
      default:
        return command.type
    }
  }

  // Keyboard handling now delegated to MenuComponent via SceneFooterComponent

  private getTargetName(target: Combatant | Combatant[] | undefined): string {
    if (!target) return 'none'
    if (Array.isArray(target)) {
      return target.map(t => t.name || 'Unknown').join(', ')
    }
    return target.name || 'Unknown'
  }
}
