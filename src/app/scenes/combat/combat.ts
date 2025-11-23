// src/app/scenes/combat/combat.ts
import { Component, computed, signal, OnInit, HostListener } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../../services/GameStateService'
import { CombatService } from '../../../services/CombatService'
import { SpellCastingService } from '../../../services/SpellCastingService'
import { VictoryService, VictoryRewards } from '../../../services/VictoryService'
import { SceneType } from '../../../types/SceneType'
import { CombatState, CombatCommand, Combatant, CombatActionType } from '../../../types/Combat'
import { Character } from '../../../types/Character'

interface SelectedAction {
  characterId: string
  command: CombatCommand
}

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combat.html',
  styleUrls: ['./combat.scss']
})
export class CombatComponent implements OnInit {
  // Computed from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly party = computed(() => this.gameState.state().party)
  readonly roster = computed(() => this.gameState.state().roster)

  // Local UI state
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())
  readonly isExecutingRound = signal<boolean>(false)
  readonly showVictoryModal = signal<boolean>(false)
  readonly victoryRewards = signal<VictoryRewards | null>(null)
  readonly showDefeatModal = signal<boolean>(false)
  readonly activeCharacterIndex = signal<number>(0)
  readonly selectedActionType = signal<CombatActionType | null>(null)
  readonly showSpellMenu = signal<boolean>(false)
  readonly showTargetSelection = signal<boolean>(false)

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

  // Available spells for active character
  readonly availableSpells = computed(() => {
    const char = this.activeCharacter()
    if (!char || !char.spellPoints) return []

    // Get all spell IDs that the character can cast
    const spells: string[] = []

    // Check mage spells
    if (char.spellPoints.mage) {
      for (let level = 1; level <= 7; level++) {
        const levelKey = `level${level}` as keyof typeof char.spellPoints.mage
        const points = char.spellPoints.mage[levelKey]
        if (points && points.current > 0) {
          // Add spell IDs for this level (simplified - in real game would lookup spell list)
          // For now, just indicate which levels are available
          spells.push(`Mage Level ${level}`)
        }
      }
    }

    // Check priest spells
    if (char.spellPoints.priest) {
      for (let level = 1; level <= 7; level++) {
        const levelKey = `level${level}` as keyof typeof char.spellPoints.priest
        const points = char.spellPoints.priest[levelKey]
        if (points && points.current > 0) {
          spells.push(`Priest Level ${level}`)
        }
      }
    }

    return spells
  })

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

  selectActionType(actionType: CombatActionType): void {
    // If ATTACK, PARRY, or FLEE - show target selection
    if (actionType === 'ATTACK' || actionType === 'FLEE') {
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
    // After selecting spell, show target selection
    this.showSpellMenu.set(false)
    this.showTargetSelection.set(true)
    // Store spell ID in action type for later
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

    // Update selected actions (immutable)
    this.selectedActions.update(actions => {
      const newActions = new Map(actions)
      newActions.set(character.id, command)
      return newActions
    })

    // Reset UI state
    this.selectedActionType.set(null)
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

    // Create monster commands using AI
    const aliveMonsters = CombatService.getAllAliveMonsters(combat)
    const frontRow = this.party().formation.frontRow
    const monsterCommands = aliveMonsters.map(m =>
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

    // Distribute rewards to roster (only living characters get XP)
    const newRoster = VictoryService.distributeRewards(
      roster,
      partyMembers,
      rewards.xpPerCharacter
    )

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

  returnToMaze(): void {
    this.showVictoryModal.set(false)
    this.router.navigate(['/maze'])
  }

  returnToTemple(): void {
    // TODO: Change to navigate to castle instead
    this.showDefeatModal.set(false)
    this.router.navigate(['/temple'])
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    const key = event.key.toLowerCase()

    // Victory modal - Enter to return
    if (this.showVictoryModal() && key === 'enter') {
      this.returnToMaze()
      event.preventDefault()
      return
    }

    // Defeat modal - Enter to go to temple
    if (this.showDefeatModal() && key === 'enter') {
      this.returnToTemple()
      event.preventDefault()
      return
    }

    // Execute round - Enter when all actions selected
    if (key === 'enter' && this.allActionsSelected() && !this.isExecutingRound()) {
      this.executeRound()
      event.preventDefault()
      return
    }
  }
}
