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
