// src/app/scenes/combat/combat.ts
import { Component, computed, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../../services/GameStateService'
import { CombatService } from '../../../services/CombatService'
import { SpellCastingService } from '../../../services/SpellCastingService'
import { VictoryService, VictoryRewards } from '../../../services/VictoryService'
import { SceneType } from '../../../types/SceneType'
import { CombatState, CombatCommand, Combatant, CombatActionType, MonsterGroup, MonsterInstance } from '../../../types/Combat'
import { Character } from '../../../types/Character'
import { MenuItem } from '../../../components/menu/menu.component'
import { SceneTitleComponent } from '../../../components/scene-title/scene-title.component'
import { SceneFooterComponent } from '../../../components/scene-footer/scene-footer.component'
import { MonsterGroupSelectionDialogComponent, MonsterGroupOption } from '../../../components/monster-group-selection-dialog/monster-group-selection-dialog.component'
import { getGroupDisplayText } from '../../../utils/MonsterNameUtils'

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
    MonsterGroupSelectionDialogComponent
  ],
  templateUrl: './combat.html',
  styleUrls: ['./combat.scss']
})
export class CombatComponent implements OnInit {
  // Expose Array for template use
  readonly Array = Array

  // Computed from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly party = computed(() => this.gameState.state().party)
  readonly roster = computed(() => this.gameState.state().roster)

  // Local UI state
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())
  readonly isExecutingRound = signal<boolean>(false)
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

  // Computed party characters
  readonly partyCharacters = computed(() => {
    const members = this.party().members
    const roster = this.roster()
    return members
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
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
  readonly isMonsterTargetMode = computed(() => {
    const action = this.selectedActionType()
    if (!action) return false

    // Single monster targeting for ATTACK
    if (action === 'ATTACK') return true

    // Single monster targeting for single-target spells
    if (action === 'CAST_SPELL') {
      const spellId = this.selectedSpellId()
      if (!spellId) return false

      const spell = SpellCastingService.getSpell(spellId)
      return spell?.target === 'single'
    }

    return false
  })

  readonly combatLog = computed(() => {
    const combat = this.combatState()
    return combat?.combatLog || []
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

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

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

    // Handle combat actions (attack, cast, parry, flee)
    const actionType = itemId.toUpperCase() as CombatActionType
    this.selectActionType(actionType)
  }

  selectActionType(actionType: CombatActionType): void {
    // If ATTACK - show group selection dialog
    if (actionType === 'ATTACK') {
      this.selectedActionType.set(actionType)
      this.showGroupSelectionDialog.set(true)
    } else if (actionType === 'PARRY') {
      // PARRY doesn't need a target
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

    // Determine if target selection is needed based on spell target type
    if (spell.target === 'all_allies' || spell.target === 'self' || spell.target === 'all_enemies') {
      // No target selection needed - confirm action immediately
      this.confirmAction('CAST_SPELL', undefined)
    } else {
      // Show group selection dialog for single and group target spells
      this.showGroupSelectionDialog.set(true)
    }
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
        const randomIndex = Math.floor(Math.random() * aliveMonsters.length)
        const targetMonster = aliveMonsters[randomIndex]
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

    // If casting a spell, attach spell ID to command data
    if (actionType === 'CAST_SPELL') {
      const spellId = this.selectedSpellId()
      if (spellId) {
        command.data = { spellId }
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
    this.showSpellMenu.set(false)
    this.showGroupSelectionDialog.set(false)

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
    this.showSpellMenu.set(false)
    this.showGroupSelectionDialog.set(false)
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
    const result = CombatService.executeRound(stateWithCommands, chars)

    console.log('[Combat] Round result:', {
      victory: result.victory,
      defeat: result.defeat,
      fled: result.fled,
      messages: result.messages.length
    })

    // Update game state with result
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

      // Update combat state with log
      const updatedCombat = {
        ...result.newState,
        combatLog: [...result.newState.combatLog, ...result.messages]
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
    this.isExecutingRound.set(false)

    // Log final state after round
    const updatedChars = this.partyCharacters()
    console.log('[Combat] Party status after round:')
    updatedChars.forEach(c => console.log(`  ${c.name}: ${c.hp}/${c.maxHp} HP, Status: ${c.status}`))

    const alivePartyCount = updatedChars.filter(c => c.hp > 0).length
    const deadPartyCount = updatedChars.filter(c => c.hp <= 0).length
    console.log('[Combat] Alive:', alivePartyCount, 'Dead:', deadPartyCount)

    const updatedMonsters = CombatService.getAllMonsters(this.combatState()!)
    const aliveMonsterCount = updatedMonsters.filter(m => m.hp > 0).length
    const deadMonsterCount = updatedMonsters.filter(m => m.hp <= 0).length
    console.log('[Combat] Monsters - Alive:', aliveMonsterCount, 'Dead:', deadMonsterCount)

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

  // Keyboard handling now delegated to MenuComponent via SceneFooterComponent
}
