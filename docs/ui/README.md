# User Interface Documentation

**Complete UI flow documentation for Wizardry 1: Proving Grounds of the Mad Overlord**

## Overview

This documentation provides comprehensive coverage of all 14 user interface scenes, navigation flows, UI patterns, state management, and input handling for the Wizardry 1 remake project.

**Status:** ✅ Complete

## Documentation Statistics

- **Total Files:** 20 documentation files
- **Total Lines:** 13,250+ lines of documentation
- **Scene Coverage:** 14/14 scenes (100%)
- **Supporting Guides:** 4 comprehensive guides
- **Code Examples:** TypeScript interfaces and validation logic throughout
- **Visual Aids:** ASCII mockups for all scenes + Mermaid navigation diagrams

## Contents

### Core Documentation
- [Navigation Map](./navigation-map.md) - Complete navigation flow diagram with Mermaid state chart
- [UI Patterns](./ui-patterns.md) - 7 reusable UI patterns used across all scenes
- [State Management](./state-management.md) - Application state structure and transition rules
- [Input Reference](./input-reference.md) - Complete keyboard shortcuts and input handling guide

### Scene Documentation
All 14 scenes are fully documented in [./scenes/](./scenes/) directory.

## Scene List

### Safe Zone Scenes (9 scenes)
Auto-save on entry, safe for experimentation

