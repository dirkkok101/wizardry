# Scene-Specific Character Cards Design

**Date:** 2025-11-03
**Status:** Approved
**Context:** Refactor from wrapper-based composition to scene-specific card components

---

## Problem Statement

The current character card architecture uses a composition pattern (CharacterCardComponent + CharacterCardWrapperComponent + CharacterCardActionsComponent) that creates several issues:

1. **Excessive Vertical Space**: Cards take 100-140px height, limiting visible cards per screen
2. **Complexity**: Three-layer component architecture (base + wrapper + actions) is hard to maintain
3. **Training Grounds Mismatch**: Training Grounds uses base CharacterCardComponent with hardcoded buttons, while Tavern uses wrapper pattern - inconsistent architecture
4. **Inflexibility**: Wrapper pattern makes scene-specific optimizations difficult

## Design Decision

**Replace all shared character card components with scene-specific implementations.**

Create:
- `TavernCharacterCardComponent` (replaces CharacterCardWrapperComponent + CharacterCardActionsComponent)
- `TrainingGroundsCharacterCardComponent` (replaces CharacterCardComponent)

Retire:
- `CharacterCardComponent`
- `CharacterCardWrapperComponent`
- `CharacterCardActionsComponent`

## Rationale

### Why Scene-Specific Cards?

1. **UX First**: Each scene gets the optimal layout without compromise
2. **Vertical Space**: Horizontal layouts reduce height by 30-43%
3. **Simplicity**: Direct rendering, no wrapper overhead
4. **Clarity**: Each component's purpose is immediately clear from its name
5. **Maintainability**: Changes to one scene don't risk breaking others

### Why Accept Code Duplication?

- Information needs are ~80% similar (name, race, class, level, status)
- ~50 lines of duplicated template/TypeScript per card
- Trade-off: Simple, optimized components > DRY but complex architecture
- SCSS variables ensure visual consistency despite duplication

## Architecture

### Component Structure

```
TavernCharacterCardComponent
├── Template: Horizontal split (60% info, 40% actions)
├── Height: ~80px (down from 140px)
├── Actions: Add/Remove, Move Up/Down, Inspect
└── Inputs: character, isInParty, canMoveUp, canMoveDown

TrainingGroundsCharacterCardComponent
├── Template: Horizontal split (70% info, 30% actions)
├── Height: ~70px (down from 100px)
├── Actions: Inspect, Delete
└── Inputs: character, status
```

### Styling Strategy

**Shared Variables** (`src/styles/_variables.scss`):
- Colors: `$color-text-green`, `$color-bg-black`
- Spacing: `$spacing-xs`, `$spacing-sm`
- Typography: `$font-mono`

**Component-Specific Layouts**:
```scss
// TavernCharacterCardComponent
@use '../../styles/variables' as *;

.tavern-character-card {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: $spacing-sm;
  height: 80px;
  // ... uses shared variables
}
```

### TypeScript API

**TavernCharacterCardComponent**:
```typescript
@Input() character: Character
@Input() isInParty: boolean
@Input() canMoveUp: boolean
@Input() canMoveDown: boolean

@Output() add: EventEmitter<string>
@Output() remove: EventEmitter<string>
@Output() moveUp: EventEmitter<string>
@Output() moveDown: EventEmitter<string>
@Output() inspect: EventEmitter<string>
```

**TrainingGroundsCharacterCardComponent**:
```typescript
@Input() character: Character
@Input() status: CharacterStatus

@Output() inspect: EventEmitter<string>
@Output() delete: EventEmitter<string>
```

## Vertical Space Optimization

### Before
- **Tavern**: 140px per card (wrapper + actions + padding)
- **Training Grounds**: 100px per card (card + actions + padding)

### After
- **Tavern**: 80px per card (43% reduction) → ~50% more cards visible
- **Training Grounds**: 70px per card (30% reduction) → ~40% more cards visible

### Layout Strategy
- **Horizontal Split**: Info left, actions right (versus current stacked vertical)
- **Fixed Heights**: Consistent card heights improve scanability
- **Compact Actions**: Buttons sized/arranged for minimum space

## Migration Plan

### Phase 1: Create New Components (TDD)
1. Create `TavernCharacterCardComponent` with tests
2. Create `TrainingGroundsCharacterCardComponent` with tests
3. Verify tests pass before integration

