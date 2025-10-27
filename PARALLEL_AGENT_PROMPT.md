# Training Grounds Implementation - Parallel Agent Instructions

## Context

You are continuing implementation of the Training Grounds scene flow. **Tasks 1-5 have been completed**. Your job is to complete **Tasks 6-13**.

## Current State

**Branch:** main
**Commit:** 9570e36 (fix: correct Training Grounds button labels and key bindings to match spec)
**Tests Passing:** 173/173 (26 test files)
**Test Execution Time:** 2.10s (requirement: <2.5s)

### ✅ Completed (Tasks 1-5)

**Task 1** - Scene Types (commit: c953ed3)
- Added 4 scene types to `SceneType.ts`: TRAINING_GROUNDS, CHARACTER_CREATION, CHARACTER_LIST, CHARACTER_INSPECTION

**Task 2** - Character Type Definitions (commit: 324aaf1)
- Created 5 type files with complete Wizardry 1 mechanics:
  - `src/types/CharacterStatus.ts` (9 states)
  - `src/types/Race.ts` (5 races + RACE_MODIFIERS)
  - `src/types/Alignment.ts` (3 alignments)
  - `src/types/CharacterClass.ts` (8 classes + CLASS_REQUIREMENTS)
  - `src/types/Character.ts` (complete character interface)

**Task 3** - CharacterService (commits: 41a64b4, f9b438e, 4b84174, 23471b8, ee79709, ac1e24a)
- Implemented 4 pure functions with TDD (9 tests):
  - `getAllCharacters(state): Character[]`
  - `createCharacter(state, params): { state, character }`
  - `deleteCharacter(state, characterId): GameState`
  - `validateClassEligibility(class, stats): boolean`
- Updated GameState to include `roster: Map<string, Character>`
- Fixed SaveService backward compatibility bug

**Task 4** - Asset Loading (commit: 579a2f9)
- Added `loadTrainingGroundsAssets()` to AssetLoadingService
- 2 tests added (10 total for AssetLoadingService)

**Task 5** - Training Grounds Scene (commits: 8488752, 9570e36)
- Created TrainingGroundsScene with 4 buttons: (C)REATE CHARACTER, (I)NSPECT CHARACTER, (R)OSTER, (L)EAVE
- Created 4 command files (3 stubs + 1 fully implemented LeaveTrainingGroundsCommand)
- 27 tests added (173 total)
- Uses MenuSceneHelpers, ButtonStateHelpers, LayoutHelpers

## Your Tasks (6-13)

### 📋 Task 6: Create Character List Scene (Reusable)

**Priority:** HIGH - Blocking Tasks 7, 11
**Complexity:** Medium - Generic configuration with callbacks/filters

**Requirements:**
- Create REUSABLE scene that displays a list of characters
- Accept configuration via transition data:
  - `filter?: (char: Character) => boolean` - Optional character filter
  - `onSelect: (char: Character) => void` - Callback when character selected
  - `title: string` - Scene title text
  - `emptyMessage: string` - Message when no characters match filter
- Render character list as vertical buttons (name + level + class)
- Support mouse + keyboard navigation (number keys 1-N for selection, ESC to go back)
- Maximum 20 characters displayed (pagination if needed)
- Use existing UI utilities (LayoutHelpers, ButtonStateHelpers, MenuSceneHelpers)

**Files to create:**
- `src/scenes/character-list-scene/CharacterListScene.ts`
- `tests/scenes/CharacterListScene.test.ts`

**Reference:**
- Look at TrainingGroundsScene for scene structure pattern
- Look at docs/ui/scenes/06-character-list.md for detailed specs

**Success criteria:**
- Scene accepts generic configuration
- Displays filtered character list
- Selection triggers callback with selected character
- ESC returns to previous scene
- Comprehensive tests (10+ tests expected)

---

### 📋 Task 7: Connect Roster Display to Character List

**Priority:** HIGH - Completes roster viewing flow
**Complexity:** Low - Just wire up existing pieces

