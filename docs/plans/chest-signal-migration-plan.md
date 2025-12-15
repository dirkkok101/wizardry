# Chest Signal Migration Plan

## Executive Summary

This document analyzes the chest-related signals in MazeComponent and plans their migration to MazeStateMachine. The state machine already has comprehensive chest support, but there are phase naming mismatches and missing transitions that need to be addressed.

---

## Current State Analysis

### MazeComponent Chest Signals (15 signals)

| Signal | Type | Purpose |
|--------|------|---------|
| `chestPhase` | `ChestPhase` | UI interaction phase |
| `chestLetterboxType` | `ChestLetterboxType` | Banner type for dramatic reveals |
| `pendingChest` | `Chest \| null` | The chest being interacted with |
| `chestSprite` | `'closed' \| 'open'` | Sprite display state |
| `chestOpener` | `Character \| null` | Selected handler character |
| `chestCaster` | `Character \| null` | Selected CALFO caster |
| `scrambledTrapState` | `ScrambledTrapState \| null` | Trap puzzle letter state |
| `chestTrapInput` | `string` | User's trap name guess |
| `chestSummary` | `ChestSummary \| null` | Opening results |
| `chestLastMessage` | `string` | Status message |
| `chestInventoryWarning` | `string \| null` | Full inventory warning |
| `preSelectedRecipient` | `Character \| null` | Pre-selected item recipient |
| `pendingTrapInfo` | `TrapInfo \| null` | Trap effect details |
| `trapLetterboxName` | `string` | Trap name for letterbox |
| `hitCharacterIds` | `string[]` | Characters affected by trap |

### MazeStateMachine ChestPhaseState (Already Defined)

```typescript
export interface ChestPhaseState {
  type: 'chest'
  subPhase: ChestSubPhase
  chest: Chest
  letterboxType: ChestLetterboxType
  selectedHandler: Character | null      // = chestOpener
  calfoCharacter: Character | null       // = chestCaster
  scrambledTrapState: ScrambledTrapState | null
  trapInput: string                       // = chestTrapInput
  trapIdentified: boolean
  trapLetterboxName: string
  hitCharacterIds: string[]
  pendingTrapInfo: TrapTriggerInfo | null
  currentDamageIndicator: DamageIndicator | null
  chestSprite: 'closed' | 'open'
  summary: ChestSummary | null           // = chestSummary
  lastMessage: string                     // = chestLastMessage
  inventoryWarning: string | null        // = chestInventoryWarning
  preSelectedRecipient: Character | null
}
```

### Existing State Machine Transition Methods

| Method | Purpose |
|--------|---------|
| `startChestInteraction(chest)` | Initialize chest state |
| `dismissChestLetterbox()` | Clear letterbox → handler_select |
| `selectChestHandler(character)` | Select handler → action_select |
| `showTrapInspection(scrambled, identified)` | Show trap puzzle → trap_inspect |
| `updateTrapInput(input)` | Update trap guess |
| `showTrapTriggered(trapInfo, trapName)` | Trap activated → trap_triggered |
| `showDamageIndicator(indicator)` | Show damage animation |
| `openChest(summary)` | Open chest → contents_reveal |
| `showInventoryWarning(warning)` | Set inventory warning |
| `preSelectRecipient(character)` | Pre-select item recipient |
| `updateChest(updates)` | Update chest (disarm, etc.) |
| `setChestMessage(message)` | Set status message |
| `endChestInteraction()` | Return to exploration |

---

## Gap Analysis

### 1. Phase Naming Mismatch

**MazeComponent ChestPhase** (from chest-overlay.component.ts):
```
idle → reveal → action_select → caster_select → trap_display → trap_input →
inventory_warning → trap_triggered → opening → result
```

**MazeStateMachine ChestSubPhase**:
```
discovered → handler_select → action_select → trap_inspect → trap_disarm →
trap_triggered → opening → contents_reveal → item_distribution
```

**Mapping Table:**

| MazeComponent | MazeStateMachine | Notes |
|---------------|------------------|-------|
| `idle` | (no chest state) | State machine uses `exploration` phase |
| `reveal` | `discovered` | Initial chest found letterbox |
| `action_select` | `action_select` | ✅ Match |
| `caster_select` | - | **MISSING** - Need to add |
| `trap_display` | `trap_inspect` | Different name |
| `trap_input` | `trap_disarm` | Different name |
| `inventory_warning` | - | **MISSING** - Need subPhase or flag |
| `trap_triggered` | `trap_triggered` | ✅ Match |
| `opening` | `opening` | ✅ Match |
| `result` | `contents_reveal` | Different name |

### 2. Missing State Machine Functionality

1. **`caster_select` subPhase**: When player chooses CALFO, need to show caster selection
2. **`inventory_warning` handling**: Currently a flag, but MazeComponent treats as a phase
3. **`selectCalfoCaster(character)` method**: Need dedicated transition for CALFO caster

### 3. Computed Signals That Read Chest State

| Computed | Reads | Migration Impact |
|----------|-------|------------------|
| `showChestOverlay` | `chestPhase` | Can use `mazeStateMachine.showChestOverlay` |
| `chestInspectChance` | `chestOpener` | Needs state machine accessor |
| `chestDisarmChance` | `chestOpener` | Needs state machine accessor |
| `chestFooterMenuItems` | `chestPhase`, multiple signals | Complex - reads many signals |
| `chestLeaveMenuItem` | `chestPhase` | Simple phase check |
| `availableChestCharacters` | party state | No chest signal dependency |
| `calfoEligibleCasters` | party state | No chest signal dependency |

---

## Migration Strategy

### Phase A: Extend State Machine (Low Risk)

