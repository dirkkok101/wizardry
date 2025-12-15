# FlowController Migration Plan

## Executive Summary

This plan details the migration of the remaining FlowControllers (CombatFlowController, SpellFlowController, TileMessageController) to the pure services architecture. The target architecture consolidates all UI state into MazeStateStore and uses Orchestrators for async flow coordination.

## Current State Analysis

### Files to Migrate

| Controller | Lines | Status | Orchestrator Exists |
|------------|-------|--------|---------------------|
| CombatFlowController.ts | 505 | Has signals, callbacks | Yes (CombatOrchestrator) |
| SpellFlowController.ts | 548 | Has signals, callbacks | No |
| TileMessageController.ts | 244 | Has signals, callbacks | No |

### Key Finding: Signals Already in MazeStateStore

Analysis reveals that **MazeStateStore already contains all signals** from the FlowControllers:

**Combat Signals (already in MazeStateStore):**
- `combatPhase`, `combatLetterboxType`, `combatIntroActive`
- `selectedActions`, `isExecutingRound`, `selectedTargetGroupId`
- `isTargetingMode`, `targetingCharacterId`
- `showVictoryOverlay`, `showDefeatOverlay`, `victoryRewards`
- `showCinematicArena`, `arenaEvents`, `arenaAudit`
- `_pendingCombatResult` (private)

**Spell Signals (already in MazeStateStore):**
- `showSpellDialog`, `showTargetDialog`
- `selectedCaster`, `selectedSpell`
- `targetOptions`, `spellContext`, `pendingCombatSpell`

**Tile Message Signals (already in MazeStateStore):**
- `tileMessagePhase`, `tileMessageText`
- `tileMessageItem`, `tileMessageAutoDismiss`
- `pendingFixedEncounter`, `pendingConditionCallback`

### The Real Problem

The issue is **not** that signals need to be added to MazeStateStore - they already exist there. The problems are:

1. **MazeComponent has duplicate local signals** (lines 84-200 in maze.component.ts)
2. **FlowControllers still own duplicate signals** that shadow MazeStateStore
3. **Components inject FlowControllers** instead of MazeStateStore
4. **Callbacks pattern** still required for MazeComponent integration

---

## Migration Strategy

### Phase 1: TileMessageController Migration (Simplest)

**Estimated Complexity: Low**
**Risk Level: Low** (Simple state machine)

#### Step 1.1: Add Methods to MazeStateStore

TileMessageController is simple enough to absorb into MazeStateStore:

```typescript
// Add to MazeStateStore
handleTileMessageDismiss(): { encounter?: FixedEncounterConfig; callback?: () => void } {
  const phase = this.tileMessagePhase()
  const item = this.tileMessageItem()

  if (phase === 'message' && item) {
    this.tileMessagePhase.set('item_reward')
    return {}
  }

  return this.dismissTileMessage()
}

showConditionMessage(message: string, style: MessageStyle, onDismiss: () => void): void {
  if (style === 'letterbox') {
    this.showTileMessage(message, false, null, onDismiss)
  } else {
    this.addMessage(message)
    onDismiss()
  }
}

showMessageAsync(message: string): Promise<void> {
  return new Promise(resolve => {
    this.showTileMessage(message, false, null, resolve)
  })
}
```

#### Step 1.2: Update MazeComponent

- Remove `TileMessageController` injection
- Remove callback setup for `tileMsg.setCallbacks()`
- Use `stateStore` methods directly

#### Step 1.3: Delete TileMessageController

Delete `/home/user/wizardry/src/app/services/TileMessageController.ts`

---

### Phase 2: CombatFlowController Migration

**Estimated Complexity: Medium**
**Risk Level: Low** (CombatOrchestrator already exists)

#### Step 2.1: Add Methods to CombatOrchestrator