**Requirements:**
- Update `ShowRosterCommand.ts` (currently stub) to navigate to CHARACTER_LIST
- Pass configuration:
  - `title: "CHARACTER ROSTER"`
  - `emptyMessage: "No characters in roster"`
  - `filter: null` (show all characters)
  - `onSelect: (char) => navigate to CHARACTER_INSPECTION with char.id`

**Files to modify:**
- `src/scenes/training-grounds-scene/commands/ShowRosterCommand.ts`
- `tests/scenes/training-grounds-scene/commands/ShowRosterCommand.test.ts`

**Success criteria:**
- Pressing 'R' in Training Grounds shows full character list
- Selecting a character goes to CHARACTER_INSPECTION scene
- Tests verify configuration passed correctly

---

### 📋 Task 8: Create Character Creation Wizard Scene (Simplified Stub)

**Priority:** HIGH - Blocking Task 9
**Complexity:** Medium - Multi-step wizard

**Requirements:**
For this iteration, create a **SIMPLIFIED STUB**:
- Single scene with all steps on one screen (not multi-scene wizard)
- Displays:
  - Instructions: "Press SPACE to roll stats, ENTER to create, ESC to cancel"
  - Rolled stats display (if rolled)
  - Basic inputs for: name, race selection, class selection, alignment
- SPACE key: Roll new stats using `CharacterService.createCharacter`
- ENTER: Create character and return to TRAINING_GROUNDS
- ESC: Cancel and return to TRAINING_GROUNDS

**Files to create:**
- `src/scenes/character-creation-scene/CharacterCreationScene.ts` (simplified)
- `tests/scenes/CharacterCreationScene.test.ts`

**Success criteria:**
- Can roll stats multiple times
- Can create character with rolled stats
- Character added to roster
- Returns to Training Grounds after creation
- Basic tests (5+ tests expected)

**Note:** Full wizard implementation (multi-scene, attribute allocation, class selection with requirements) is deferred to future iteration.

---

### 📋 Task 9: Connect Creation Flow

**Priority:** MEDIUM
**Complexity:** Low - Wire up existing pieces

**Requirements:**
- Update `NavigateToCharacterCreationCommand.ts` (currently stub)
- Navigate to CHARACTER_CREATION scene
- Pass any needed configuration

**Files to modify:**
- `src/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand.ts`
- `tests/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand.test.ts`

**Success criteria:**
- Pressing 'C' in Training Grounds goes to Character Creation
- Flow completes end-to-end (create character → return to Training Grounds)
- Tests verify navigation

---

### 📋 Task 10: Create Character Inspection Scene

**Priority:** HIGH - Blocking Task 11
**Complexity:** Medium - Mode-based actions

**Requirements:**
- Display character details: name, race, class, level, stats, status, equipment
- Support multiple "modes" via transition data:
  - `mode: 'view'` - Read-only display, ESC returns to previous scene
  - `mode: 'inspect'` - From roster inspection, ESC returns to CHARACTER_LIST
  - `mode: 'trade'` - Can trade equipment (stub for now)
  - `mode: 'drop'` - Can drop from party (confirmation required)
- Render using TextRenderer for character sheet layout
- Action buttons based on mode (use ButtonStateHelpers)

**Files to create:**
- `src/scenes/character-inspection-scene/CharacterInspectionScene.ts`
- `tests/scenes/CharacterInspectionScene.test.ts`

**Reference:**
- docs/ui/scenes/13-character-inspection.md

**Success criteria:**
- Displays all character information correctly
- Mode-based button visibility
- ESC returns to appropriate scene based on mode
- Comprehensive tests (12+ tests expected)

---

### 📋 Task 11: Connect Inspect Flow

**Priority:** MEDIUM
**Complexity:** Low - Wire up existing pieces

**Requirements:**
- Update `NavigateToCharacterListCommand.ts` (currently stub)
- Navigate to CHARACTER_LIST with inspect configuration
- Pass configuration:
  - `title: "INSPECT CHARACTER"`
  - `emptyMessage: "No characters to inspect"`
  - `onSelect: (char) => navigate to CHARACTER_INSPECTION with mode='inspect'`

