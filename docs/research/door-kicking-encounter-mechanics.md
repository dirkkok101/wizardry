# Door Kicking and Encounter Mechanics Reference

This document details the encounter triggering mechanics from the original Wizardry 1: Proving Grounds of the Mad Overlord (1981), based on analysis of the re-engineered Pascal source code by Thomas William Ewers and research by the Data Driven Gamer blog.

## Encounter Trigger Mechanisms

The original Wizardry uses three distinct encounter triggering mechanisms:

| Trigger | Encounter Rate | Condition |
|---------|---------------|-----------|
| **Random walking** | 1% per step | Any movement (N/S/E/W) |
| **Kicking door into flagged room** | 12.5% (1 in 8) | Room flagged for fights, no treasure chest present |
| **Treasure room entry** | 100% guaranteed | Room seeded with treasure chest |

## Room vs Corridor System

### Room Flag Per Tile
Every map tile has a flag marking it as either a "room" or a "corridor". In the original, this was stored in the `FIGHTS[]` array per dungeon level.

- **Room tiles**: Can spawn treasure chests, trigger door-kick encounters (12.5%)
- **Corridor tiles**: Only random 1% encounter rate applies

> **Implementation:** In our remake, use `"type": "room"` on tiles. Tiles without a type are implicitly corridors. See [Implementation Notes](#room-tile-identification) for details.

### Treasure Room Seeding
When entering a dungeon level, 9 rooms are randomly seeded with treasure chests:
- The selection algorithm favors **large rooms**
- Rooms near the **lower-left corners** are preferred
- Entering a treasure room **guarantees** an encounter

### FIGHTMAP Runtime Tracking
The `FIGHTMAP[x,y]` array tracks encounter state at runtime:
- Marked `TRUE` when room is eligible for encounter
- Set to `FALSE` after an encounter occurs at that square
- Prevents immediate repeat encounters in the same location
- Kicking the door can reset/re-roll the encounter chance

## Kicking Door Mechanic

The "kick" action (pressing `K`) when facing a door:
1. Checks if destination tile has `FIGHTS[x,y] = TRUE` (is a room)
2. If no treasure chest is present at that location
3. Rolls a 12.5% (1 in 8) chance for encounter
4. If encounter triggers, combat begins upon entering

This mechanic allows players to:
- **Farm encounters** by repeatedly kicking into rooms
- **Grind experience** more efficiently than random walking
- **Reset** encounter eligibility by leaving and re-entering

## Door State and Version Differences

### Version-Specific Door Controls

| Version | Door Mechanism | Notes |
|---------|---------------|-------|
| **Apple II (original)** | Press `K` to kick | Kick = move through in one action |
| **IBM PC** | Walk forward | Automatic, no kick needed |
| **NES/Famicom** | Press A button | Required kick to open |

### No Persistent Door State

The original wireframe dungeon **did not track door open/closed state**:

1. **Doors have no "open" graphic** - they render the same whether you've passed through or not
2. **"Only doors are visible in the world"** - the wireframe shows door outlines, not open/closed states
3. **No open door animation** - kicking moves you through immediately
4. **Looking back shows the same door** - no visual difference after passing through

This design makes sense because:
- The 12.5% encounter roll happens **each time you kick** - doors must remain "kickable"
- Players grind by "kicking down a lot of doors over and over again"
- An "open" door state would break the farming mechanic

### Kick = Movement Through Door

The kick action is **not** "open door then walk in" - it's a single action:
1. Player faces door and presses K (or walks forward on PC)
2. Encounter check happens (12.5% for rooms, 0% for corridors)
3. Player ends up on the other side of the door
4. If encounter triggered, combat begins immediately

### State That DOES Reset

What has state is the **encounter system**, not doors:

| State | Persistence | Reset Trigger |
|-------|-------------|---------------|
| Door open/closed | **None** - no state | N/A |
| FIGHTMAP (encounter eligibility) | Per dungeon visit | Leave dungeon entirely |
| Treasure room seeding | Per dungeon visit | Leave dungeon entirely |
| Monster killed state | Per dungeon visit | Leave dungeon entirely |

Leaving the maze and returning "revives the monsters" - the `FIGHTMAP` and treasure seeding reset completely.

## Special Encounters (SQRETYPE = ENCOUNTE)

Some map squares have fixed special encounters configured via `AUX` values:

| AUX Field | Purpose |
|-----------|---------|
| `AUX0` | Counter - decremented each visit; when 0, reverts to NORMAL |
| `AUX1` | Random range added to AUX2 for monster index |
| `AUX2` | Base monster index (ENEMYINX lower bound) |

Fixed encounters only trigger if `FIGHTS[]` is set `TRUE` for that square.

## FIGHTMAP Spreading (Special Cases)

The "clanging bells" mechanic on Level 4 uses `FIGHTMAP` spreading:
- Sets `FIGHTMAP = TRUE` in a square area around the player
- Dimensions: `2 * AUX0 + 1` (centered on current location)
- Current location set to `FALSE`
- **Guarantees encounter on next step** in any direction

## Surprise Mechanics

When an encounter triggers:

```pascal
IF (RANDOM MOD 100) > 80 THEN
  SURPRISE := 1  // Party surprises monsters
ELSE IF (RANDOM MOD 100) > 80 THEN
  SURPRISE := 2  // Monsters surprise party
ELSE
  SURPRISE := 0  // Normal encounter
```

Probability breakdown:
- ~19% chance party surprises monsters
- ~15.4% chance monsters surprise party
- ~65.6% normal encounter (no surprise)

## Encounter Limits by Level

| Maze Level | Max Monster Groups | Max Monsters per Group |
|------------|-------------------|----------------------|
| 1 | 2 | 5 |
| 2 | 3 | 6 |
| 3 | 3 | 7 |
| 4+ | 4 | 8 (Level 4), 9 (Level 5+) |

## Monster Group Selection

Each map has three monster groups (A, B, C) with weighted selection:
- **Group A**: 75% (3/4) chance
- **Group B**: 18.75% (3/16) chance
- **Group C**: 6.25% (1/16) chance

## Running Away

Success rate for fleeing: `39% - (MazeLevel × 3%)`

Adjustments:
- Smaller parties have better flee chances
- **Running NEVER works on Level 10**

## Implementation Notes for Remake

To faithfully implement these mechanics:

### Door Mechanics
1. **No persistent door state needed** - doors always render the same (closed appearance)
2. **Opening/kicking = movement through** - single action, not "open then enter"
3. **Encounter check on door action** - 12.5% for rooms, before movement completes
4. **Doors remain "kickable"** - can repeatedly kick for encounter farming

### Room Tile Identification

Our codebase already uses `type` field on tiles (e.g., `"type": "darkness"`). Use the same pattern:

```typescript
// src/app/types/Dungeon.ts - add 'room' to TileType union
export type TileType =
  | 'room'           // NEW - marks tile as part of a room
  | 'stairs_up'
  | 'darkness'
  // ...

// src/app/validation/dungeon-schemas.ts - add to schema
const TileTypeSchema = z.enum(['room', 'stairs_up', ...])
```

**In level JSON files:**
```json
// All tiles INSIDE the room get type: "room"
{ "x": 5, "y": 3, "walls": {...}, "type": "room" }
{ "x": 5, "y": 4, "walls": {...}, "type": "room" }
{ "x": 6, "y": 3, "walls": {...} }  // No type = corridor
```

**Key points:**
- **All tiles inside a room** get `"type": "room"`, not just the tile behind the door
- **Contiguous flagged tiles** = one room (for treasure seeding purposes)
- **Tiles without type** = corridor (implicit, since type is optional)
- **Door walls** are separate from tile type (doors are wall properties)

### Encounter System
5. **Check `tile.type === 'room'`** for encounter eligibility
6. **Track treasure room state** per level (9 rooms seeded on entry)
7. **Implement FIGHTMAP equivalent** for runtime encounter tracking
8. **Keep 1% random encounter** on every movement step

### State Reset
9. **Reset FIGHTMAP on dungeon exit** - not on level change, only full exit
10. **Re-seed treasure rooms on dungeon entry** - 9 random rooms per level

## Source References

### Source Code Analysis
- [GitHub: Wizardry.Code](https://github.com/snafaru/Wizardry.Code) - Re-engineered Pascal source
- [Wizardry Modding Guide](https://www.zimlab.com/wizardry/moddingguide/files/Wizardry_I_Modding_Guide.pdf)
- Thomas William Ewers - Original source code re-engineering (2014)

### Mechanics Analysis
- [Data Driven Gamer - Mechanics](https://datadrivengamer.blogspot.com/2019/08/the-not-so-basic-mechanics-of-wizardry.html)
- [Data Driven Gamer - Maps](https://datadrivengamer.blogspot.com/2019/08/the-maps-of-wizardry.html)
- [zimlab.com Wizardry](https://www.zimlab.com/wizardry/walk/wizardry-123-game-calculations.htm) - Game calculations

### Version Comparisons and Gameplay
- [Just Games Retro - Wizardry](https://www.justgamesretro.com/apple/wizardry) - Version differences
- [StrategyWiki - Gameplay](https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord/Gameplay) - Controls by platform
- [LP Archive - Wizardry](https://lparchive.org/Wizardry-Proving-Grounds-of-the-Mad-Overlord/Update%2001/) - Gameplay documentation
- [RMG Guide](https://www.realmillenniumgroup.com/Wizardry1.html) - NES vs PC differences
