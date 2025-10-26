# Maze (Dungeon Exploration)

## Overview

**Description:** The dungeon exploration scene where the party navigates the 10-level labyrinth, searching for treasure, fighting monsters, and uncovering secrets.

**Scene Type:** Dungeon Zone (no auto-save, high risk)

**Location in Game Flow:** Core gameplay loop - entered from Camp, returns to Camp or Combat

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Camp → (L)eave Camp → Maze
- Combat → Victory → Maze
- Chest → (L)eave / Complete → Maze

**Re-entry:**
- If party is IN_MAZE status and game is loaded, starts in Camp with option to continue

### Requirements

**State Requirements:**
- [ ] Party formed (1-6 characters)
- [ ] All party members OK or wounded (not dead/ashes)
- [ ] Party not already IN_MAZE (unless re-entering)
- [ ] Entered through Camp scene

### State Prerequisites

```typescript
interface MazeEntryState {
  party: Party           // Must have 1-6 members
  partyStatus: PartyStatus // Must be OK or WOUNDED
  inMaze: boolean       // True if continuing, false if new entry
  currentLevel: number  // 1-10
  position: Position    // Current coordinates
  facing: Direction     // N, S, E, W
}
```

---

## UI Layout

### Screen Regions

- **Header:** Current level, coordinates (if DUMAPIC cast), facing
- **Main:** 3D first-person dungeon view (or wireframe)
- **Party Status:** Character names, HP, status
- **Message Log:** Recent events, combat messages
- **Command Prompt:** Available actions

### ASCII Mockup (Text-based version)

```
┌─────────────────────────────────────┐
│  MAZE LEVEL 1    N  (0,0)          │
├─────────────────────────────────────┤
│                                     │
│         [3D Dungeon View]           │
│                                     │
│    ███████████████████████         │
│    █                     █         │
│    █   You are here      █         │
│    █         ↑           █         │
│    █       (N)           █         │
│    █                     █         │
│    ███████████████████████         │
│                                     │
├─────────────────────────────────────┤
│  PARTY:                             │
│  1. Gandalf    12/15 HP  OK        │
│  2. Corak      25/30 HP  OK        │
│  3. Thief      8/10 HP   WOUNDED   │
├─────────────────────────────────────┤
│  (W)Forward  (S)Backward            │
│  (A)Strafe L (D)Strafe R            │
│  (Q)Turn L   (E)Turn R              │
│  (K)ick Door (I)nspect              │
│  (C)amp                             │
└─────────────────────────────────────┘
```

**Note:** Original game used 3D wireframe graphics. Modern remake may use:
- 3D rendered view
- Wireframe (retro style)
- Text descriptions (fully accessible)

---

## Available Actions

### (W) Move Forward

**Description:** Move party forward one tile in facing direction

**Key Binding:** W

**Requirements:**
- Tile ahead is not a wall
- No locked door blocking path

**Flow:**
1. User presses 'W'
2. Check tile ahead for walls/doors
3. If clear, move party forward
4. Check for random encounter (10% per move)
5. Check for fixed encounter
6. Update position and view

**Validation:**