**Files to modify:**
- `src/scenes/training-grounds-scene/commands/NavigateToCharacterListCommand.ts`
- `tests/scenes/training-grounds-scene/commands/NavigateToCharacterListCommand.test.ts`

**Success criteria:**
- Pressing 'I' in Training Grounds shows character list
- Selecting character goes to inspection view
- Can navigate back through the scenes correctly
- Tests verify full flow

---

### 📋 Task 12: Add Integration Tests

**Priority:** MEDIUM
**Complexity:** Medium - Multi-scene flow testing

**Requirements:**
- Create integration tests for complete flows:
  1. **Create Character Flow:** Training Grounds → Character Creation → Roll Stats → Create → Back to Training Grounds
  2. **Inspect Character Flow:** Training Grounds → Character List → Select Character → Inspection → Back
  3. **View Roster Flow:** Training Grounds → Roster → Select Character → Inspection → Back

**Files to create:**
- `tests/integration/TrainingGroundsFlow.test.ts`

**Success criteria:**
- 3+ integration tests covering main flows
- Tests use `SceneNavigationService` with `{ direction: 'instant' }`
- All tests pass
- Tests verify state changes (character added to roster, etc.)

---

### 📋 Task 13: Manual Testing & Final Verification

**Priority:** LOW - Final polish
**Complexity:** Low - Verification only

**Requirements:**
- Run full test suite: `npm test -- --run`
- Verify all 173+ tests still passing
- Check test execution time < 2.5s
- Verify no TypeScript errors: `npm run build`
- Create summary document of what was implemented

**Success criteria:**
- All tests passing
- No TypeScript errors
- Test suite runs in <2.5s
- Summary document created

---

## Important Implementation Guidelines

### Architecture Patterns

**Scene Structure** - Follow TrainingGroundsScene pattern:
```typescript
export class MyScene implements Scene {
  readonly type = SceneType.MY_SCENE
  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: MySceneMode = 'READY'
  private buttons: ButtonState[] = [...]

  async init(canvas, ctx): Promise<void> {
    // Load assets, calculate layout, register handlers
  }

  enter(data?: SceneTransitionData): void {
    // Extract configuration from data
    // Reset mode to READY
  }

  update(deltaTime: number): void {
    // Update hover states
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear, draw background, draw UI
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
```

**Reusable Scenes** - Use transition data for configuration:
```typescript
SceneNavigationService.transitionTo(SceneType.CHARACTER_LIST, {
  direction: 'fade',
  data: {
    title: "SELECT CHARACTER",
    filter: (char) => char.status === CharacterStatus.GOOD,
    onSelect: (char) => {
      // Navigate to next scene with character
    }
  }
})
```

**UI Utilities** - Use existing helpers:
- `LayoutHelpers.calculateVerticalButtonLayout()` - Button positioning
- `ButtonStateHelpers.updateHoverState()` - Hover management
- `ButtonStateHelpers.applyLayout()` - Apply layouts to buttons
- `MenuSceneHelpers.registerButtonHandlers()` - Keyboard input
- `MenuSceneHelpers.registerMouseHandlers()` - Mouse input

**Command Pattern** - All commands return `{ success, nextScene, error?, data? }`

### Testing Requirements

**Test Structure:**
```typescript
describe('SceneName', () => {
  let scene: MyScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    scene = new MyScene()
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('init', () => {
    it('should initialize buttons', async () => {
      await scene.init(canvas, ctx)
      expect(scene['buttons'].length).toBe(expectedCount)
    })
  })

  // ... more tests
})
```

**Scene Transitions in Tests:**
```typescript
// ALWAYS use instant transitions in tests
await SceneNavigationService.transitionTo(SceneType.MY_SCENE, {
  direction: 'instant'  // REQUIRED for tests
})
```

**Test Coverage Goals:**
- Minimum 80% coverage for new code
- 100% for critical paths (character creation, navigation flows)