```typescript
// Add to CombatOrchestrator
onTargetSelected(groupId: 'A' | 'B' | 'C' | 'D'): void {
  const charId = this.stateStore.targetingCharacterId()
  if (!charId) return

  const pendingSpell = this.stateStore.pendingCombatSpell()
  if (pendingSpell) {
    this.confirmSpellTarget(charId, pendingSpell, groupId)
  } else {
    this.confirmAttackTarget(charId, groupId)
  }

  this.stateStore.cancelTargeting()
}

startAttackTargeting(characterId: string): void {
  this.stateStore.startTargeting(characterId)
  this.stateStore.addMessage('Select target group...')
}

selectParryAction(characterId: string): void {
  this.stateStore.selectAction(characterId, { type: 'parry' })
}

selectFleeForAll(): boolean {
  const party = this.getPartyCharacters()
  const alive = party.filter(c => !CharacterQueries.isIncapacitated(c))

  for (const char of alive) {
    this.stateStore.selectAction(char.id, { type: 'flee' })
  }
  return true
}

resetAllActions(): void {
  this.stateStore.resetCombatActions()
}
```

#### Step 2.2: Update MazeCombatComponent

```typescript
// Current
private combatFlow = inject(CombatFlowController)
readonly combatPhase = computed(() => this.combatFlow.combatPhase())

// Target
private stateStore = inject(MazeStateStore)
readonly combatPhase = computed(() => this.stateStore.combatPhase())
```

#### Step 2.3: Update MazeComponent

- Remove `CombatFlowController` injection
- Remove callback setup
- Use `combatOrch` and `stateStore` directly
- Remove duplicate combat signals

#### Step 2.4: Delete CombatFlowController

Delete `/home/user/wizardry/src/app/services/CombatFlowController.ts`

---

### Phase 3: SpellFlowController Migration

**Estimated Complexity: High**
**Risk Level: Medium** (Needs new SpellOrchestrator)

#### Step 3.1: Create SpellOrchestrator

**New file:** `/home/user/wizardry/src/app/services/SpellOrchestrator.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class SpellOrchestrator {
  private readonly stateStore = inject(MazeStateStore)
  private readonly gameState = inject(GameStateService)

  openDungeonSpellDialog(characterId: string): void {
    const char = this.getCharacter(characterId)
    if (!char || !SpellCastingService.hasSpellsInContext(char, 'dungeon')) {
      this.stateStore.addMessage(`${char?.name || 'Character'} has no spells available.`)
      return
    }
    this.stateStore.openSpellDialog(char, 'dungeon')
  }

  openCombatSpellDialog(characterId: string): void {
    const char = this.getCharacter(characterId)
    if (!char || !SpellCastingService.hasSpellsInContext(char, 'combat')) {
      this.stateStore.addMessage(`${char?.name || 'Character'} has no combat spells.`)
      return
    }
    this.stateStore.openSpellDialog(char, 'combat')
  }

  onSpellSelected(spell: SpellData): void {
    const caster = this.stateStore.selectedCaster()
    const context = this.stateStore.spellContext()

    this.stateStore.setSelectedSpell(spell)

    if (context === 'combat') {
      this.handleCombatSpellSelection(spell, caster)
    } else {
      this.handleDungeonSpellSelection(spell, caster)
    }
  }

  onTargetSelected(target: Character): void {
    const spell = this.stateStore.selectedSpell()
    const caster = this.stateStore.selectedCaster()
    const context = this.stateStore.spellContext()

    if (!spell || !caster) return

    this.stateStore.closeTargetDialog()

    if (context === 'dungeon') {
      this.castDungeonSpell(spell, caster, target)
    } else {
      this.confirmCombatSpellAction(caster, spell, target.id)
    }
  }

  cancel(): void {
    this.stateStore.resetSpellState()
  }

  // ... private helper methods
}
```

#### Step 3.2: Update MazeComponent

- Remove `SpellFlowController` injection
- Add `SpellOrchestrator` injection
- Remove callback setup
- Use `spellOrch` and `stateStore` directly

#### Step 3.3: Delete SpellFlowController