```typescript
function canMoveForward(state: GameState): { allowed: boolean; reason?: string } {
  const ahead = getTileAhead(state.position, state.facing)

  if (ahead.hasWall(state.facing)) {
    return { allowed: false, reason: "A wall blocks your path" }
  }

  if (ahead.hasDoor(state.facing) && ahead.door.locked) {
    return { allowed: false, reason: "A locked door blocks your path" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `state.position = newPosition`
- `state.encounterCheck = rollEncounter()`
- If encounter: `state.currentScene = SceneType.COMBAT`

**UI Feedback:**
- Success: View updates, position changes
- Failure: "A WALL BLOCKS YOUR PATH" or "A LOCKED DOOR BLOCKS YOUR PATH"

**Transitions:**
- → Combat (if encounter triggered)
- → Maze (continue exploring)

---

### (S) Move Backward

**Description:** Move party backward one tile (opposite of facing direction)

**Key Binding:** S

**Requirements:**
- Tile behind is not a wall

**Flow:**
1. User presses 'S'
2. Check tile behind for walls
3. If clear, move party backward
4. Check for random encounter (10% per move)
5. Update position and view

**Validation:**

```typescript
function canMoveBackward(state: GameState): { allowed: boolean; reason?: string } {
  const behind = getTileBehind(state.position, state.facing)

  if (behind.hasWall(getOppositeDirection(state.facing))) {
    return { allowed: false, reason: "A wall blocks your path" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `state.position = newPosition`
- `state.encounterCheck = rollEncounter()`

**UI Feedback:**
- Success: View updates, position changes
- Failure: "A WALL BLOCKS YOUR PATH"

---

### (A) Strafe Left

**Description:** Move left without changing facing direction

**Key Binding:** A

**Requirements:**
- Tile to left is not a wall

**Flow:**
1. User presses 'A'
2. Check tile to left for walls
3. If clear, move party left
4. Check for random encounter
5. Update position (facing unchanged)

**Validation:**

```typescript
function canStrafeLeft(state: GameState): { allowed: boolean; reason?: string } {
  const left = getTileToLeft(state.position, state.facing)

  if (left.hasWall(getLeftDirection(state.facing))) {
    return { allowed: false, reason: "A wall blocks your path" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `state.position = newPosition`
- `state.facing` unchanged

---

### (D) Strafe Right

**Description:** Move right without changing facing direction

**Key Binding:** D

**Requirements:**
- Tile to right is not a wall

**Flow:**
1. User presses 'D'
2. Check tile to right for walls
3. If clear, move party right
4. Check for random encounter
5. Update position (facing unchanged)

---

### (Q) Turn Left

**Description:** Rotate facing direction 90° counter-clockwise

**Key Binding:** Q

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'Q'
2. Update facing direction
3. Update view

**State Changes:**
- `state.facing = rotateLeft(state.facing)`

**UI Feedback:**
- View rotates left instantly

---

### (E) Turn Right

**Description:** Rotate facing direction 90° clockwise

**Key Binding:** E

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'E'
2. Update facing direction
3. Update view

**State Changes:**
- `state.facing = rotateRight(state.facing)`

**UI Feedback:**
- View rotates right instantly

---

### (K) Kick Door

**Description:** Attempt to force open a locked door

**Key Binding:** K

**Requirements:**
- Door exists directly ahead
- Door is locked

**Flow:**
1. User presses 'K'
2. Check for door ahead
3. If door exists and is locked:
   a. Select strongest fighter
   b. Roll STR check vs door difficulty
   c. On success: door opens
   d. On failure: possible damage to character
4. Update door state

**Validation:**

```typescript
function canKickDoor(state: GameState): { allowed: boolean; reason?: string } {
  const ahead = getTileAhead(state.position, state.facing)

  if (!ahead.hasDoor(state.facing)) {
    return { allowed: false, reason: "There is no door ahead" }
  }

  if (!ahead.door.locked) {
    return { allowed: false, reason: "The door is already open" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `door.locked = false` (on success)
- `character.hp -= damage` (on failure)

**UI Feedback:**
- Success: "THE DOOR BURSTS OPEN!"
- Failure: "[Name] SLAMS INTO THE DOOR! (2 HP damage)"

---

### (I) Inspect

**Description:** Examine current tile for secret doors, traps, or details

**Key Binding:** I

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'I'
2. Show detailed tile description
3. Check for hidden features (secret doors)
4. Display results

**UI Feedback:**
- "YOU ARE IN A 20' x 20' CORRIDOR."
- "EXITS: NORTH, EAST"
- "YOU NOTICE NOTHING UNUSUAL."

**Transitions:**
- Remains in Maze

---

### (C) Camp

**Description:** Return to Camp scene to rest, reorganize, or leave dungeon

**Key Binding:** C

**Requirements:**
- None (always available, emergency escape)

**Flow:**
1. User presses 'C'
2. Transition to Camp scene
3. Preserve IN_MAZE status

**State Changes:**
- `state.currentScene = SceneType.CAMP`
- `state.party.inMaze = true` (preserved)

**UI Feedback:**
- Instant transition to Camp

**Transitions:**
- → Camp

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Camp | (C) | Camp | Always |
| Stairs Down | (D)escend | Maze (next level) | On stairs tile |
| Stairs Up | (A)scend | Maze (prev level) | On stairs tile |

**Special Exits:**
- Random/Fixed Encounter → Combat
- Victory + Treasure → Chest → Maze

### Parent Scene

- Camp → (L)eave Camp → Maze

### Child Scenes

- Maze → Combat (encounters)
- Maze → Chest (post-combat treasure)
- Maze → Camp (player choice)

---

## State Management

### Scene State

```typescript
interface MazeState {
  mode: 'EXPLORING' | 'INSPECTING' | 'IN_ENCOUNTER'
  position: Position
  facing: Direction
  currentLevel: number
  lightRadius: number  // Affected by MILWA/LOMILWA spells
  encounterSteps: number  // Track steps since last encounter
  messageLog: string[]
}
```

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.MAZE`
- `state.party.inMaze = true`
- NO auto-save (dangerous zone)

**On Movement:**
- Update position/facing
- Roll encounter check (10% per move)
- Trigger fixed encounters if on special tile

**On Exit to Camp:**
- Preserve `inMaze` status
- Allow return to Maze

### Persistence

- **Auto-save:** NO (dungeon zone is high-risk)
- **Manual save:** NO (must return to town via LOKTOFEIT or death)
- **State preservation:** Position/facing preserved when returning to Camp

---

## Encounter System

### Random Encounters

**Trigger Rate:** 10% per movement action (W/S/A/D)

**Roll:**
```typescript
function checkRandomEncounter(steps: number): boolean {
  const roll = random(1, 100)
  return roll <= 10
}
```

**Enemy Selection:**
- Based on dungeon level (1-10)
- Weighted by monster rarity
- 1-4 enemy groups

### Fixed Encounters

**Trigger:** Entering specific tile coordinates

**Behavior:**
- Guaranteed encounter on first visit
- May respawn after time (depends on monster)
- Often guards treasure or special items

**Example:**
- Level 4 @ (10,10): Werdna's Throne Room (end boss)

---

## Special Tiles

### Stairs

**Down Stairs:**
- Press (D)escend to go deeper
- Leads to next level (1→2, 2→3, etc.)
- Cannot descend past level 10

**Up Stairs:**
- Press (A)scend to go up
- Leads to previous level (2→1, 3→2, etc.)
- Level 1 stairs lead to Camp/Castle

### Chutes

**Description:** One-way teleport (usually down)

**Behavior:**
- Instantly teleport to different level/position
- Cannot avoid (triggers on entry)
- Often leads to dangerous areas

### Anti-Magic Zones

**Description:** Areas where spells fail

**Behavior:**
- MILWA/LOMILWA fail (darkness)
- Combat spells may fail
- MALOR teleport fails

### Dark Zones

**Description:** Areas where light doesn't work

**Behavior:**
- Even LOMILWA cannot illuminate
- Reduced visibility
- Higher chance of surprise encounters

---

## Implementation Notes

### Services Used

- `DungeonNavigationService.moveParty(direction)`
- `EncounterService.rollRandomEncounter(level, steps)`
- `DungeonService.getTile(level, position)`
- `LightService.calculateVisibility(lightRadius, position)`

### Commands

- `MoveForwardCommand` - Move party forward
- `MoveBackwardCommand` - Move party backward
- `StrafeLeftCommand` - Strafe left
- `StrafeRightCommand` - Strafe right
- `TurnLeftCommand` - Rotate left
- `TurnRightCommand` - Rotate right
- `KickDoorCommand` - Force door open
- `InspectTileCommand` - Examine current tile
- `ReturnToCampCommand` - Return to Camp

### Edge Cases

1. **Moving into wall:**
   - Show error message
   - Do not consume action
   - Do not roll encounter

2. **Encounter during turn/strafe:**
   - Turning does not trigger encounters
   - Only forward/backward/strafe movement triggers

3. **Chute activation:**
   - Cannot be avoided
   - May trigger mid-combat (teleports entire party)

4. **Party wipe in dungeon:**
   - Game over OR
   - Return to town (bodies in dungeon, can recover with KANDI spell)

### Technical Considerations

- **3D rendering:** Wireframe or textured (design choice)
- **Movement smoothing:** Instant vs animated transitions
- **Encounter animations:** Transition to combat scene
- **Light radius:** Affects visibility range (default 1 tile without MILWA)

---

## Testing Scenarios

### Test 1: Basic Movement
```
1. Enter Maze from Camp
2. Press (W) to move forward
3. Verify position updates
4. Press (Q) to turn left
5. Verify facing changes
6. Press (C) to return to Camp
7. Verify returns to Camp with IN_MAZE status
```

### Test 2: Wall Collision
```
1. Face a wall
2. Press (W) to move forward
3. Verify error message appears
4. Verify position unchanged
5. Verify no encounter rolled
```

### Test 3: Random Encounter
```
1. Move around dungeon (W/S/A/D)
2. Trigger random encounter (may take several moves)
3. Verify transitions to Combat scene
4. Win combat
5. Verify returns to Maze at same position
```

### Test 4: Door Interaction
```
1. Find locked door
2. Press (K) to kick
3. Verify STR check rolls
4. On success: verify door opens
5. Press (W) to move through
6. Verify movement succeeds
```

---

## Related Documentation

- [Camp](./09-camp.md) - Parent scene
- [Combat](./11-combat.md) - Encounter scene
- [Chest](./12-chest.md) - Post-combat treasure
- [Dungeon System](../../systems/dungeon-system.md) - Dungeon generation
- [Combat System](../../systems/combat-system.md) - Encounter mechanics
- [Navigation Map](../navigation-map.md) - Complete flow
