# MazeComponent Decomposition Plan

## Current State Analysis

| Metric | Current | Target | Reduction |
|--------|---------|--------|-----------|
| Lines | 3,480 | ~1,200 | -66% |
| Signals/Computed | 81 | ~25 | -69% |
| Methods | ~80 | ~20 | -75% |
| God-Class Methods | 9 (950+ lines) | 0 | -100% |

## God-Class Methods Identified

| Method | Lines | Problem |
|--------|-------|---------|
| `castSpell()` | 330+ | 6+ spell types, death handling, combat/dungeon context |
| `executeMovement()` | 200+ | Duplicates MovementOrchestrationService |
| `applyVictoryRewards()` | 100+ | XP, gold, items, leveling all in one |
| `handleChestKeyboard()` | 70+ | 7 phase contexts |
| `confirmCombatSpellActionForAlly()` | 140+ | Combat spell logic |

## Refactoring Phases

### Phase 1: Remove Duplication (Immediate)

**1.1 Delete Duplicate Chest Signals**
- Component has 18 chest signals duplicating ChestFlowController
- Action: Make MazeComponent use chestFlow signals directly via computed forwards
- Lines saved: ~50

**1.2 Remove Old Movement Implementation**
- `executeMovement()` duplicates `MovementOrchestrationService`
- Action: Delete method, delegate to service
- Lines saved: ~200

### Phase 2: Extract Spell Casting (High Priority)

**2.1 Create SpellCastingFlowController**
```typescript
@Injectable({ providedIn: 'root' })
export class SpellCastingFlowController {
  // Signals
  readonly showSpellDialog = signal(false)
  readonly showTargetDialog = signal(false)
  readonly selectedCaster = signal<Character | null>(null)
  readonly selectedSpell = signal<Spell | null>(null)
  readonly spellContext = signal<'dungeon' | 'combat'>('dungeon')

  // Methods
  openSpellDialog(casterId: string, context: 'dungeon' | 'combat'): void
  selectSpell(spell: Spell): void
  selectTarget(targetId: string): void
  castSpell(): CastResult
  cancel(): void
}
```
- Extract from: `castSpell()`, `openSpellDialog()`, `onSpellSelected()`, `handleCombatSpellSelection()`, `confirmCombatSpellActionForAlly()`
- Lines saved: ~400

### Phase 3: Extract Combat Flow (High Priority)

**3.1 Expand CombatFlowController**
- Already have `CombatOrchestrationService` but component manages UI state
- Move combat signals to controller:
  - `combatPhase`, `selectedActions`, `isExecutingRound`
  - `isTargetingMode`, `selectedTargetGroupId`
- Lines saved: ~200

### Phase 4: Create Input Router (Medium Priority)

**4.1 Create InputRoutingService**
```typescript
@Injectable({ providedIn: 'root' })
export class MazeInputRouter {
  handleKeyboardEvent(event: KeyboardEvent, context: MazeContext): boolean
  handleEscape(context: MazeContext): boolean
  isDialogOpen(): boolean
}
```
- Replaces: `handleKeyboardEvent()`, `handleEscape()`, `isDialogOpen()`
- Lines saved: ~80

### Phase 5: Extract Components (Medium Priority)

**5.1 MazeFooterComponent**
- Owns footer menu computation
- Input: `context` (exploration | combat | targeting | chest)
- Removes 4 computed properties from MazeComponent

**5.2 MazeSpellDialogComponent**
- Owns spell dialog + target dialog
- Removes dialog management from parent

## Recommended Order of Execution

### Sprint 1: Low-Hanging Fruit
1. ✅ ChestFlowController extraction (DONE)
2. Delete duplicate chest signals
3. Remove executeMovement duplication

### Sprint 2: Spell Casting
4. Create SpellCastingFlowController
5. Move spell signals and methods
6. Update template bindings

### Sprint 3: Combat Flow
7. Expand CombatFlowController with UI state
8. Move combat signals and methods
9. Update template bindings

### Sprint 4: Polish
10. Create InputRoutingService
11. Extract footer component
12. Extract spell dialog component

## Success Criteria

After refactoring:
- MazeComponent < 1,200 lines
- No method > 50 lines
- Single responsibility per controller
- Template binds to max 25 properties
- All orchestration via injected services

## Architecture After Refactoring

```
MazeComponent (thin orchestrator)
├── ChestFlowController (owns chest UI state)
├── SpellCastingFlowController (owns spell UI state)
├── CombatFlowController (owns combat UI state)
├── MovementOrchestrationService (movement logic)
├── MazeStateMachine (state transitions)
└── MazeInputRouter (keyboard handling)
```
