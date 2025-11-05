# Castle Menu Navigation Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Edge of Town and Utilities scenes, promote Training Grounds and Maze to Castle Menu as direct navigation options.

**Architecture:** Component-first refactoring approach. Update Castle Menu component with 6 options (new shortcuts), add party validation for Maze entry with auto-save trigger, update Training Grounds return path, delete Edge of Town and Utilities components, update all navigation references.

**Tech Stack:** Angular 19, TypeScript, Jest, Angular Signals, Angular Router

---

## Task 1: Update Castle Menu Component - Template

**Files:**
- Modify: `src/app/castle-menu/castle-menu.component.html`

**Step 1: Update footer menu options**

Replace the existing `<app-scene-footer>` menu options array with new 6-option configuration:

```html
<app-scene-footer
  [menuOptions]="[
    { key: 'A', label: 'Tavern', action: () => navigateToTavern() },
    { key: 'T', label: 'Temple', action: () => navigateToTemple() },
    { key: 'S', label: 'Shop', action: () => navigateToShop() },
    { key: 'I', label: 'Inn', action: () => navigateToInn() },
    { key: 'G', label: 'Training Grounds', action: () => navigateToTrainingGrounds() },
    { key: 'M', label: 'Maze', action: () => navigateToMaze(), enabled: mazeEnabled() }
  ]"
/>
```

**Step 2: Verify template compiles**

