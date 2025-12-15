# Maze Scene Split Plan

## Overview

Refactor the 4,119-line MazeComponent god class into 5-6 focused scene components, each handling a specific game state. All scenes share the same 3-column layout and use MazeStateStore for shared state.

## Current State

```
MazeComponent (4,119 lines)
├── Navigation state (movement, inspection, camping)
├── Combat action selection state
├── Combat playback state (cinematic arena)
├── Victory state
├── Defeat state
├── Chest interaction state
└── 44 duplicate signals (vs MazeStateStore)
```

## Target State

```
scenes/maze/
├── maze-layout/
│   └── maze-layout.component.ts       # Shared 3-column layout
├── maze-navigation/
│   └── maze-navigation.component.ts   # ~600 lines - movement, inspection
├── combat-action/
│   └── combat-action.component.ts     # ~600 lines - round selection
├── combat-playback/
│   └── combat-playback.component.ts   # ~400 lines - cinematic arena
├── combat-victory/
│   └── combat-victory.component.ts    # ~200 lines - rewards display
├── combat-defeat/
│   └── combat-defeat.component.ts     # ~200 lines - defeat handling
├── chest-interaction/
│   └── chest-interaction.component.ts # ~500 lines - chest UI
└── shared/
    ├── maze-canvas/                   # Already exists
    ├── maze-combat/                   # Already exists
    └── maze-chest/                    # Already exists
```

## Shared Layout Component

### MazeLayoutComponent

```
+--------------------------------------------------+
| Header (SceneTitle)                              |
+--------------------------------------------------+
|  Left Panel  |    Center Area     | Right Panel  |
|  (Chars 1-3) |    (Canvas/Arena)  | (Chars 4-6)  |
|              |    (Message Log)   |              |
+--------------------------------------------------+
| Footer Menu                                      |
+--------------------------------------------------+
```

**Props:**
- `headerTitle: string`
- `footerMenuItems: MenuItem[]`
- `showCanvas: boolean` (default: true)
- `centerContent: TemplateRef` (for custom content like arena)
- `onFooterAction: EventEmitter<string>`

**Slots:**
- `<ng-content select="[mazeCenterOverlay]">` - For overlays on canvas
- `<ng-content select="[mazeFooterExtra]">` - For extra footer content

## Scene Routing

```typescript
// app.routes.ts
{
  path: 'maze',
  children: [
    { path: '', component: MazeNavigationComponent },
    { path: 'combat', component: CombatActionComponent },
    { path: 'combat/playback', component: CombatPlaybackComponent },
    { path: 'combat/victory', component: CombatVictoryComponent },
    { path: 'combat/defeat', component: CombatDefeatComponent },
    { path: 'chest', component: ChestInteractionComponent }
  ]
}
```

## State Flow

```
MazeStateStore (Single Source of Truth)
    ↓
Router Navigation (State Machine)
    ↓
Scene Components (Pure Presenters)
    ↓
Sub-components (CharacterPanel, MessageLog, etc.)
```

### Scene Transitions

```
Navigation → Combat (encounter triggered)
           → Chest (chest found)

Combat → Playback (round execution)
       → Victory (all monsters dead)
       → Defeat (party wiped)
       → Navigation (fled successfully)

Playback → Combat (next round)
         → Victory
         → Defeat

Victory → Navigation (continue exploring)
        → Chest (loot from combat)
        → Castle (retreat)

Defeat → Castle (party returns)

Chest → Navigation (leave chest)
      → Combat (alarm trap)
```

## Migration Order

### Phase 1: Shared Layout
1. Create `MazeLayoutComponent` with 3-column structure
2. Make it accept content projections for overlays
3. Test with current MazeComponent using the layout

### Phase 2: Chest Scene (Simplest)
1. Create `ChestInteractionComponent`
2. Move chest-related code from MazeComponent
3. Use existing `ChestOrchestrator` and `MazeStateStore`
4. Update routing to navigate to /maze/chest when chest found

### Phase 3: Combat Scenes
1. Create `CombatActionComponent` (action selection)
2. Create `CombatPlaybackComponent` (cinematic arena)
3. Create `CombatVictoryComponent`
4. Create `CombatDefeatComponent`
5. Use existing `CombatOrchestrator` and `MazeStateStore`

### Phase 4: Navigation Scene
1. What remains in MazeComponent becomes `MazeNavigationComponent`
2. Should be ~600 lines (movement, inspection, camping)
3. All 44 duplicate signals naturally eliminated

## Signal Migration

During scene extraction, signals move from MazeComponent to being read-only from MazeStateStore:

**Before (MazeComponent):**
```typescript
readonly combatPhase = signal<CombatPhase>('idle')
// Usage: this.combatPhase.set('action_select')
```

**After (Scene using MazeStateStore):**
```typescript
readonly combatPhase = computed(() => this.stateStore.combatPhase())
// Usage: this.stateStore.setCombatPhase('action_select')
```

## Transition Logic

### Enter Combat
```typescript
// In MazeNavigationComponent
async onEncounter(config: EncounterConfig) {
  await CombatService.initiateCombat(config)
  this.router.navigate(['/maze/combat'])
}
```

### Combat Round Complete
```typescript
// In CombatActionComponent
async onExecuteRound() {
  this.router.navigate(['/maze/combat/playback'])
}
```

### Victory
```typescript
// In CombatPlaybackComponent
onPlaybackComplete() {
  const result = this.combatOrchestrator.getResult()
  if (result.victory) {
    this.router.navigate(['/maze/combat/victory'])
  } else if (result.defeat) {
    this.router.navigate(['/maze/combat/defeat'])
  } else {
    // Next round
    this.router.navigate(['/maze/combat'])
  }
}
```

## Benefits

1. **Smaller files**: 4,119 lines → 5-6 files of 200-600 lines each
2. **Clear state machine**: Router navigation = explicit state transitions
3. **Isolated testing**: Each scene testable independently
4. **Better DX**: Easier to find and modify specific functionality
5. **Natural signal cleanup**: Duplicates eliminated as scenes extracted
6. **Reusable layout**: Same visual structure, different content

## Risks & Mitigations

### Risk: Breaking existing functionality
**Mitigation:** Extract one scene at a time, verify tests pass after each extraction

### Risk: State getting out of sync across scenes
**Mitigation:** All state lives in MazeStateStore, scenes are read-only presenters

### Risk: Complex router guards needed
**Mitigation:** Use MazeStateStore signals for guards (e.g., can only enter /combat if combat exists)

## Success Criteria

- [ ] MazeComponent reduced to ~600 lines
- [ ] All scenes use shared MazeLayoutComponent
- [ ] No duplicate signals between components and MazeStateStore
- [ ] All existing tests pass
- [ ] Navigation between scenes works correctly
- [ ] Game state persists across scene transitions
