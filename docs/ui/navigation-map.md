# UI Navigation Map

**Complete navigation flow for all 14 scenes.**

---

## Overview

Wizardry 1 uses a **hub-and-spoke navigation model** with Castle Menu as the central hub. All town services are accessed through the Castle, while dungeon access goes through Edge of Town.

**Navigation Principles:**
- **Single-keystroke navigation:** Press first letter of action (no Enter needed)
- **Case-insensitive:** 'G' and 'g' both work
- **Invalid keys:** Beep or error message
- **Context-sensitive:** Some keys mean different things in different scenes

---

## Complete Navigation Diagram

```mermaid
stateDiagram-v2
    [*] --> TitleScreen: Start Application

    TitleScreen --> CastleMenu: (S)tart Game

    state CastleMenu {
        [*] --> MainMenu
        MainMenu --> MainMenu: Display options
    }

    CastleMenu --> Tavern: (G)ilgamesh's Tavern
    CastleMenu --> Temple: (T)emple of Cant
    CastleMenu --> Shop: (B)oltac's Trading Post
    CastleMenu --> Inn: (A)dventurer's Inn
    CastleMenu --> EdgeOfTown: (E)dge of Town

    Tavern --> CastleMenu: (L)eave
    Temple --> CastleMenu: (L)eave
    Shop --> CastleMenu: (L)eave
    Inn --> CastleMenu: (L)eave

    EdgeOfTown --> CastleMenu: (C)astle
    EdgeOfTown --> TrainingGrounds: (T)raining Grounds
    EdgeOfTown --> Camp: (M)aze
    EdgeOfTown --> Utilities: (U)tilities
    EdgeOfTown --> [*]: (L)eave Game

    TrainingGrounds --> EdgeOfTown: (L)eave
    Utilities --> EdgeOfTown: (L)eave

    Camp --> Maze: (L)eave Camp
    Camp --> EdgeOfTown: (E)dge of Town

    Maze --> Combat: Random Encounter
    Maze --> Combat: Fixed Encounter
    Maze --> Camp: (C)amp

    Combat --> Maze: Victory (no treasure)
    Combat --> Chest: Victory + Treasure
    Combat --> GameOver: Party Wiped

    Chest --> Maze: (L)eave / Open Complete

    state "Character Inspection (Multi-Context)" as CharInspect {
        [*] --> InspectView
        InspectView --> InspectView: Navigate stats
    }

    Tavern --> CharInspect: (#)Inspect
    Camp --> CharInspect: (#)Inspect
    CharInspect --> Tavern: (L)eave from Tavern
    CharInspect --> Camp: (L)eave from Camp
```

---

## Scene Categories

### Safe Zone (Auto-save on entry)
- Title Screen
- Castle Menu (central hub)
- Training Grounds
- Gilgamesh's Tavern
- Boltac's Trading Post
- Temple of Cant
- Adventurer's Inn
- Edge of Town
- Utilities Menu

### Dungeon Zone (No auto-save)
- Camp (pre-dungeon staging)
- Maze (exploration)
- Combat (battles)
- Chest (treasure)

### Multi-Context
- Character Inspection (adapts based on parent scene)

---

## Navigation Patterns

### Hub Navigation (from Castle Menu)

```
Castle Menu (Central Hub)
├─ (G) → Gilgamesh's Tavern → (L) → Castle Menu
├─ (T) → Temple of Cant → (L) → Castle Menu
├─ (B) → Boltac's Trading Post → (L) → Castle Menu
├─ (A) → Adventurer's Inn → (L) → Castle Menu
└─ (E) → Edge of Town → (C) → Castle Menu
```

### Dungeon Entry Flow

```
Castle Menu
  → (E) Edge of Town
    → (M) Camp
      → (L) Maze
        → Random/Fixed Encounter → Combat
          → Victory → Chest (optional)
            → Maze
        → (C) Camp
```

### Character Inspection (Context-Aware)

```
From Tavern:
  Tavern → (#) → Inspection → (L) → Tavern

From Camp:
  Camp → (#) → Inspection → (L) → Camp
```

---