Run: `ng build`
Expected: No compilation errors (methods don't exist yet, but template should parse)

**Step 3: Commit**

```bash
git add src/app/castle-menu/castle-menu.component.html
git commit -m "refactor(castle-menu): update footer menu with 6 options and new shortcuts"
```

---

## Task 2: Update Castle Menu Component - Class Logic

**Files:**
- Modify: `src/app/castle-menu/castle-menu.component.ts`

**Step 1: Add mazeEnabled computed signal**

Add after existing computed signals in the component class:

```typescript
// Maze option is only enabled when party has at least 1 member
mazeEnabled = computed(() => {
  const party = this.gameState().party;
  return (party?.members.length ?? 0) > 0;
});
```

**Step 2: Add navigateToTrainingGrounds method**

Add method to component class:

```typescript
navigateToTrainingGrounds(): void {
  this.router.navigate(['/training-grounds']);
}
```

**Step 3: Add navigateToMaze method with validation and auto-save**

Add method to component class:

```typescript
async navigateToMaze(): Promise<void> {
  const party = this.gameState().party;

  // Validate party exists and has members
  if (!party || party.members.length === 0) {
    console.warn('Cannot enter maze without party members');
    return;
  }

  // Trigger auto-save before entering dungeon
  const saveService = inject(SaveService);
  await saveService.autoSave(this.gameState());

  // Navigate to Camp (pre-dungeon staging area)
  this.router.navigate(['/camp']);
}
```

**Step 4: Update keyboard event handler**

Replace the existing keyboard handler switch cases with new shortcuts:

```typescript
@HostListener('window:keydown', ['$event'])
handleKeyPress(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();

  switch (key) {
    case 'a':
      this.navigateToTavern();
      break;
    case 't':
      this.navigateToTemple();
      break;
    case 's':
      this.navigateToShop();
      break;
    case 'i':
      this.navigateToInn();
      break;
    case 'g':
      this.navigateToTrainingGrounds();
      break;
    case 'm':
      if (this.mazeEnabled()) {
        this.navigateToMaze();
      }
      break;
  }
}
```

**Step 5: Remove navigateToEdgeOfTown method**

Delete the entire `navigateToEdgeOfTown()` method from the component class.

**Step 6: Add SaveService import if not present**

At top of file, ensure SaveService is imported:

```typescript
import { SaveService } from '../../services/SaveService';
```

**Step 7: Verify component compiles**

Run: `ng build`
Expected: No compilation errors

**Step 8: Commit**

```bash
git add src/app/castle-menu/castle-menu.component.ts
git commit -m "feat(castle-menu): add Training Grounds and Maze navigation with validation"
```

---

## Task 3: Update Castle Menu Tests - Remove Old Tests

**Files:**
- Modify: `src/app/castle-menu/__tests__/castle-menu.component.spec.ts`

**Step 1: Remove Edge of Town navigation test**

Find and delete the test case:
```typescript
it('navigates to Edge of Town on E key', () => { ... })
```

Or similar test that verifies Edge of Town navigation.

**Step 2: Run tests to see what breaks**

Run: `npm test -- castle-menu`
Expected: Some tests fail due to keyboard shortcut changes

**Step 3: Commit**

```bash
git add src/app/castle-menu/__tests__/castle-menu.component.spec.ts
git commit -m "test(castle-menu): remove Edge of Town navigation test"
```

---

## Task 4: Update Castle Menu Tests - Fix Keyboard Shortcuts

**Files:**
- Modify: `src/app/castle-menu/__tests__/castle-menu.component.spec.ts`

**Step 1: Update Tavern keyboard test**

Change from `G` key to `A` key:

```typescript
it('navigates to Tavern on A key', () => {
  const navigateSpy = jest.spyOn(component, 'navigateToTavern');
  const event = new KeyboardEvent('keydown', { key: 'a' });
  window.dispatchEvent(event);
  expect(navigateSpy).toHaveBeenCalled();
});
```

**Step 2: Update Shop keyboard test**

Change from `B` key to `S` key:

```typescript
it('navigates to Shop on S key', () => {
  const navigateSpy = jest.spyOn(component, 'navigateToShop');
  const event = new KeyboardEvent('keydown', { key: 's' });
  window.dispatchEvent(event);
  expect(navigateSpy).toHaveBeenCalled();
});
```

**Step 3: Update Inn keyboard test**

Change from `A` key to `I` key:

```typescript
it('navigates to Inn on I key', () => {
  const navigateSpy = jest.spyOn(component, 'navigateToInn');
  const event = new KeyboardEvent('keydown', { key: 'i' });
  window.dispatchEvent(event);
  expect(navigateSpy).toHaveBeenCalled();
});
```

**Step 4: Run tests**

Run: `npm test -- castle-menu`
Expected: Updated shortcut tests pass

**Step 5: Commit**

```bash
git add src/app/castle-menu/__tests__/castle-menu.component.spec.ts
git commit -m "test(castle-menu): update keyboard shortcuts for Tavern, Shop, Inn"
```

---

## Task 5: Update Castle Menu Tests - Add New Navigation Tests

**Files:**
- Modify: `src/app/castle-menu/__tests__/castle-menu.component.spec.ts`

**Step 1: Add Training Grounds navigation test**

Add new test case:

```typescript
it('navigates to Training Grounds on G key', () => {
  const navigateSpy = jest.spyOn(component.router, 'navigate');
  const event = new KeyboardEvent('keydown', { key: 'g' });
  window.dispatchEvent(event);
  expect(navigateSpy).toHaveBeenCalledWith(['/training-grounds']);
});
```

**Step 2: Add Maze navigation test with party**

Add new test case:

```typescript
it('navigates to Maze on M key when party exists', async () => {
  // Set up game state with party
  const mockGameState = createTestGameState({
    party: createTestParty({ members: [createTestCharacter()] })
  });
  component.gameState.set(mockGameState);

  const navigateSpy = jest.spyOn(component.router, 'navigate');
  const saveService = TestBed.inject(SaveService);
  const saveSpy = jest.spyOn(saveService, 'autoSave').mockResolvedValue();

  const event = new KeyboardEvent('keydown', { key: 'm' });
  window.dispatchEvent(event);

  await fixture.whenStable();

  expect(saveSpy).toHaveBeenCalledWith(mockGameState);
  expect(navigateSpy).toHaveBeenCalledWith(['/camp']);
});
```

**Step 3: Add Maze disabled test without party**

Add new test case:

```typescript
it('does not navigate to Maze when party is empty', () => {
  // Set up game state with empty party
  const mockGameState = createTestGameState({
    party: createTestParty({ members: [] })
  });
  component.gameState.set(mockGameState);

  const navigateSpy = jest.spyOn(component.router, 'navigate');
  const event = new KeyboardEvent('keydown', { key: 'm' });
  window.dispatchEvent(event);

  expect(navigateSpy).not.toHaveBeenCalled();
});
```

**Step 4: Add mazeEnabled computed signal test**

Add new test case:

```typescript
it('mazeEnabled returns true when party has members', () => {
  const mockGameState = createTestGameState({
    party: createTestParty({ members: [createTestCharacter()] })
  });
  component.gameState.set(mockGameState);

  expect(component.mazeEnabled()).toBe(true);
});

it('mazeEnabled returns false when party is empty', () => {
  const mockGameState = createTestGameState({
    party: createTestParty({ members: [] })
  });
  component.gameState.set(mockGameState);

  expect(component.mazeEnabled()).toBe(false);
});
```

**Step 5: Add auto-save test**

Add new test case:

```typescript
it('triggers auto-save before Maze navigation', async () => {
  const mockGameState = createTestGameState({
    party: createTestParty({ members: [createTestCharacter()] })
  });
  component.gameState.set(mockGameState);

  const saveService = TestBed.inject(SaveService);
  const saveSpy = jest.spyOn(saveService, 'autoSave').mockResolvedValue();

  await component.navigateToMaze();

  expect(saveSpy).toHaveBeenCalledWith(mockGameState);
});
```

**Step 6: Update menu options count test**

Find the test that checks menu option count and update from 5 to 6:

```typescript
it('displays all navigation options', () => {
  const footer = fixture.debugElement.query(By.directive(SceneFooterComponent));
  expect(footer.componentInstance.menuOptions.length).toBe(6);
});
```

**Step 7: Run tests**

Run: `npm test -- castle-menu`
Expected: All Castle Menu tests pass

**Step 8: Commit**

```bash
git add src/app/castle-menu/__tests__/castle-menu.component.spec.ts
git commit -m "test(castle-menu): add tests for Training Grounds and Maze navigation"
```

---

## Task 6: Update Training Grounds Component - Return Navigation

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts` (or similar)

**Step 1: Find the return navigation method**

Search for method that navigates back after character creation. Look for:
- `navigateToCastle()`
- `navigateBack()`
- Router navigation to `edge-of-town`

**Step 2: Update return path to Castle Menu**

Change the navigation destination from `edge-of-town` to `castle-menu`:

```typescript
// Before
this.router.navigate(['/edge-of-town']);

// After
this.router.navigate(['/castle-menu']);
```

**Step 3: Run tests**

Run: `npm test -- training-grounds`
Expected: Tests may fail if they verify navigation to Edge of Town

**Step 4: Update Training Grounds tests**

Find tests that verify return navigation and update expected route:

```typescript
// Before
expect(routerSpy).toHaveBeenCalledWith(['/edge-of-town']);

// After
expect(routerSpy).toHaveBeenCalledWith(['/castle-menu']);
```

**Step 5: Run tests again**

Run: `npm test -- training-grounds`
Expected: All Training Grounds tests pass

**Step 6: Commit**

```bash
git add src/app/training-grounds/
git commit -m "refactor(training-grounds): return to Castle Menu instead of Edge of Town"
```

---

## Task 7: Update Router Configuration

**Files:**
- Modify: `src/app/app.routes.ts` (or similar routing config file)

**Step 1: Remove Edge of Town route**

Find and delete the route configuration for Edge of Town:

```typescript
// DELETE THIS
{
  path: 'edge-of-town',
  component: EdgeOfTownComponent
}
```

**Step 2: Remove Utilities route**

Find and delete the route configuration for Utilities:

```typescript
// DELETE THIS
{
  path: 'utilities',
  component: UtilitiesComponent
}
```

**Step 3: Verify remaining routes**

Ensure these routes still exist:
- `castle-menu` → CastleMenuComponent
- `training-grounds` → TrainingGroundsComponent
- `camp` → CampComponent

**Step 4: Remove component imports**

Remove imports for deleted components at top of file:

```typescript
// DELETE THESE
import { EdgeOfTownComponent } from './edge-of-town/edge-of-town.component';
import { UtilitiesComponent } from '../components/utilities/utilities.component';
```

**Step 5: Verify app compiles**

Run: `ng build`
Expected: Compilation errors about missing EdgeOfTownComponent and UtilitiesComponent

**Step 6: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "refactor(routes): remove Edge of Town and Utilities routes"
```

---

## Task 8: Delete Edge of Town Component

**Files:**
- Delete: `src/app/edge-of-town/` (entire directory)

**Step 1: Delete Edge of Town directory**

Run: `rm -rf src/app/edge-of-town/`

This removes:
- Component class
- Template
- Styles
- Tests (25 tests)

**Step 2: Verify compilation**

Run: `ng build`
Expected: Should compile successfully now (route import removed in previous task)

**Step 3: Run test suite**

Run: `npm test`
Expected: Test count reduced by ~25 tests, all remaining tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete Edge of Town component and tests"
```

---

## Task 9: Delete Utilities Component

**Files:**
- Delete: `src/components/utilities/` (entire directory)

**Step 1: Delete Utilities directory**

Run: `rm -rf src/components/utilities/`

This removes:
- Component class
- Template
- Styles
- Tests (13 tests)

**Step 2: Verify compilation**

Run: `ng build`
Expected: Should compile successfully

**Step 3: Run test suite**

Run: `npm test`
Expected: Test count reduced by ~13 more tests (~38 total reduction), all remaining tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete Utilities component and tests"
```

---

## Task 10: Search for Remaining Navigation References

**Files:**
- Audit: All TypeScript files for string references

**Step 1: Search for edge-of-town string references**

Run: `grep -r "edge-of-town" src/ --include="*.ts" --include="*.html"`

Expected: Should find zero matches (or only in comments/docs)

**Step 2: Search for utilities route references**

Run: `grep -r "utilities" src/ --include="*.ts" --include="*.html"`

Expected: Should find zero matches for route navigation (may find unrelated utilities)

**Step 3: Search for EdgeOfTown enum/type references**

Run: `grep -r "EDGE_OF_TOWN" src/ --include="*.ts"`

Expected: Should find zero matches

**Step 4: Search for UTILITIES enum/type references**

Run: `grep -r "UTILITIES" src/ --include="*.ts"`

Expected: Should find zero matches

**Step 5: If matches found, update them**

For each match found:
- If navigation reference: Update to `castle-menu`
- If enum reference: Remove or replace with appropriate alternative
- If type reference: Remove or update type definitions

**Step 6: Verify compilation**

Run: `ng build`
Expected: No compilation errors

**Step 7: Commit (if changes made)**

```bash
git add .
git commit -m "refactor: remove remaining Edge of Town and Utilities references"
```

---

## Task 11: Update Character Inspection returnTo Parameter

**Files:**
- Audit: `src/app/character-inspection/` or similar

**Step 1: Search for returnTo parameter usage**

Run: `grep -r "returnTo.*edge-of-town" src/`

**Step 2: Update any edge-of-town returnTo parameters**

If found, replace with `castle-menu`:

```typescript
// Before
this.router.navigate(['/character-inspection'], {
  queryParams: { returnTo: 'edge-of-town' }
});

// After
this.router.navigate(['/character-inspection'], {
  queryParams: { returnTo: 'castle-menu' }
});
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit (if changes made)**

```bash
git add .
git commit -m "refactor: update character inspection returnTo parameter"
```

---

## Task 12: Update Castle Menu Documentation

**Files:**
- Modify: `docs/ui/scenes/01-castle-menu.md`

**Step 1: Update menu options section**

Replace the menu options list with new 6-option layout:

```markdown
## Menu Options

1. **(A) Tavern** - Party formation and recruitment
2. **(T) Temple** - Healing and resurrection services
3. **(S) Shop** - Buy, sell, and identify equipment
4. **(I) Inn** - Rest, heal, and level up
5. **(G) Training Grounds** - Create new characters
6. **(M) Maze** - Enter the dungeon (requires party, triggers auto-save)
```

**Step 2: Update navigation flow section**

Update navigation paths:

```markdown
## Navigation

**FROM:** Title Screen, All Town Services, Training Grounds

**TO:**
- (A) Tavern
- (T) Temple
- (S) Shop
- (I) Inn
- (G) Training Grounds
- (M) Camp/Maze (when party exists)

**RETURN TO CASTLE:** From all town services via (L)eave
```

**Step 3: Update conditional enabling section**

```markdown
## Conditional Enabling

- **Maze option:** Disabled when party has no members. Requires at least 1 party member.
- **All other options:** Always enabled
```

**Step 4: Add auto-save behavior note**

```markdown
## Auto-Save Behavior

- Castle Menu auto-saves on entry (safe zone)
- Maze option triggers auto-save before navigating to Camp scene
- This preserves progress before entering dangerous dungeon areas
```

**Step 5: Remove Edge of Town references**

Delete any mentions of Edge of Town scene from the documentation.

**Step 6: Commit**

```bash
git add docs/ui/scenes/01-castle-menu.md
git commit -m "docs: update Castle Menu with new navigation options"
```

---

## Task 13: Update Training Grounds Documentation

**Files:**
- Modify: `docs/ui/scenes/02-training-grounds.md`

**Step 1: Update return navigation section**

```markdown
## Navigation

**FROM:** Castle Menu

**TO:** Castle Menu (after character creation)

**Return Key:** (ESC) or completing character creation returns to Castle Menu
```

**Step 2: Remove Edge of Town references**

Replace all mentions of "returns to Edge of Town" with "returns to Castle Menu".

**Step 3: Commit**

```bash
git add docs/ui/scenes/02-training-grounds.md
git commit -m "docs: update Training Grounds return path to Castle Menu"
```

---

## Task 14: Update Navigation Map Documentation

**Files:**
- Modify: `docs/ui/navigation-map.md`

**Step 1: Update scene flow diagram**

Replace the current navigation diagram with updated flow:

```markdown
## Scene Navigation Flow

```
Title Screen
    ↓
Castle Menu (Hub)
    ├── (A) Tavern → [returns to Castle]
    ├── (T) Temple → [returns to Castle]
    ├── (S) Shop → [returns to Castle]
    ├── (I) Inn → [returns to Castle]
    ├── (G) Training Grounds → [returns to Castle]
    └── (M) Maze → Camp → [dungeon flow]
```
```

**Step 2: Remove Edge of Town and Utilities from scene list**

Delete Edge of Town and Utilities from any scene enumeration lists.

**Step 3: Update safe zone list**

```markdown
## Safe Zones (Auto-Save on Entry)

- Castle Menu
- ~~Edge of Town~~ (REMOVED)
```

**Step 4: Commit**

```bash
git add docs/ui/navigation-map.md
git commit -m "docs: update navigation map with simplified flow"
```

---

## Task 15: Archive Edge of Town and Utilities Documentation

**Files:**
- Modify: `docs/ui/scenes/07-edge-of-town.md`
- Modify: `docs/ui/scenes/08-utilities-menu.md`

**Step 1: Add deprecation notice to Edge of Town docs**

Add at the top of `07-edge-of-town.md`:

```markdown
# Edge of Town Scene

> **DEPRECATED:** This scene was removed in the Castle Menu Navigation Simplification refactor (2025-11-05). Training Grounds and Maze are now accessed directly from Castle Menu.

[Rest of original content remains for historical reference]
```

**Step 2: Add deprecation notice to Utilities docs**

Add at the top of `08-utilities-menu.md`:

```markdown
# Utilities Menu Scene

> **DEPRECATED:** This scene was removed in the Castle Menu Navigation Simplification refactor (2025-11-05). Save/load functionality removed in favor of auto-save system only.

[Rest of original content remains for historical reference]
```

**Step 3: Commit**

```bash
git add docs/ui/scenes/07-edge-of-town.md docs/ui/scenes/08-utilities-menu.md
git commit -m "docs: deprecate Edge of Town and Utilities documentation"
```

---

## Task 16: Run Full Test Suite

**Files:**
- None (verification step)

**Step 1: Run all tests**

Run: `npm test`

**Step 2: Verify test count**

Expected output:
- Total tests: ~463 (reduced from 501)
- All tests passing
- Test execution time: <7.8 seconds

**Step 3: Verify coverage**

Run: `npm test -- --coverage`

Expected:
- Overall coverage: >80%
- Castle Menu coverage: 100%

**Step 4: Check for any failures**

If any tests fail:
- Review the failure output
- Fix the broken tests
- Re-run test suite
- Commit fixes with descriptive message

**Step 5: Document test results**

No commit needed (verification step).

---

## Task 17: Manual Testing

**Files:**
- None (manual verification)

**Step 1: Start development server**

Run: `npm start`

**Step 2: Load game**

Navigate to Castle Menu and verify:
- ✅ Header shows "CASTLE" title
- ✅ Party gold displayed correctly
- ✅ 6 menu options visible in footer

**Step 3: Test keyboard shortcuts**

Press each key and verify navigation:
- ✅ (A) → Tavern
- ✅ (T) → Temple
- ✅ (S) → Shop
- ✅ (I) → Inn
- ✅ (G) → Training Grounds
- ✅ (M) → Maze (if party exists)

**Step 4: Test Maze validation**

With empty party:
- ✅ Maze option is disabled or does nothing when clicked
- ✅ M key does not navigate

With party:
- ✅ Maze option is enabled
- ✅ M key navigates to Camp scene
- ✅ Auto-save occurs before navigation (check browser console for save logs)

**Step 5: Test Training Grounds return**

- Navigate to Training Grounds
- Create a character or cancel
- ✅ Returns to Castle Menu (not Edge of Town)

**Step 6: Test existing town services**

- Navigate to Tavern, Temple, Shop, Inn
- ✅ Each service still works correctly
- ✅ Each returns to Castle Menu

**Step 7: Document results**

No commit needed (manual verification).

---

## Task 18: Final Cleanup and Documentation Update

**Files:**
- Modify: `CLAUDE.md` (if needed)
- Modify: `README.md` (if needed)

**Step 1: Update CLAUDE.md if navigation mentioned**

Search for Edge of Town references in `CLAUDE.md`:

Run: `grep -i "edge.of.town" CLAUDE.md`

If found, update with new navigation flow.

**Step 2: Update README if navigation mentioned**

Search for Edge of Town references in `README.md`:

Run: `grep -i "edge.of.town" README.md`

If found, update with new navigation flow.

**Step 3: Commit (if changes made)**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update navigation references in project docs"
```

---

## Task 19: Final Verification and Summary

**Files:**
- None (final verification)

**Step 1: Run build**

Run: `ng build`
Expected: Successful production build with no errors

**Step 2: Run test suite one final time**

Run: `npm test`
Expected: ~463 tests pass, >80% coverage

**Step 3: Verify git status**

Run: `git status`
Expected: Working directory clean (all changes committed)

**Step 4: Review commit history**

Run: `git log --oneline -20`
Expected: ~19 commits documenting the refactoring process

**Step 5: Create summary document**

Create `docs/implementation/castle-menu-navigation-simplification-summary.md`:

```markdown
# Castle Menu Navigation Simplification - Implementation Summary

**Date Completed:** 2025-11-05
**Total Tasks:** 19
**Commits:** ~19
**Tests Changed:** -38 tests (501 → 463)
**Coverage:** >80% maintained

## Changes Made

### Components Modified
- Castle Menu: Added Training Grounds and Maze options with new shortcuts
- Training Grounds: Updated return path to Castle Menu

### Components Deleted
- Edge of Town: Entire component removed
- Utilities: Entire component removed

### Routes Updated
- Removed: `/edge-of-town`, `/utilities`
- Updated: Training Grounds → Castle Menu return path

### Tests Updated
- Castle Menu: Updated keyboard shortcuts, added Maze validation tests
- Training Grounds: Updated return navigation tests
- Deleted: 38 tests (Edge of Town + Utilities)

### Documentation Updated
- `docs/ui/scenes/01-castle-menu.md` - New menu options
- `docs/ui/scenes/02-training-grounds.md` - Return path
- `docs/ui/navigation-map.md` - Simplified flow
- `docs/ui/scenes/07-edge-of-town.md` - Deprecated
- `docs/ui/scenes/08-utilities-menu.md` - Deprecated

## Success Criteria ✅

- ✅ Castle Menu displays 6 navigation options
- ✅ Keyboard shortcuts work correctly (A, T, S, I, G, M)
- ✅ Maze option disabled when party is empty
- ✅ Auto-save triggers before Maze navigation
- ✅ Training Grounds returns to Castle Menu
- ✅ All tests pass (~463 tests)
- ✅ Coverage >80%
- ✅ No compilation errors
- ✅ Documentation updated

## Manual Testing Results

All manual test cases passed:
- Menu display correct
- All shortcuts functional
- Maze validation working
- Auto-save confirmed
- Town services unchanged
```

**Step 6: Commit summary**

```bash
git add docs/implementation/castle-menu-navigation-simplification-summary.md
git commit -m "docs: add implementation summary for navigation simplification"
```

---

## Implementation Complete

**Total Tasks:** 19
**Expected Duration:** 2-3 hours for careful implementation
**Test Coverage:** Maintain >80% overall
**Commits:** ~20 commits (one per logical step)

**Key Success Criteria:**
- ✅ 6 menu options in Castle Menu with correct shortcuts
- ✅ Maze validation and auto-save working
- ✅ Training Grounds returns to Castle Menu
- ✅ Edge of Town and Utilities fully removed
- ✅ ~463 tests passing
- ✅ >80% coverage maintained
- ✅ Documentation updated

**Reference Skills:**
- `@superpowers:verification-before-completion` - Use before claiming any task complete
- `@superpowers:test-driven-development` - Follow TDD principles throughout
