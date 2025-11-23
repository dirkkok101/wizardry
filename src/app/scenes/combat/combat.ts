// src/app/scenes/combat/combat.ts
import { Component, computed, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../../services/GameStateService'
import { CombatService } from '../../../services/CombatService'
import { SpellCastingService } from '../../../services/SpellCastingService'
import { VictoryService, VictoryRewards } from '../../../services/VictoryService'
import { SceneType } from '../../../types/SceneType'
import { CombatState, CombatCommand, Combatant, CombatActionType } from '../../../types/Combat'
import { Character } from '../../../types/Character'
import { MenuItem } from '../../../components/menu/menu.component'
import { SceneTitleComponent } from '../../../components/scene-title/scene-title.component'
import { SceneFooterComponent } from '../../../components/scene-footer/scene-footer.component'

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
    SceneFooterComponent
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
  readonly activeCharacterIndex = signal<number>(0)
  readonly selectedActionType = signal<CombatActionType | null>(null)
  readonly selectedSpellId = signal<string | null>(null)
  readonly showSpellMenu = signal<boolean>(false)
  readonly showTargetSelection = signal<boolean>(false)

  // Target selection prompt (dynamic based on action type and spell)
  readonly targetSelectionPrompt = computed(() => {
    const actionType = this.selectedActionType()
    const spellId = this.selectedSpellId()

    // For spell casting with target selection
    if (actionType === 'CAST_SPELL' && spellId) {
      const spell = SpellCastingService.getSpell(spellId)
      if (spell) {
        // Spell-specific prompt
        if (spell.target === 'single') {
          return {
            title: `${spell.name} - SELECT SINGLE TARGET`,
            subtitle: 'Click on a monster to target'
          }
        } else if (spell.target === 'group') {
          return {
            title: `${spell.name} - SELECT MONSTER GROUP`,
            subtitle: 'Click on any monster in the target group'
          }
        } else if (spell.target === 'all_enemies') {
          return {
            title: `${spell.name} - TARGETING ALL ENEMIES`,
            subtitle: 'Spell will affect all monster groups'
          }
        }
      }
    }

    // For attack action
    if (actionType === 'ATTACK') {
      return {
        title: 'ATTACK - SELECT TARGET',
        subtitle: 'Click on a monster to attack'
      }
    }

    // For flee action
    if (actionType === 'RUN') {
      return {
        title: 'FLEE - SELECT DIRECTION',
        subtitle: 'Click on a monster group to flee from'
      }
    }

    // Default fallback
    return {
      title: 'SELECT TARGET',
      subtitle: 'Click on a monster to target'
    }
  })

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
    { id: 'temple', label: 'Go to Temple', shortcut: 'ENTER', enabled: true }
  ])

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
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

    if (itemId === 'temple') {
      this.returnToTemple()
      return
    }

    // Handle combat actions (attack, cast, parry, flee)
    const actionType = itemId.toUpperCase() as CombatActionType
    this.selectActionType(actionType)
  }

  selectActionType(actionType: CombatActionType): void {
    // If ATTACK or RUN - show target selection
    if (actionType === 'ATTACK' || actionType === 'RUN') {
      this.selectedActionType.set(actionType)
      this.showTargetSelection.set(true)
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
    if (spell.target === 'all_allies' || spell.target === 'self') {
      // No target selection needed - confirm action immediately
      this.confirmAction('CAST_SPELL', undefined)
    } else {
      // Show target selection for single, group, or all_enemies spells
      this.showTargetSelection.set(true)
    }
  }

  selectTarget(target: Combatant): void {
    const actionType = this.selectedActionType()
    if (!actionType) return

    this.confirmAction(actionType, target)
    this.showTargetSelection.set(false)
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
    this.showSpellMenu.set(false)
    this.showTargetSelection.set(false)

    // Advance to next character
    this.advanceToNextCharacter()
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
    this.showTargetSelection.set(false)
  }

  executeRound(): void {
    const combat = this.combatState()
    if (!combat) return

    const chars = this.partyCharacters()
    const actions = this.selectedActions()

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

    // Create monster commands using AI (only for monsters that can act)
    const actingMonsters = CombatService.getAllActingMonsters(combat)
    const frontRow = this.party().formation.frontRow
    const monsterCommands = actingMonsters.map(m =>
      CombatService.selectMonsterAction(m, chars, frontRow)
    )

    // Update combat state with all commands
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: [...partyCommands, ...monsterCommands]
    }

    // Execute round with party for damage tracking
    this.isExecutingRound.set(true)
    const result = CombatService.executeRound(stateWithCommands, chars)

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

    // Check for victory, defeat, or flee
    if (result.victory) {
      this.handleVictory()
    } else if (result.defeat) {
      this.handleDefeat()
    } else if (result.fled) {
      this.handleFlee()
    }
  }

  private handleFlee(): void {
    // Clear combat state
    this.gameState.updateState(state => ({
      ...state,
      combat: undefined
    }))

    // Return to maze
    this.router.navigate(['/maze'])
  }

  private handleVictory(): void {
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
  }

  private handleDefeat(): void {
    // TODO: Place dead bodies at current dungeon position
    // TODO: Send to Castle scene, not Temple

    // Clear combat state
    this.gameState.updateState(state => ({
      ...state,
      combat: undefined
    }))

    // Show defeat modal
    this.showDefeatModal.set(true)
  }

  getCharacterName(charId: string): string {
    return this.roster().get(charId)?.name || 'Unknown'
  }

  returnToMaze(): void {
    this.showVictoryModal.set(false)
    this.itemDistribution.set(new Map()) // Clear distribution
    this.router.navigate(['/maze'])
  }

  returnToTemple(): void {
    // TODO: Change to navigate to castle instead
    this.showDefeatModal.set(false)
    this.router.navigate(['/temple'])
  }

  // Keyboard handling now delegated to MenuComponent via SceneFooterComponent
}
