# Castle Menu Navigation Simplification

**Date:** 2025-11-05
**Status:** Design Approved
**Approach:** Component-First Refactoring

## Overview

This design simplifies the game's navigation hierarchy by removing the Edge of Town and Utilities scenes, promoting Training Grounds and Maze to first-class options in the Castle Menu. This reduces navigation depth from 3 levels to 2 levels for dungeon access and character creation.

## Motivation

**Current State:**
```
Title Screen → Castle Menu → Edge of Town → {Training Grounds, Camp/Maze, Utilities}
                    ↓
            {Tavern, Temple, Shop, Inn}
```

**Problems:**
- Unnecessary intermediate screen (Edge of Town) adds extra navigation steps
- Save/load functionality in Utilities is redundant with auto-save system
- "Leave Game" option is not needed (players can close browser/app)
- More scenes to maintain and test

**Target State:**
```
Title Screen → Castle Menu → {Tavern, Temple, Shop, Inn, Training Grounds, Camp/Maze}
```

**Benefits:**
- Faster access to Training Grounds and Maze (1 click instead of 2)
- Simplified navigation mental model
- Fewer scenes to maintain and test (-38 tests to maintain)
- Cleaner architecture

## Architecture Changes

### Castle Menu Component

**Menu Options Update:**

| Option | Shortcut | Previous | New | Notes |
|--------|----------|----------|-----|-------|
| Tavern | (A) | (G) | Changed | Changed to avoid conflict |
| Temple | (T) | (T) | Unchanged | |
| Shop | (S) | (B) | Changed | More intuitive |
| Inn | (I) | (A) | Changed | More intuitive |
| Training Grounds | (G) | N/A | **NEW** | Direct access from Castle |
| Maze | (M) | N/A | **NEW** | Requires party, triggers auto-save |
| ~~Edge of Town~~ | ~~(E)~~ | Removed | N/A | Scene deleted |

**Conditional Enabling:**
- **Maze option:** Disabled when party is empty (requires at least 1 party member)
- All other options: Always enabled

**Auto-Save Behavior:**
- Castle Menu continues to auto-save on entry (safe zone)
- **NEW:** Maze navigation triggers auto-save *before* transitioning to Camp scene
  - This preserves the "last save before dungeon" behavior previously provided by Edge of Town

### Component Changes

**Castle Menu (`src/app/castle-menu/`):**
- **Template:** Update footer menu with 6 options and new shortcuts
- **Component Class:**
  - Add `navigateToTrainingGrounds()` - direct navigation to Training Grounds
  - Add `navigateToMaze()` - party validation + auto-save + navigate to Camp
  - Update keyboard handler: A=Tavern, T=Temple, S=Shop, I=Inn, G=Training, M=Maze
  - Remove `navigateToEdgeOfTown()` method
  - Add computed signal for Maze enabled state based on party size

**Training Grounds (`src/app/training-grounds/`):**
- **Navigation:** Update return path from Edge of Town → Castle Menu
- After character creation, navigate back to Castle Menu instead of Edge of Town

**Deleted Components:**
- `src/app/edge-of-town/` - entire directory (component, template, tests)
- `src/components/utilities/` - entire directory (component, template, tests)

### Navigation & Routing

**Router Configuration Changes:**
- **Remove routes:**
  - `edge-of-town` → EdgeOfTownComponent
  - `utilities` → UtilitiesComponent
- **Verify routes exist:**
  - `castle-menu` → CastleMenuComponent
  - `training-grounds` → TrainingGroundsComponent
  - `camp` → CampComponent

**Scene Type Enumeration:**
- Remove `EDGE_OF_TOWN` enum value (if exists)
- Remove `UTILITIES` enum value (if exists)

**Navigation References to Update:**
- Character Inspection component: Remove `returnTo='edge-of-town'` parameter handling
- Search entire codebase for "edge-of-town" and "utilities" string references
- Update any hardcoded navigation paths

### Key Invariants Preserved

- ✅ Castle Menu remains the central hub for all town services
- ✅ Auto-save occurs before dungeon entry (now at Castle level instead of Edge of Town)
- ✅ Party validation prevents Maze access without party members
- ✅ All town services (Tavern, Temple, Shop, Inn) return to Castle Menu
- ✅ Training Grounds returns to Castle Menu (updated from Edge of Town)
- ✅ Safe zone behavior unchanged (Castle Menu is still a safe zone with auto-save)

## Testing Strategy

### Castle Menu Tests Update

**File:** `src/app/castle-menu/__tests__/castle-menu.component.spec.ts`

**Tests to Update:**
- "displays all navigation options" → expect 6 options instead of 5
- Keyboard shortcut tests:
  - `A` → Tavern (was `G`)
  - `T` → Temple (unchanged)
  - `S` → Shop (was `B`)
  - `I` → Inn (was `A`)
  - `G` → Training Grounds (NEW)
  - `M` → Maze (NEW)

**Tests to Remove:**
- "navigates to Edge of Town" test

**Tests to Add:**
- "navigates to Training Grounds on G key"
- "navigates to Maze on M key with party"
- "Maze option disabled without party"
- "Auto-save triggered before Maze navigation"

### Training Grounds Tests Update

**File:** Update tests that verify return navigation
- Expect navigation to Castle Menu instead of Edge of Town

### Tests to Delete

