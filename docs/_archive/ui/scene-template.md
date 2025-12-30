# [Scene Name]

## Overview

**Description:** [What is this scene? What is its purpose?]

**Scene Type:** [Safe Zone / Dungeon Zone / Multi-Context]

**Location in Game Flow:** [Where does this fit in the overall structure?]

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- [Parent Scene] → (Key) → This Scene

**Example:**
- Castle Menu → (G) → Gilgamesh's Tavern

### Requirements

**State Requirements:**
- [ ] [Requirement 1]
- [ ] [Requirement 2]

**Example:**
- [ ] Must have at least one character created
- [ ] Party must not be "IN MAZE" status

### State Prerequisites

```typescript
interface EntryState {
  // Define required state for entry
}
```

---

## UI Layout

### Screen Regions

- **Header:** [Title, context info]
- **Main:** [Primary content area]
- **Menu:** [Available actions]
- **Status:** [Party/character status]
- **Messages:** [Feedback, errors]

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  [SCENE TITLE]                     │
├─────────────────────────────────────┤
│                                     │
│  [Main Content Area]                │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  (X)Action 1                        │
│  (Y)Action 2                        │
│  (L)eave                            │
└─────────────────────────────────────┘
```

### Header Components

**Purpose:** Provide consistent scene identification and context across all game screens.

**Standard Header Layout:**

Minimal (title only):
```
┌─────────────────────────────────────────┐
│  SCENE TITLE                            │
└─────────────────────────────────────────┘
```

With metadata (title + party gold):
```
┌─────────────────────────────────────────┐
│  SCENE TITLE        PARTY GOLD: 150 GP  │
└─────────────────────────────────────────┘
```

With location context (dungeon scenes):
```
┌─────────────────────────────────────────┐
│  MAZE LEVEL 1            N              │
│  (5,8)                   Facing North   │
└─────────────────────────────────────────┘
```

**Three Variants:**

1. **Minimal Header** - Title only
   - Use for: Castle Menu, Edge of Town, Title Screen
   - Component: `<app-scene-title title="CASTLE" />`

2. **Header with Metadata** - Title + party gold
   - Use for: Tavern, Shop, Temple, Inn (any scene with commerce/services)
   - Component: `<app-scene-title title="GILGAMESH'S TAVERN" [showPartyGold]="true" />`
   - Party gold appears right-aligned
   - Format: "PARTY GOLD: X GP"

3. **Header with Location Context** - Title + position + facing
   - Use for: Maze, Camp, Combat
   - Shows dungeon level, coordinates, facing direction
   - Updates in real-time as party moves

**Implementation:**

All scenes MUST use `SceneTitleComponent` - no hardcoded headers in templates.

Import in component:
```typescript
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';

@Component({
  // ...
  imports: [CommonModule, SceneTitleComponent, /* other imports */]
})
```

Template usage:
```html
<app-scene-title
  title="SCENE NAME"
  [showPartyGold]="true"  <!-- Optional: for commerce scenes -->
/>
```

**Party Gold Display:**

The party gold system uses a **shared gold pool** for all party members. There is no individual character gold or "divvy gold" functionality. Gold transactions affect the party total directly.

Show party gold in header for:
- Tavern (party formation, adding/removing characters)
- Shop (buying/selling equipment)
- Temple (healing, resurrection services with cost)
- Inn (room rental costs)

### Footer Components

**Purpose:** Provide consistent horizontal interactive menu with contextual actions across all screens.

**Standard Footer Layout:**

Minimal (single action):
```
┌─────────────────────────────────────────┐
│  [Main Content]                         │
├─────────────────────────────────────────┤
│  ESC: Return to Castle                  │
└─────────────────────────────────────────┘
```

Multiple contextual actions:
```
┌─────────────────────────────────────────┐
│  [Main Content]                         │
├─────────────────────────────────────────┤
│  ESC: Leave  |  I: Inspect  |  ?: Help  │
└─────────────────────────────────────────┘
```

**Key Design Rules:**

1. **Horizontal layout** - All actions in single row, separated by ` | `
2. **ESC/back action first** (leftmost position)
3. **Interactive** - Items are selectable via shortcuts or mouse clicking
4. **Contextual** - Items change or enable/disable based on scene state
5. **Format**: `KEY: Action Label` (e.g., "D: Divvy Gold", "ESC: Leave")
6. **State-aware** - Disabled items shown dimmed or omitted entirely

**Implementation:**

All scenes MUST use `SceneFooterComponent` for horizontal interactive menu.

Import in component:
```typescript
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { MenuItem } from '../shared/components/menu/menu.component';

@Component({
  // ...
  imports: [CommonModule, SceneFooterComponent, /* other imports */]
})
```

Define menu items as computed signal:
```typescript
readonly footerMenuItems = computed((): MenuItem[] => [
  { id: 'leave', label: 'Return to Castle', shortcut: 'ESC', enabled: true },
  { id: 'action', label: 'Contextual Action', shortcut: 'KEY',
    enabled: this.canPerformAction() },
  { id: 'help', label: 'Help', shortcut: '?', enabled: true }
]);

handleFooterAction(itemId: string): void {
  switch(itemId) {
    case 'leave':
      this.navigateBack();
      break;
    case 'action':
      this.performAction();
      break;
    case 'help':
      this.showHelp();
      break;
  }
}
```

Template usage:
```html
<app-scene-footer
  [menuItems]="footerMenuItems()"
  (itemSelected)="handleFooterAction($event)"
/>
```

**Contextual Menu Design:**

- Return/Leave action typically uses 'L' or 'ESC' shortcut
- Scene-specific actions use intuitive letters (I for Inspect, ? for Help)
- Menu items can be conditionally enabled based on state
- Use computed signals for reactivity to state changes

---

## Available Actions

### (X) [Action Name]

**Description:** [What does this action do?]

**Key Binding:** [Single keystroke]

**Requirements:**
- [Requirement 1]
- [Requirement 2]

**Flow:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Validation:**

```typescript
function canPerformAction(state: GameState): { allowed: boolean; reason?: string } {
  // Validation logic
}
```

**State Changes:**
- `state.property = newValue`

**UI Feedback:**
- Success: "[Success message]"
- Failure: "[Error message]"

**Transitions:**
- → [Destination Scene] (if applicable)

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| [Action] | (X) | [Scene] | [When available] |
| Leave | (L) | [Parent Scene] | Always |

### Parent Scene

- [Parent Scene] → (Key) → This Scene

### Child Scenes

- This Scene → (Key) → [Child Scene]

---

## State Management

### Scene State

```typescript
interface SceneState {
  // Local scene state
  mode: 'MODE_1' | 'MODE_2'
  selectedIndex: number | null
}
```

### Global State Changes

- [What global state does this scene modify?]

### Persistence

- **Auto-save:** [When does auto-save trigger?]
- **Manual save:** [Is manual save available?]

---

## Implementation Notes

### Services Used

- `ServiceName.methodName()`
- `AnotherService.anotherMethod()`

### Commands

- `CommandName` - [What it does]
- `AnotherCommand` - [What it does]

### Edge Cases

1. **[Edge Case 1]:** [How to handle]
2. **[Edge Case 2]:** [How to handle]

### Technical Considerations

- [Technical note 1]
- [Technical note 2]

---

## Related Documentation

- [Link to related scene]
- [Link to related system]
- [Link to related command]
