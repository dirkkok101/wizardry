// src/app/scenes/combat/combat.ts
import { Component, computed, signal, OnInit, OnDestroy, ViewChild, ElementRef, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '@services/GameStateService'
import { CombatService } from '@services/CombatService'
import { RandomService } from '@services/RandomService'
import { SpellCastingService } from '@services/SpellCastingService'
import { VictoryService, VictoryRewards } from '@services/VictoryService'
import { SceneType } from '@models/SceneType'
import { CombatState, CombatCommand, Combatant, CombatActionType, MonsterGroup, MonsterInstance } from '@models/Combat'
import { Character } from '@models/Character'
import { MenuItem } from '@shared/components/menu/menu.component'
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component'
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component'
import { PartyCharacterGridComponent } from '@shared/components/party-character-grid/party-character-grid.component'
import { MonsterGroupSelectionDialogComponent, MonsterGroupOption } from '@shared/components/monster-group-selection-dialog/monster-group-selection-dialog.component'
import { CharacterSelectionDialogComponent, CharacterOption } from '@shared/components/character-selection-dialog/character-selection-dialog.component'
import { getGroupDisplayText } from '@utils/MonsterNameUtils'
import { CharacterStatus } from '@models/CharacterStatus'
import { getCombatMessageDelay, getActionResultDelay } from '@config/CombatSettings'
import { CharacterField } from '@models/CharacterCardTypes'

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
    PartyCharacterGridComponent,
    MonsterGroupSelectionDialogComponent,
    CharacterSelectionDialogComponent
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
  private pendingRoundResult: {
    victory: boolean
    defeat: boolean
    fled: boolean
  } | null = null
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

  // Computed party characters
  readonly partyCharacters = computed(() => {
    const members = this.party().members
    const roster = this.roster()
    return members
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
  })

  // Front row party characters (for formation layout)
  readonly frontRowCharacters = computed(() => {
    const frontRowIds = this.party().formation.frontRow
    const roster = this.roster()
    return frontRowIds
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
  })

  // Back row party characters (for formation layout)
  readonly backRowCharacters = computed(() => {
    const backRowIds = this.party().formation.backRow
    const roster = this.roster()
    return backRowIds
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
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

  // Get monster groups directly
  readonly monsterGroups = computed(() => {
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

  // Visible fields for combat character cards (same as maze)
  readonly combatCharacterFields: CharacterField[] = ['class', 'level', 'hp', 'ac']

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

    return [
      { id: 'attack', label: 'Attack', shortcut: 'A', enabled: true },
      { id: 'cast', label: 'Cast Spell', shortcut: 'C', enabled: hasSpells },
      { id: 'parry', label: 'Parry', shortcut: 'P', enabled: true },
      { id: 'flee', label: 'Flee', shortcut: 'F', enabled: combat?.canFlee ?? false }
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

    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.COMBAT
    }))
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

  executeRound(): void {
    const combat = this.combatState()
    if (!combat) return

    console.log('[Combat] ===== EXECUTING ROUND', combat.roundNumber, '=====')

    const chars = this.partyCharacters()
    const actions = this.selectedActions()

    console.log('[Combat] Party status before round:')
    chars.forEach(c => console.log(`  ${c.name}: ${c.hp}/${c.maxHp} HP, Status: ${c.status}`))

    const monsters = CombatService.getAllMonsters(combat)
    console.log('[Combat] Monster status before round:')
    monsters.forEach(m => console.log(`  ${m.name}: ${m.hp}/${m.maxHp} HP`))

    // Create party commands from selected actions
    // Expand attack commands into multiple attacks for multi-attack classes
    const partyCommands: CombatCommand[] = []
    for (const command of actions.values()) {
      if (command.type === 'ATTACK') {
        const attacksPerRound = CombatService.getAttacksPerRound(command.actor)
        for (let i = 0; i < attacksPerRound; i++) {
          partyCommands.push(
            CombatService.createCommand(command.actor, 'ATTACK', command.target)
          )
        }
      } else {
        partyCommands.push(command)
      }
    }

    console.log('[Combat] Party commands:', partyCommands.length)

    // Create monster commands using AI (only for monsters that can act)
    const actingMonsters = CombatService.getAllActingMonsters(combat)
    const frontRow = this.party().formation.frontRow
    const monsterCommands = actingMonsters.map(m =>
      CombatService.selectMonsterAction(m, chars, frontRow)
    )

    console.log('[Combat] Monster commands:', monsterCommands.length)

    // Update combat state with all commands
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: [...partyCommands, ...monsterCommands]
    }

    // Execute round with party for damage tracking
    this.isExecutingRound.set(true)
    const result = CombatService.executeRound(stateWithCommands, chars, frontRow)

    console.log('[Combat] Round result:', {
      victory: result.victory,
      defeat: result.defeat,
      fled: result.fled,
      messages: result.messages.length
    })

    // Update game state with result (but don't add messages to log yet - they'll be animated)
    this.gameState.updateState(state => {
      // Update roster with damaged characters and spell casters
      let newRoster = new Map(state.roster)

      // Apply damage
      for (const [charId, damagedChar] of result.damagedCharacters.entries()) {
        newRoster.set(charId, damagedChar)
      }

      // Deduct spell points for casters
      for (const [charId, {character, spellId}] of result.spellCasters.entries()) {
        const currentChar = newRoster.get(charId) || character
        const updatedChar = SpellCastingService.deductSpellPoints(currentChar, spellId)
        newRoster.set(charId, updatedChar)
      }

      // Apply status cures (sleep/paralysis wore off)
      for (const [charId, curedChar] of result.curedCharacters.entries()) {
        newRoster.set(charId, curedChar)
      }

      // Update combat state WITHOUT adding messages (they'll be animated)
      const updatedCombat = {
        ...result.newState
        // Note: combatLog not updated here - messages are animated then committed
      }

      return {
        ...state,
        roster: newRoster,
        combat: updatedCombat
      }
    })

    // Clear selected actions and reset to first character
    this.selectedActions.set(new Map())
    this.activeCharacterIndex.set(0)

    // Store the round result to handle after animation
    this.pendingRoundResult = {
      victory: result.victory,
      defeat: result.defeat,
      fled: result.fled
    }

    // Start animating messages with delays
    this.startMessageAnimation(result.messages, () => {
      this.onRoundAnimationComplete()
    })
  }

  /**
   * Called when all round messages have been displayed
   */
  private onRoundAnimationComplete(): void {
    console.log('[Combat] Message animation complete')

    // Commit animated messages to the combat log
    this.commitAnimatedMessages()

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

    // Check for victory, defeat, or flee using stored result
    const result = this.pendingRoundResult
    if (result) {
      this.pendingRoundResult = null

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

  private handleVictory(): void {
    console.log('[Combat] handleVictory() called')

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

    console.log('[Combat] Victory rewards:', {
      totalXP: rewards.totalXP,
      xpPerCharacter: rewards.xpPerCharacter,
      totalGold: rewards.totalGold,
      items: rewards.items.length
    })

    // Distribute XP to roster (only living characters get XP)
    let newRoster = VictoryService.distributeRewards(
      roster,
      partyMembers,
      rewards.xpPerCharacter
    )

    // Distribute items to party inventories
    const itemResult = VictoryService.distributeItems(
      newRoster,
      partyMembers,
      rewards.items
    )
    newRoster = itemResult.roster

    // Store item distribution for display
    this.itemDistribution.set(itemResult.itemsAdded)

    // Update game state
    this.gameState.updateState(state => ({
      ...state,
      roster: newRoster,
      party: {
        ...state.party,
        gold: state.party.gold + rewards.totalGold
      },
      combat: undefined  // Clear combat state
    }))

    // Show victory modal
    this.victoryRewards.set(rewards)
    this.showVictoryModal.set(true)
    console.log('[Combat] Victory modal shown')
  }

  private handleDefeat(): void {
    console.log('[Combat] handleDefeat() called')

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
}