## State-Based Navigation Rules

### Castle Menu Access

**Requirements:**
- Party NOT in maze
- Auto-saves on entry

**Restrictions:**
- Cannot access if party is IN_MAZE status
- Must return to Edge of Town first via LOKTOFEIT spell or death

### Dungeon Entry

**Requirements:**
- Party formed (1-6 characters)
- All party members OK or wounded (not dead/ashes/lost)
- Party NOT already in maze

**Restrictions:**
- Cannot enter with dead party members
- Cannot re-enter if already IN_MAZE

### Town Services

**Requirements vary by service:**
- **Temple:** Need dead/ashes/afflicted characters to heal
- **Shop:** Need gold to buy
- **Inn:** Need characters to level up or rest
- **Training Grounds:** No restrictions (can always create)

---

## Navigation Keys Reference

### Universal Keys (available in most scenes)

| Key | Action | Context |
|-----|--------|---------|
| (L) | Leave | Returns to parent scene |
| (#) | Inspect Character | Available in Tavern, Camp |
| (?) | Help | Context-sensitive help (if implemented) |

### Castle Menu Keys

| Key | Action | Destination |
|-----|--------|-------------|
| (G) | Gilgamesh's Tavern | Party formation |
| (T) | Temple of Cant | Healing/resurrection |
| (B) | Boltac's Trading Post | Buy/sell items |
| (A) | Adventurer's Inn | Rest/level up |
| (E) | Edge of Town | Gateway to dungeon |

### Edge of Town Keys

| Key | Action | Destination |
|-----|--------|-------------|
| (C) | Castle | Return to Castle Menu |
| (T) | Training Grounds | Create characters |
| (M) | Maze | Enter dungeon (via Camp) |
| (U) | Utilities | System functions |
| (L) | Leave Game | Exit application |

### Maze Keys

| Key | Action | Effect |
|-----|--------|--------|
| (W) | Forward | Move forward one tile |
| (A) | Strafe Left | Move left without turning |
| (S) | Backward | Move backward one tile |
| (D) | Strafe Right | Move right without turning |
| (Q) | Turn Left | Rotate 90° left |
| (E) | Turn Right | Rotate 90° right |
| (C) | Camp | Return to Camp scene |
| (K) | Kick Door | Force open door ahead |
| (I) | Inspect | Inspect current tile |

---

## Error Handling

### Invalid Navigation Attempts

**Scenario:** User tries to enter dungeon with dead party member

**Response:**
```
YOU CANNOT ENTER THE DUNGEON WITH DEAD PARTY MEMBERS.
VISIT THE TEMPLE FIRST.
```

**Scenario:** User tries to access Castle Menu while IN_MAZE

**Response:**
```
YOUR PARTY IS IN THE MAZE.
YOU MUST RETURN TO TOWN FIRST.
```

**Scenario:** User presses invalid key in menu

**Response:**
```
[BEEP]
INVALID SELECTION
```

---

## Implementation Notes

### Navigation Service

```typescript
interface NavigationService {
  canNavigateTo(from: SceneType, to: SceneType, state: GameState): NavigationResult
  navigate(from: SceneType, to: SceneType, state: GameState): GameState
  getAvailableActions(scene: SceneType, state: GameState): Action[]
}

interface NavigationResult {
  allowed: boolean
  reason?: string
  warning?: string
}
```

### State Transitions

**Safe transitions (always save before):**
- Any scene → Castle Menu
- Castle Menu → Any town service
- Edge of Town → Leave Game

**Risky transitions (no save):**
- Camp → Maze
- Maze → Combat
- Combat → anywhere (depends on outcome)

### Navigation Commands

- `NavigateToSceneCommand` - Generic scene transition
- `EnterDungeonCommand` - Special validation for maze entry
- `ReturnToTownCommand` - Special handling for LOKTOFEIT or death
- `LeaveGameCommand` - Save and exit

---

## Related Documentation

- [UI Patterns](./ui-patterns.md) - Reusable menu patterns
- [State Management](./state-management.md) - State transition rules
- [Individual Scenes](./scenes/) - Detailed scene documentation
