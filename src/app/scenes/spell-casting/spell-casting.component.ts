import { Component, OnInit, computed, signal, HostListener } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router, ActivatedRoute } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { GameStateService } from '@services/GameStateService'
import { SpellCastingService, SpellData } from '@services/SpellCastingService'
import { SpellTargetingService } from '@services/SpellTargetingService'
import { GameStateQueries } from '@utils/GameStateQueries'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { SpellEffect } from '@models/Combat'
import { SpellPanelComponent } from '@shared/components/spell-panel/spell-panel.component'
import {
  CharacterSelectionDialogComponent,
  CharacterOption
} from '@shared/components/character-selection-dialog/character-selection-dialog.component'

type CastingPhase = 'selecting-spell' | 'selecting-target'

/**
 * SpellCastingComponent - Dungeon spell casting scene
 *
 * Handles the complete spell casting flow for dungeon exploration:
 * 1. Show spell selection dialog with dungeon-appropriate spells
 * 2. Show target selection if spell requires a target
 * 3. Execute spell and apply effects to game state
 * 4. Return to maze (message displayed via pendingSpellMessage)
 *
 * Uses SpellPanelComponent for spell selection and CharacterSelectionDialogComponent for targeting.
 * Delegates to SpellCastingService.applyDungeonUtilitySpell() for utility spells.
 */
@Component({
  selector: 'app-spell-casting',
  standalone: true,
  imports: [
    CommonModule,
    SpellPanelComponent,
    CharacterSelectionDialogComponent
  ],
  templateUrl: './spell-casting.component.html',
  styleUrls: ['./spell-casting.component.scss']
})
export class SpellCastingComponent implements OnInit {
  private readonly queryParams

  // View state
  readonly phase = signal<CastingPhase>('selecting-spell')
  readonly selectedSpell = signal<SpellData | null>(null)

  // From query params
  readonly characterId = computed(() =>
    this.queryParams()?.['characterId'] || null
  )

  readonly returnTo = computed(() =>
    this.queryParams()?.['returnTo'] || 'maze'
  )

  // Derived state - the caster character
  readonly caster = computed(() => {
    const id = this.characterId()
    if (!id) return null
    return this.gameState.state().roster.get(id) || null
  })

  // Build target options based on selected spell's target type
  // Uses SpellTargetingService for all filtering logic (clean architecture)
  readonly targetOptions = computed((): CharacterOption[] => {
    const spell = this.selectedSpell()
    if (!spell) return []

    const party = GameStateQueries.partyCharacters(this.gameState.state())

    // Use service for eligibility filtering (who CAN be shown)
    const eligible = SpellTargetingService.getEligibleCharacterTargets(spell, party)

    return eligible.map((char, index) => ({
      character: char,
      index: index + 1,
      // Use service for validity check (is Select button enabled)
      enabled: SpellTargetingService.isValidCharacterTarget(spell, char)
    }))
  })

  // Dynamic prompt for target selection based on spell type
  // Uses SpellTargetingService for prompt logic (clean architecture)
  readonly targetPrompt = computed(() => {
    const spell = this.selectedSpell()
    if (!spell) return 'SELECT TARGET'
    return SpellTargetingService.getTargetingPrompt(spell)
  })

  constructor(
    private readonly gameState: GameStateService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.queryParams = toSignal(this.route.queryParams)
  }

  ngOnInit(): void {
    // Spell casting is a sub-scene of maze, keep the current scene as MAZE
    // This maintains proper navigation state for returning to maze
  }