1. [Title Screen](./scenes/00-title-screen.md) - Game launcher, new/load game
2. [Castle Menu](./scenes/01-castle-menu.md) - **Central Hub** for all town services
3. [Training Grounds](./scenes/02-training-grounds.md) - Character creation and deletion
4. [Gilgamesh's Tavern](./scenes/03-gilgameshs-tavern.md) - Party formation and roster management
5. [Boltac's Trading Post](./scenes/04-boltacs-trading-post.md) - Buy/sell equipment
6. [Temple of Cant](./scenes/05-temple-of-cant.md) - Healing, resurrection, ailment curing
7. [Adventurer's Inn](./scenes/06-adventurers-inn.md) - Rest, spell recovery, leveling up
8. [Edge of Town](./scenes/07-edge-of-town.md) - Gateway to dungeon and utilities
9. [Utilities Menu](./scenes/08-utilities-menu.md) - System functions, save/load

### Dungeon Zone Scenes (4 scenes)
No auto-save, high-risk areas

10. [Camp](./scenes/09-camp.md) - Pre-dungeon staging area, party inspection
11. [Maze](./scenes/10-maze.md) - First-person dungeon exploration
12. [Combat](./scenes/11-combat.md) - Turn-based battle interface
13. [Chest](./scenes/12-chest.md) - Post-combat treasure and trap handling

### Multi-Context Scenes (1 scene)
Adapts based on parent scene

14. [Character Inspection](./scenes/13-character-inspection.md) - Detailed character stats and inventory

## Quick Navigation Guides

### For New Players

**First Time Setup:**
```
Title Screen → (S)tart Game → Castle Menu
└→ Edge of Town → (T)raining Grounds
   └→ Create characters
      └→ (L)eave → Edge of Town → (C)astle
         └→ Gilgamesh's Tavern → Form party
```

**Your First Dungeon Run:**
```
Castle Menu → Edge of Town → (M)aze
└→ Camp → Inspect party → (L)eave Camp
   └→ Maze → Explore → Random Encounter
      └→ Combat → Victory
         └→ Maze → (C)amp
            └→ (E)dge of Town → Castle Menu
```

### For Common Tasks

**Character Creation:**
```
Castle Menu → Edge of Town → Training Grounds → Create Character
```

**Party Formation:**
```
Castle Menu → Gilgamesh's Tavern → Add/Remove characters
```

**Shopping for Equipment:**
```
Castle Menu → Boltac's Trading Post → (B)uy or (S)ell
```

**Healing and Resurrection:**
```
Castle Menu → Temple of Cant → Select service
```

**Rest and Level Up:**
```
Castle Menu → Adventurer's Inn → Select character → Rest/Level Up
```

**Entering the Dungeon:**
```
Castle Menu → Edge of Town → Maze → Camp → Leave Camp
```

**Saving the Game:**
```
Edge of Town → (L)eave Game (auto-saves)
OR
Edge of Town → Utilities → Save Game
```

## Architecture

### Navigation Model

**Hub-and-Spoke Design:**
- **Castle Menu** is the central hub for all town services
- All safe zone services branch from Castle Menu
- **Edge of Town** serves as gateway to dungeon and utilities
- Dungeon has separate flow: Camp → Maze → Combat → Chest

### Key Design Principles

1. **Single-Keystroke Interface**
   - First letter navigation (no Enter key needed)
   - Case-insensitive input ('G' = 'g')
   - Immediate response to keypress

2. **Context-Sensitive Navigation**
   - Some screens adapt based on parent scene
   - Example: Character Inspection returns to calling scene (Tavern or Camp)

3. **State-Based Validation**
   - All scene transitions validated against game state
   - Prevent invalid actions (e.g., can't enter dungeon with dead party members)
   - Clear error messages explain why actions are blocked

4. **Safe vs Risky Zones**
   - **Safe Zones:** Auto-save on entry, low risk
   - **Dungeon Zones:** No auto-save, permanent consequences

### Implementation Guidance

#### Scene Structure

Each scene follows this pattern:
```typescript
interface Scene {
  type: SceneType
  entry: EntryConditions     // What's required to enter
  layout: UILayout           // Screen regions and mockup
  actions: Action[]          // Available user actions
  navigation: NavigationMap  // Entry/exit points
  state: SceneState          // Local scene state
  validation: ValidationRules // Action preconditions
}
```

#### State Management

**Global State:**
```typescript
interface GameState {
  currentScene: SceneType
  characters: Character[]     // All created characters
  party: Party                // Active party (1-6 members)
  dungeon: DungeonState       // Maze position, encounters
  settings: GameSettings      // Preferences, difficulty
}
```

**Scene Transitions:**
- Always validate before transition
- Auto-save in safe zones
- Preserve state in dungeon zones
- Clear temporary state on major transitions

#### Input Handling

**Three Input Modes:**
1. **Single Keystroke:** Menu navigation (most scenes)
2. **Numeric Input:** Character/item selection
3. **Text Input:** Character naming (Training Grounds only)

**Example:**
```typescript
// Single keystroke (Castle Menu)
const key = await waitForSingleKeystroke(['G', 'T', 'B', 'A', 'E'])

// Numeric input (Tavern)
const index = await waitForNumericInput(1, 6) // Select party slot

// Text input (Training Grounds)
const name = await waitForTextInput(15) // Max 15 characters
```

#### Validation Pattern

All actions use consistent validation:
```typescript
function canPerformAction(state: GameState): ValidationResult {
  // Check preconditions
  if (!preconditionMet) {
    return {
      allowed: false,
      reason: "User-friendly error message"
    }
  }

  return { allowed: true }
}
```

## UI Patterns Reference

The [UI Patterns Guide](./ui-patterns.md) documents 7 reusable patterns:

1. **Standard Menu Pattern** - Menu with single-keystroke actions
2. **Character Selection Pattern** - Numbered character lists
3. **Single-Keystroke Input Pattern** - Immediate keypress handling
4. **Error Handling Pattern** - Consistent error messaging
5. **Confirmation Dialog Pattern** - Destructive action confirmation
6. **Multi-Step Transaction Pattern** - Validated step-by-step flows
7. **List Navigation Pattern** - Paginated list browsing

**Pattern Usage Matrix:**
See [UI Patterns](./ui-patterns.md) for which patterns each scene uses.

## State Management

The [State Management Guide](./state-management.md) covers:

- **GameState Interface:** Complete state structure
- **Scene State:** Local state per scene type
- **Transition Rules:** Valid state transitions
- **Persistence:** Auto-save vs manual save rules
- **Validation:** State preconditions for actions
- **Edge Cases:** Handling party wipe, lost characters, etc.

**Key Concepts:**

- **IN_MAZE Status:** Party cannot access Castle Menu while in dungeon
- **Auto-Save Zones:** Castle Menu and all town services
- **No-Save Zones:** Camp, Maze, Combat, Chest
- **State Validation:** All transitions validated before execution

## Input Reference

The [Input Reference Guide](./input-reference.md) provides:

- **Complete Key Bindings:** All shortcuts organized by scene
- **Universal Keys:** (L)eave, (#)Inspect, etc.
- **Context-Specific Keys:** Scene-specific shortcuts
- **Special Keys:** System keys (Escape, F1-F12)
- **Accessibility:** Keyboard-only navigation

**Quick Reference:**

| Key | Universal Action | Context |
|-----|------------------|---------|
| (L) | Leave | Returns to parent scene (most scenes) |
| (#) | Inspect Character | Available in Tavern, Camp |
| (?) | Help | Context-sensitive help (optional) |

## Navigation Map

The [Navigation Map](./navigation-map.md) includes:

- **Complete Mermaid State Diagram:** Visual flow of all scenes
- **Hub Navigation:** Castle Menu spoke pattern
- **Dungeon Flow:** Camp → Maze → Combat → Chest
- **State-Based Rules:** Navigation validation logic
- **Error Handling:** Invalid navigation attempt messages

**High-Level Flow:**
```
Title Screen
    ↓
Castle Menu (Hub)
    ├→ Tavern
    ├→ Temple
    ├→ Shop
    ├→ Inn
    └→ Edge of Town
        ├→ Training Grounds
        ├→ Utilities
        └→ Maze
            └→ Camp → Maze → Combat → Chest
```

## Testing Scenarios

Each scene documentation includes specific test cases:

- **Happy Path:** Normal usage flow
- **Error Cases:** Invalid input handling
- **Edge Cases:** Boundary conditions
- **State Validation:** Precondition checks
- **Navigation:** Entry/exit transitions

**Example Test (from Combat scene):**
```
Test: Character Death
1. Enter combat with wounded characters
2. Allow enemy to kill character
3. Verify character status changes to DEAD
4. Verify dead character skips turns
5. Win combat
6. Visit Temple for resurrection
```

## Implementation Notes

### Services Architecture

Key services used across scenes:
- `SceneNavigationService` - Scene transitions
- `CharacterService` - Character CRUD operations
- `PartyService` - Party formation and management
- `CombatService` - Battle mechanics
- `DungeonService` - Maze exploration
- `SaveService` - Persistence and auto-save
- `InputService` - Keyboard input handling
- `ValidationService` - State validation

### Command Pattern

All user actions implemented as commands:
- `NavigateToSceneCommand` - Scene transitions
- `CreateCharacterCommand` - Character creation
- `AddToPartyCommand` - Party formation
- `BuyItemCommand` - Shop transactions
- `CastSpellCommand` - Spell casting
- `AttackCommand` - Combat actions

### Scene Template

Use [scene-template.md](./scene-template.md) when documenting new scenes or variants.

## Related Documentation

### Project Documentation
- [Project README](../../README.md) - Project overview
- [Research Documents](../research/) - Original game analysis
- [System Specifications](../systems/) - Game mechanics and systems

### External Resources
- Original Wizardry 1 manual
- Archive.org gameplay videos
- Community wiki and forums

## Contributing

When adding new scenes or updating documentation:

1. **Use the Template:** Start with [scene-template.md](./scene-template.md)
2. **Include Visuals:** ASCII mockup required for all scenes
3. **Document Validation:** Include TypeScript validation logic
4. **Add Test Scenarios:** At least 3 test cases per scene
5. **Cross-Reference:** Link to related scenes and systems
6. **Update This README:** Add new scenes to the scene list

## Version History

- **2025-10-26:** ✅ Complete - All 14 scenes documented, 4 supporting guides complete
- **2025-10-26:** 🚧 In Progress - Tasks 1-10 complete, Task 11 in progress
- **2025-10-26:** Initial structure created

## Questions or Issues?

If you find documentation gaps or errors:

1. Check the specific [scene documentation](./scenes/)
2. Review the [UI Patterns Guide](./ui-patterns.md)
3. Consult the [State Management Guide](./state-management.md)
4. Refer to the [Input Reference](./input-reference.md)
5. Create an issue in the project repository

---

**Documentation Complete.** All 14 scenes fully specified with ASCII mockups, navigation flows, validation logic, and implementation guidance.