**Edge of Town Tests:** `src/app/edge-of-town/__tests__/edge-of-town.component.spec.ts`
- 25 tests removed

**Utilities Tests:** `src/components/utilities/__tests__/utilities.component.spec.ts`
- 13 tests removed

### Integration Tests

- Search for E2E tests that reference Edge of Town or Utilities
- Update navigation paths to use direct Castle Menu → Training Grounds, Castle Menu → Maze

### Test Suite Impact

- **Current:** 501 tests passing in 7.8 seconds
- **After deletion:** ~463 tests (removed 38 tests)
- **After updates:** ~463 tests with updated Castle Menu tests
- **Coverage target:** Maintain 80%+ overall, 100% for Castle Menu

## Implementation Steps

**Order:** Component-First Refactoring (step-by-step with clear commits)

1. **Update Castle Menu Component**
   - Modify template with new 6-option footer menu
   - Update component class with new navigation methods
   - Add party validation for Maze option
   - Add auto-save trigger before Maze navigation
   - Update keyboard event handlers

2. **Update Castle Menu Tests**
   - Modify existing tests for new shortcuts
   - Add new tests for Training Grounds and Maze navigation
   - Add tests for Maze validation and auto-save
   - Run tests to verify Castle Menu works correctly

3. **Update Training Grounds Component**
   - Change return navigation from Edge of Town to Castle Menu
   - Update any related tests

4. **Update Route Configuration**
   - Remove Edge of Town and Utilities routes
   - Verify remaining routes are correct

5. **Delete Edge of Town Component**
   - Delete `src/app/edge-of-town/` directory
   - Verify no compilation errors

6. **Delete Utilities Component**
   - Delete `src/components/utilities/` directory
   - Verify no compilation errors

7. **Search & Replace Navigation References**
   - Search codebase for remaining Edge of Town or Utilities references
   - Update Character Inspection or other components with `returnTo` parameters

8. **Update Documentation**
   - Update `docs/ui/scenes/01-castle-menu.md` with new options
   - Update `docs/ui/navigation-map.md`
   - Update `docs/ui/scenes/02-training-grounds.md` with new return path
   - Archive or delete:
     - `docs/ui/scenes/07-edge-of-town.md`
     - `docs/ui/scenes/08-utilities-menu.md`

9. **Run Full Test Suite**
   - Verify all ~463 tests pass
   - Verify coverage remains above 80%
   - Performance check: test suite completes in <7.8 seconds

10. **Manual Testing**
    - Load game and verify Castle Menu displays correctly
    - Test all 6 navigation options
    - Verify Maze option is disabled without party
    - Verify auto-save works before Maze entry
    - Verify keyboard shortcuts work correctly

## Risk Management

| Risk | Mitigation |
|------|------------|
| **Breaking existing saves** | Test with existing save files to ensure Castle Menu loads correctly; auto-save format unchanged |
| **Missing navigation references** | Comprehensive grep for "edge-of-town" and "utilities" strings before deletion |
| **Test suite failures** | Run tests after each major step to catch issues early |
| **Auto-save not triggering** | Add specific test to verify SaveService called before Maze navigation |
| **Keyboard shortcut conflicts** | Test all shortcuts manually; document all changes in one place |

**Rollback Plan:**
Component-first approach with clear commits at each step allows for straightforward `git revert` if issues arise.

## Documentation Updates

**Files to Update:**
- `docs/ui/scenes/01-castle-menu.md` - Add Training Grounds and Maze options, update shortcuts
- `docs/ui/scenes/02-training-grounds.md` - Update return path to Castle Menu
- `docs/ui/navigation-map.md` - Update scene flow diagram

**Files to Archive/Delete:**
- `docs/ui/scenes/07-edge-of-town.md` - Scene no longer exists
- `docs/ui/scenes/08-utilities-menu.md` - Scene no longer exists

## Success Criteria

- ✅ Castle Menu displays 6 navigation options with correct shortcuts
- ✅ All keyboard shortcuts work correctly (A, T, S, I, G, M)
- ✅ Maze option is disabled when party is empty
- ✅ Auto-save triggers before Maze navigation
- ✅ Training Grounds returns to Castle Menu after character creation
- ✅ All town services continue to work as before
- ✅ Edge of Town and Utilities scenes completely removed
- ✅ Test suite passes with ~463 tests
- ✅ Test coverage remains above 80%
- ✅ No compilation errors or broken navigation paths
- ✅ Documentation updated to reflect new navigation flow

## Notes

**Save/Load Functionality:**
The Utilities scene's save/load system is being removed entirely. Players will rely on the auto-save system:
- Castle Menu auto-saves on entry (safe zone)
- Edge of Town previously auto-saved (now removed, but Castle still saves)
- Maze entry triggers auto-save before entering dungeon
- Manual save/load is no longer available (simplified UX)

**Leave Game Functionality:**
The "Leave Game" option is being removed. Players can close the browser tab/window naturally. The auto-save system ensures progress is preserved.

**Navigation Depth Reduction:**
- **Before:** Title → Castle → Edge of Town → Training Grounds (3 clicks)
- **After:** Title → Castle → Training Grounds (2 clicks)
- **Before:** Title → Castle → Edge of Town → Maze (3 clicks)
- **After:** Title → Castle → Maze (2 clicks)