### Code Quality Standards

- **TypeScript Strict Mode:** All code must pass strict type checking
- **Pure Functions:** Services must be pure (no side effects)
- **Immutable State:** Use spread operator for state updates
- **No Mutations:** Never mutate GameState or Character objects
- **Error Handling:** All async operations must have try/catch
- **Comments:** JSDoc for all public functions/interfaces

### Commit Guidelines

Follow conventional commits format:
- `feat: description` - New features
- `fix: description` - Bug fixes
- `test: description` - Test additions
- `refactor: description` - Code restructuring

Include footer:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Implementation Strategy

### Recommended Order

1. **Task 6** (Character List Scene) - Foundation for Tasks 7, 11
2. **Task 10** (Character Inspection Scene) - Foundation for Tasks 7, 11
3. **Task 7** (Connect Roster) - Complete roster viewing flow
4. **Task 11** (Connect Inspect) - Complete inspection flow
5. **Task 8** (Character Creation) - Foundation for Task 9
6. **Task 9** (Connect Creation) - Complete creation flow
7. **Task 12** (Integration Tests) - Verify all flows
8. **Task 13** (Final Verification) - Polish and document

### Dependency Graph

```
Task 6 (CharListScene) ─┬─> Task 7 (Connect Roster) ──┐
                        └─> Task 11 (Connect Inspect) ─┤
                                                        ├─> Task 12 (Integration)
Task 10 (CharInspection)─┬─> Task 7 (Connect Roster) ─┤
                         └─> Task 11 (Connect Inspect) ┘

Task 8 (CharCreation) ───> Task 9 (Connect Creation) ──> Task 12 (Integration)

Task 12 (Integration) ────> Task 13 (Final Verification)
```

### Time Estimates

- Task 6: 45-60 minutes
- Task 7: 15-20 minutes
- Task 8: 30-45 minutes (simplified version)
- Task 9: 10-15 minutes
- Task 10: 45-60 minutes
- Task 11: 15-20 minutes
- Task 12: 30-45 minutes
- Task 13: 15-20 minutes

**Total: 3-4 hours** for experienced developer

---

## Reference Materials

**Full Plan:** `/Users/dirkkok/Development/wizardry/docs/plans/2025-10-27-training-grounds-scenes.md`

**UI Documentation:**
- `docs/ui/scenes/02-training-grounds.md` - Training Grounds spec
- `docs/ui/scenes/06-character-list.md` - Character List spec
- `docs/ui/scenes/12-character-creation.md` - Character Creation spec
- `docs/ui/scenes/13-character-inspection.md` - Character Inspection spec

**Existing Implementations (Reference):**
- `src/scenes/training-grounds-scene/TrainingGroundsScene.ts` - Scene pattern
- `src/scenes/castle-menu-scene/CastleMenuScene.ts` - Menu scene pattern
- `src/services/CharacterService.ts` - Pure service functions
- `src/ui/utils/` - Reusable UI helpers

**Type Definitions:**
- `src/types/Character.ts` - Character interface
- `src/types/CharacterClass.ts` - Classes + requirements
- `src/types/Race.ts` - Races + modifiers
- `src/types/GameState.ts` - Game state structure

---

## Success Criteria

When you're done, the codebase should have:

✅ All 13 tasks completed
✅ All tests passing (estimate: 220+ tests)
✅ Test suite runs in <2.5s
✅ No TypeScript errors
✅ All flows working end-to-end:
  - Create character → appears in roster
  - View roster → can inspect any character
  - Inspect character → shows all details
  - All navigation flows return correctly

✅ Code follows all project standards
✅ Conventional commit messages
✅ No breaking changes to existing functionality

---

## Questions?

If you're unsure about anything:
1. Check the full plan: `docs/plans/2025-10-27-training-grounds-scenes.md`
2. Look at existing implementations for patterns
3. Read the UI documentation in `docs/ui/scenes/`
4. Check `CLAUDE.md` for project-wide guidelines

**Good luck!** 🚀