### Phase 2: Integrate Scene-by-Scene
1. Update `TavernComponent` template to use `<app-tavern-character-card>`
2. Update event handlers (already compatible)
3. Verify tavern functionality
4. Update `TrainingGroundsComponent` template to use `<app-training-grounds-character-card>`
5. Update event handlers
6. Verify training grounds functionality

### Phase 3: Cleanup
1. Run full test suite (expect 774 passing)
2. Delete old components:
   - `src/components/character-card/`
   - `src/components/character-card-wrapper/`
   - `src/components/character-card-actions/`
3. Update component tests to remove obsolete test files
4. Commit changes

## Testing Strategy

### New Tests Required
- **TavernCharacterCardComponent**: ~15 tests
  - Event emissions (add, remove, moveUp, moveDown, inspect)
  - Disabled state handling (canMoveUp, canMoveDown)
  - Conditional rendering (isInParty determines visible buttons)

- **TrainingGroundsCharacterCardComponent**: ~8 tests
  - Event emissions (inspect, delete)
  - Status badge display
  - Character info rendering

### Updated Tests
- **TavernComponent Integration**: Update selectors from `app-character-card-wrapper` to `app-tavern-character-card`
- **TrainingGroundsComponent Integration**: Update selectors from `app-character-card` to `app-training-grounds-character-card`

### Test Coverage Goal
- Maintain >89% coverage
- Both new components should achieve 100% coverage (simple presentation logic)

## Breaking Changes

### Component Selectors
- **Before**: `<app-character-card>`, `<app-character-card-wrapper>`
- **After**: `<app-tavern-character-card>`, `<app-training-grounds-character-card>`

### Affected Files
- `src/app/tavern/tavern.component.html` (selector + event handlers)
- `src/app/training-grounds/training-grounds.component.html` (selector + event handlers)

### Non-Breaking
- Component inputs/outputs are backwards compatible
- Parent component logic unchanged
- Service layer unchanged
- No route or API changes

## Rollback Plan

**Low Risk - Isolated Changes**:
- Old components remain until migration complete
- Can test new components without affecting existing scenes
- Easy revert: restore old template selectors
- Changes isolated to presentation layer (no service/state impacts)

## Trade-offs

### Advantages
✅ **Vertical space efficiency**: 30-43% height reduction
✅ **Simplicity**: Direct rendering, no wrappers
✅ **Scene optimization**: Each scene gets exactly what it needs
✅ **Maintainability**: Changes isolated per scene
✅ **Clarity**: Component names indicate purpose

### Disadvantages
⚠️ **Code duplication**: ~50 lines duplicated per card
⚠️ **Consistency risk**: Must manually keep styling aligned (mitigated by SCSS variables)
⚠️ **More files**: 2 components instead of 3-component system (actually same count)

### Accepted Trade-offs
We accept code duplication in exchange for:
- Superior UX (space efficiency)
- Simpler architecture (no wrappers)
- Scene-specific optimization
- Easier reasoning about code

SCSS variables mitigate consistency risk - visual alignment is enforced by shared variables.

## Future Considerations

### If More Scenes Need Cards
- Create scene-specific card component (e.g., `InnCharacterCardComponent`)
- Copy closest existing card as template
- Customize layout/actions for scene needs
- Reference shared SCSS variables for consistency

### If Information Needs Diverge Further
- Scene-specific cards already positioned to handle this
- No shared base class constraining design
- Each scene free to show/hide fields as needed

### If Vertical Space Becomes Critical
- Horizontal layouts already optimized (80px tavern, 70px training)
- Could compress further: reduce padding, smaller fonts, icons instead of text buttons
- Scene-specific approach makes experimentation easy

## Success Criteria

- [x] Design validated with user
- [ ] TavernCharacterCardComponent implemented with tests
- [ ] TrainingGroundsCharacterCardComponent implemented with tests
- [ ] Both scenes updated to use new components
- [ ] All 774+ tests passing
- [ ] Old components deleted
- [ ] Vertical space reduced by target percentages (30-43%)
- [ ] Visual consistency maintained (SCSS variables working)

---

**Decision:** Approved for implementation
**Implementation Lead:** Claude Code
**Review Date:** 2025-11-03