Add missing functionality to MazeStateMachine:

1. **Add `caster_select` to ChestSubPhase**:
   ```typescript
   export type ChestSubPhase =
     | 'discovered'
     | 'handler_select'
     | 'action_select'
     | 'caster_select'      // NEW
     | 'trap_inspect'
     | 'trap_disarm'
     | 'trap_triggered'
     | 'opening'
     | 'contents_reveal'
     | 'item_distribution'
   ```

2. **Add transition methods**:
   ```typescript
   // Transition to caster selection for CALFO
   showCasterSelect(): void

   // Select CALFO caster
   selectCalfoCaster(character: Character): void

   // Transition to trap disarm input
   showTrapDisarmInput(): void
   ```

3. **Add computed accessors**:
   ```typescript
   readonly chestHandler = computed(() => ...)
   readonly chestCaster = computed(() => ...)
   readonly currentChest = computed(() => ...)
   ```

### Phase B: Parallel Operation (Medium Risk)

Add state machine calls alongside local signals (same pattern as combat):

**Target Methods:**
- `initChestFromCombat()` - Call `startChestInteraction()`
- `onChestCharacterSelected()` - Call `selectChestHandler()`
- `handleChestInspect()` - Call `showTrapInspection()`
- `handleChestCalfo()` - Call `showCasterSelect()`
- `castChestCalfo()` - Call `selectCalfoCaster()`
- `handleChestDisarm()` - Call `showTrapDisarmInput()`
- `submitChestTrapName()` - Call `updateTrapInput()`
- `triggerTrap()` - Call `showTrapTriggered()`
- `openChest()` - Call `openChest()`
- `handleChestLeave()` - Call `endChestInteraction()`

### Phase C: UI Signal Migration (Medium Risk)

Update computed signals to read from state machine:

```typescript
// Before
readonly showChestOverlay = computed(() => this.chestPhase() !== 'idle');

// After
readonly showChestOverlay = computed(() =>
  this.mazeStateMachine.state().type === 'chest'
);
// Or use: this.mazeStateMachine.showChestOverlay()
```

### Phase D: Cleanup (High Risk - Deferred)

Remove local signals once state machine is fully integrated. This is a breaking change and should be deferred until all consumers are migrated.

---

## Implementation Tasks

### Task List

| # | Task | Risk | Estimate |
|---|------|------|----------|
| A1 | Add `caster_select` to ChestSubPhase enum | Low | 5 min |
| A2 | Add `showCasterSelect()` transition method | Low | 10 min |
| A3 | Add `selectCalfoCaster()` transition method | Low | 10 min |
| A4 | Add `showTrapDisarmInput()` transition method | Low | 10 min |
| A5 | Add computed accessors for handler/caster/chest | Low | 15 min |
| B1 | Update `initChestFromCombat()` for state machine | Medium | 15 min |
| B2 | Update chest character selection methods | Medium | 15 min |
| B3 | Update trap inspection flow | Medium | 20 min |
| B4 | Update CALFO casting flow | Medium | 20 min |
| B5 | Update disarm flow | Medium | 20 min |
| B6 | Update chest opening flow | Medium | 15 min |
| B7 | Update chest leave/cleanup | Medium | 10 min |
| C1 | Migrate `showChestOverlay` computed | Low | 5 min |
| C2 | Migrate footer menu computeds | Medium | 30 min |

**Total Estimate:** ~3-4 hours

---

## Decision Points

### Q1: Should we add `caster_select` subPhase or handle differently?

**Option A:** Add `caster_select` subPhase (recommended)
- Pro: Clean phase transitions, matches component pattern
- Con: More state machine complexity

**Option B:** Use flag within `action_select`
- Pro: Simpler state machine
- Con: UI logic becomes more complex

**Recommendation:** Option A - The state machine is already comprehensive, adding one more subPhase keeps the pattern consistent.

### Q2: How to handle `inventory_warning`?

**Option A:** Add as subPhase
- Pro: Explicit phase transition
- Con: Adds to phase count

**Option B:** Keep as flag within `contents_reveal`
- Pro: Already supported in state machine
- Con: Phase doesn't change, just flag

**Recommendation:** Option B - The state machine already has `inventoryWarning` field. The MazeComponent can check this flag to show warning UI.

### Q3: Should we unify phase naming?

**Option A:** Keep both naming conventions
- Pro: No changes to ChestOverlayComponent
- Con: Confusing dual naming

**Option B:** Create mapping layer
- Pro: Clean separation
- Con: Extra complexity

**Option C:** Update ChestOverlayComponent to use state machine types
- Pro: Single source of truth
- Con: Breaking change to component interface

**Recommendation:** Option B for now - Create mapping in MazeComponent during parallel operation. Consider Option C in a future cleanup phase.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Phase mismatch causes UI bugs | High | Thorough testing of all chest interactions |
| State machine transitions don't match component flow | Medium | Map out all flows before implementation |
| Computed signals return wrong values | Medium | Unit test all computed signals |
| ChestOverlayComponent stops working | High | Keep local signals during parallel operation |

---

## Appendix: Chest Flow Diagrams

### Normal Chest Opening Flow
```
Exploration → [find chest] → discovered/reveal → handler_select → action_select
  → opening → contents_reveal/result → Exploration
```

### Trapped Chest Flow
```
action_select → [inspect] → trap_inspect/trap_display → action_select
  → [disarm] → trap_disarm/trap_input → [success] → action_select
  → [open] → opening → contents_reveal/result
```

### CALFO Flow
```
action_select → [calfo] → caster_select → [cast] → trap_inspect/trap_display
  → action_select
```

### Trap Triggered Flow
```
opening → trap_triggered → [animation] → contents_reveal/result
```