  /**
   * Handle ESC key to return/cancel at any phase
   */
  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.phase() === 'selecting-target') {
      // Go back to spell selection
      this.cancelTargetSelection()
    } else {
      // Return to maze
      this.returnToPrevious()
    }
  }

  /**
   * Handle spell selection from dialog
   * Uses SpellTargetingService to determine targeting mode and validate targets
   */
  onSpellSelected(spell: SpellData): void {
    this.selectedSpell.set(spell)

    // Use service to determine targeting mode
    const mode = SpellTargetingService.getTargetingMode(spell)

    if (mode === 'character') {
      // Check if there are valid targets using service
      const party = GameStateQueries.partyCharacters(this.gameState.state())
      const validTargets = SpellTargetingService.getValidCharacterTargets(spell, party)

      if (validTargets.length === 0) {
        // No valid targets - get helpful message from service
        const message = SpellTargetingService.getNoValidTargetsMessage(spell)
        this.storeMessageAndReturn(message)
        return
      }
      this.phase.set('selecting-target')
    } else {
      // No selection needed (self/party/all_allies) - cast immediately
      this.executeSpell(this.getTargetsForSpell(spell))
    }
  }

  /**
   * Handle target selection from dialog
   */
  onTargetSelected(target: Character): void {
    this.executeSpell([target])
  }

  /**
   * Cancel target selection and go back to spell selection
   */
  cancelTargetSelection(): void {
    this.selectedSpell.set(null)
    this.phase.set('selecting-spell')
  }

  /**
   * Return to previous scene (maze)
   */
  returnToPrevious(): void {
    const destination = this.returnTo()
    if (destination === 'maze') {
      this.router.navigate(['/maze'])
    } else {
      this.router.navigate([`/${destination}`])
    }
  }

  /**
   * Execute the spell on the given targets
   */
  private executeSpell(targets: Character[]): void {
    const caster = this.caster()
    const spell = this.selectedSpell()

    if (!caster || !spell) {
      this.returnToPrevious()
      return
    }

    const state = this.gameState.state()
    const dungeon = state.dungeon

    // Handle utility spells (MILWA, DUMAPIC, LATUMAPIC, etc.)
    if (SpellCastingService.isDungeonUtilitySpell(spell)) {
      if (!dungeon) {
        this.returnToPrevious()
        return
      }

      // Apply via service (clean architecture - logic in service, not component)
      const result = SpellCastingService.applyDungeonUtilitySpell(spell, caster, dungeon)

      // Update game state
      this.gameState.updateState(s => {
        const updatedCaster = SpellCastingService.deductSpellPoints(caster, spell.id)
        const newRoster = new Map(s.roster)
        newRoster.set(caster.id, updatedCaster)

        return {
          ...s,
          roster: newRoster,
          dungeon: s.dungeon ? {
            ...s.dungeon,
            ...(result.dungeonUpdate || {}),
            pendingSpellMessage: result.message
          } : undefined
        }
      })

      // Handle navigation (LOKTOFEIT recall navigates to castle)
      if (result.navigateTo) {
        this.router.navigate([result.navigateTo])
      } else {
        this.returnToPrevious()
      }
      return
    }

    // Handle other spells (healing, resurrection, etc.)
    const spellContext = SpellCastingService.mapUIContextToSpellContext('dungeon')
    const effect = SpellCastingService.resolveSpellEffect(
      spell.id,
      caster,
      targets.map(t => ({ ...t, isMonster: false })),
      spellContext
    )

    // Build message using original format
    const message = this.buildSpellMessage(caster, spell, targets, effect)

    // Apply effects and store pending message
    this.gameState.updateState(s => {
      const newState = SpellCastingService.applySpellEffectToGameState(
        effect, caster, spell, targets, s
      )
      return {
        ...newState,
        dungeon: newState.dungeon ? {
          ...newState.dungeon,
          pendingSpellMessage: message
        } : undefined
      }
    })

    // Return immediately - no overlay
    this.returnToPrevious()
  }

  /**
   * Store a message and return to maze
   */
  private storeMessageAndReturn(message: string): void {
    this.gameState.updateState(s => ({
      ...s,
      dungeon: s.dungeon ? {
        ...s.dungeon,
        pendingSpellMessage: message
      } : undefined
    }))
    this.returnToPrevious()
  }

  /**
   * Get targets for spells that don't need target selection
   */
  private getTargetsForSpell(spell: SpellData): Character[] {
    const caster = this.caster()
    if (!caster) return []

    const party = GameStateQueries.partyCharacters(this.gameState.state())

    switch (spell.target) {
      case 'self':
        return [caster]
      case 'party':
      case 'all_allies':
        // All living party members
        return party.filter(c =>
          c.status !== CharacterStatus.DEAD &&
          c.status !== CharacterStatus.ASHES &&
          c.status !== CharacterStatus.LOST
        )
      default:
        return []
    }
  }

  /**
   * Build message for non-utility spells (healing, resurrection, status cures)
   */
  private buildSpellMessage(
    caster: Character,
    spell: SpellData,
    targets: Character[],
    effect: SpellEffect
  ): string {
    const spellName = spell.name

    // Healing
    if (effect.healing?.length) {
      const healAmount = effect.healing.reduce((sum, h) => sum + h, 0)
      if (targets.length === 1) {
        return `${caster.name} casts ${spellName}! ${targets[0].name} heals ${healAmount} HP.`
      }
      return `${caster.name} casts ${spellName}! The party heals ${healAmount} HP.`
    }

    // Full heal (MADI)
    if (effect.fullHeal?.length) {
      return `${caster.name} casts ${spellName}! ${targets[0].name} is fully healed!`
    }

    // Status cure
    if (effect.statusCures) {
      return `${caster.name} casts ${spellName}! ${targets[0].name}'s ailment is cured!`
    }

    // Resurrection
    if (effect.resurrection?.length) {
      const res = effect.resurrection[0]
      if (res.success) {
        return `${caster.name} casts ${spellName}! ${targets[0].name} is resurrected!`
      } else if (res.resultStatus === 'ASHES') {
        return `${caster.name} casts ${spellName}... ${targets[0].name} crumbles to ashes.`
      }
      return `${caster.name} casts ${spellName}... ${targets[0].name} is lost forever.`
    }

    return `${caster.name} casts ${spellName}!`
  }
}