Delete `/home/user/wizardry/src/app/services/SpellFlowController.ts`

---

## Migration Order

| Phase | Controller | Est. Work | Reason |
|-------|------------|-----------|--------|
| 1 | TileMessageController | 1-2 hours | Simplest, builds confidence |
| 2 | CombatFlowController | 2-3 hours | Orchestrator exists |
| 3 | SpellFlowController | 3-4 hours | Needs new orchestrator |

---

## Detailed Task Checklist

### Phase 1: TileMessageController
- [ ] Add `handleTileMessageDismiss()` to MazeStateStore
- [ ] Add `showConditionMessage()` to MazeStateStore
- [ ] Add `showMessageAsync()` to MazeStateStore
- [ ] Update MazeComponent tile message handlers
- [ ] Remove TileMessageController injection
- [ ] Remove TileMessageController callbacks setup
- [ ] Delete TileMessageController.ts
- [ ] Verify build compiles
- [ ] Test tile messages in maze

### Phase 2: CombatFlowController
- [ ] Add `startAttackTargeting()` to CombatOrchestrator
- [ ] Add `onTargetSelected()` to CombatOrchestrator
- [ ] Add `selectParryAction()` to CombatOrchestrator
- [ ] Add `selectFleeForAll()` to CombatOrchestrator
- [ ] Add `resetAllActions()` to CombatOrchestrator
- [ ] Add combat footer menu methods to CombatOrchestrator
- [ ] Update MazeCombatComponent to use MazeStateStore
- [ ] Update MazeComponent combat handlers
- [ ] Remove CombatFlowController injection
- [ ] Remove CombatFlowController callbacks setup
- [ ] Delete CombatFlowController.ts
- [ ] Verify build compiles
- [ ] Test combat flow end-to-end

### Phase 3: SpellFlowController
- [ ] Create SpellOrchestrator service file
- [ ] Implement `openDungeonSpellDialog()`
- [ ] Implement `openCombatSpellDialog()`
- [ ] Implement `onSpellSelected()`
- [ ] Implement `onTargetSelected()`
- [ ] Implement `cancel()`
- [ ] Implement dungeon spell casting logic
- [ ] Implement combat spell selection logic
- [ ] Update MazeComponent spell handlers
- [ ] Remove SpellFlowController injection
- [ ] Remove SpellFlowController callbacks setup
- [ ] Delete SpellFlowController.ts
- [ ] Verify build compiles
- [ ] Test dungeon spells
- [ ] Test combat spells

---

## Files Summary

### Files to Create
- `/home/user/wizardry/src/app/services/SpellOrchestrator.ts`

### Files to Modify
- `/home/user/wizardry/src/app/services/MazeStateStore.ts` - Add tile message methods
- `/home/user/wizardry/src/app/services/CombatOrchestrator.ts` - Add targeting/action methods
- `/home/user/wizardry/src/app/scenes/maze/maze.component.ts` - Remove injections, use orchestrators
- `/home/user/wizardry/src/app/scenes/maze/maze-combat/maze-combat.component.ts` - Use MazeStateStore

### Files to Delete
- `/home/user/wizardry/src/app/services/TileMessageController.ts`
- `/home/user/wizardry/src/app/services/CombatFlowController.ts`
- `/home/user/wizardry/src/app/services/SpellFlowController.ts`

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Combat arena timing breaks | High | CombatOrchestrator already handles this correctly |
| Spell targeting state corruption | Medium | Explicit state reset on cancel |
| Tile message callback lost | Low | MazeStateStore already stores callbacks |
| Tests fail | Medium | Run tests after each phase |

---

## Verification

After each phase:
1. `npx tsc --noEmit` - No compile errors
2. `npm test` - All tests pass
3. Manual testing of affected flow
4. No console errors during gameplay

Final verification:
- All three FlowControllers deleted
- No `setCallbacks()` pattern remaining
- All signals read from MazeStateStore
- MazeComponent significantly smaller
