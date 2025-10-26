# Wizardry Map Data Format Documentation

## Overview

This document describes the data format for representing Wizardry dungeon maps. Each level is stored as a JSON object containing tiles with explicit wall definitions for all four directions.

## Coordinate System

```
        North (Y increases)
             ↑
             |
  West ←─────┼─────→ East (X increases)
             |
             ↓
        South (Y=0)

  (0,19) .................. (19,19)  ← Top of map (North)
    .                          .
    .                          .
    .                          .
  (0,0) .................... (19,0)  ← Bottom of map (South)
```

- **Grid Size**: 20×20 cells (coordinates 0-19)
- **Origin**: (0, 0) is at the southwest (bottom-left) corner
- **X-Axis**: Increases eastward (0=west, 19=east)
- **Y-Axis**: Increases northward (0=south, 19=north)

## Core Design Philosophy

### Explicit Per-Tile Walls

Every navigable tile in the dungeon explicitly defines all four walls. This approach:
- ✅ **No ambiguity**: Each tile contains complete wall information
- ✅ **Simple lookups**: Just check the tile you're standing on
- ✅ **No shared wall confusion**: No need to check adjacent tiles
- ✅ **Easy validation**: All information in one place

**Example:**
```json
{
  "x": 5,
  "y": 10,
  "walls": {
    "north": "wall",
    "east": "door",
    "south": "open",
    "west": "wall"
  }
}
```

## JSON Format

### Complete Level Structure

```json
{
  "levels": [
    {
      "level": 1,
      "name": "Level 1",
      "size": { "width": 20, "height": 20 },
      "startPosition": { "x": 0, "y": 0, "facing": "north" },
      "edgeWrapping": true,
      "tiles": [
        {
          "x": 0,
          "y": 0,
          "walls": {
            "north": "open",
            "east": "wall",
            "south": "wall",
            "west": "wall"
          },
          "type": "stairs_down",
          "destination": { "level": 2, "x": 0, "y": 0 }
        },
        {
          "x": 1,
          "y": 0,
          "walls": {
            "north": "wall",
            "east": "wall",
            "south": "wall",
            "west": "wall"
          }
        },
        {
          "x": 10,
          "y": 19,
          "walls": {
            "north": "wall",
            "east": "wall",
            "south": "open",
            "west": "door"
          },
          "type": "fixed_encounter",
          "encounterId": "encounter_c",
          "repeatable": true
        }
      ],
      "encounterRate": 0.10,
      "encounterTable": "level_1_monsters"
    }
  ]
}
```

## Field Definitions

### Level Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `level` | number | Yes | Dungeon level (1-10) |
| `name` | string | Yes | Descriptive name for the level |
| `size` | object | Yes | Grid dimensions |
| `startPosition` | object | Yes | Where party spawns when entering level |
| `tiles` | array | Yes | All navigable tiles with walls (see Tile Object) |
| `encounterRate` | number | Yes | Random encounter probability per step (0.0-1.0) |
| `encounterTable` | string | Yes | Reference to monster encounter table |
| `zones` | array | No | Optional special zones (darkness, anti-magic, etc.) |
| `restrictions` | array | No | Optional level-wide restrictions |
| `edgeWrapping` | boolean | No | Enable wrap-around (off one edge → opposite side) |

### Size Object

```json
{
  "width": 20,
  "height": 20
}
```

Always 20×20 for Wizardry 1.

### Start Position Object

```json
{
  "x": 0,
  "y": 0,
  "facing": "north"
}
```

- `x`, `y`: Spawn coordinates
- `facing`: Initial direction ("north", "south", "east", "west")

## Tile Object

Every navigable cell in the dungeon is represented as a tile object.

### Basic Tile Structure

```json
{
  "x": 5,
  "y": 10,
  "walls": {
    "north": "wall",
    "east": "open",
    "south": "door",
    "west": "wall"
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `x` | number | Yes | X coordinate (0-19) |
| `y` | number | Yes | Y coordinate (0-19) |
| `walls` | object | Yes | All four walls explicitly defined |
| `type` | string | No | Special tile type (stairs, encounter, etc.) |

### Walls Object

**All four directions must be explicitly defined:**

```json
{
  "north": "wall",
  "east": "door",
  "south": "open",
  "west": "wall"
}
```

#### Wall Type Values

| Value | Description |
|-------|-------------|
| `"wall"` | Solid wall (impassable) |
| `"door"` | Regular door (can be opened) |
| `"locked_door"` | Locked door (requires key item) |
| `"secret_door"` | Secret door (hidden, hard to detect) |
| `"open"` | No wall (passable) |

**Door Mechanics**:
- **Regular doors** (`"door"`): Can be opened freely
- **Locked doors** (`"locked_door"`): Require specific key items (Bronze Key, Silver Key, Gold Key)
  - If party has the required key, passage is granted
  - If key is missing, party is "pushed back one step"
- **Secret doors** (`"secret_door"`): Hidden passages that don't always appear
  - Light spells (MILWA, LOMILWA) make them more detectable
  - May appear intermittently when looking at them

#### Direction Reference

```
         north
           ↑
     ┌─────────┐
     │         │
west │  (x,y)  │ east
     │         │
     └─────────┘
           ↓
         south
```

## Special Tile Types

When a tile has special properties, add a `type` field and related fields.

### Navigation Tiles

#### Stairs Up

```json
{
  "x": 0,
  "y": 19,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "open",
    "west": "wall"
  },
  "type": "stairs_up",
  "destination": {
    "type": "castle"
  }
}
```

Returns player to castle.

#### Stairs Down

```json
{
  "x": 0,
  "y": 10,
  "walls": {
    "north": "open",
    "east": "wall",
    "south": "open",
    "west": "wall"
  },
  "type": "stairs_down",
  "destination": {
    "level": 2,
    "x": 0,
    "y": 10
  }
}
```

Descends to next level at specified coordinates.

#### Teleporter

```json
{
  "x": 5,
  "y": 9,
  "walls": {
    "north": "open",
    "east": "open",
    "south": "wall",
    "west": "open"
  },
  "type": "teleporter",
  "destination": {
    "level": 1,
    "x": 15,
    "y": 4
  },
  "isOneWay": true
}
```

Instant transport to another location.

#### Elevator

**Elevator 1 (Levels 1-4):**
```json
{
  "x": 10,
  "y": 8,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "wall",
    "west": "wall"
  },
  "type": "elevator",
  "destinations": [
    { "level": 1, "x": 10, "y": 8 },
    { "level": 2, "x": 10, "y": 8 },
    { "level": 3, "x": 10, "y": 8 },
    { "level": 4, "x": 10, "y": 8 }
  ]
}
```

**Elevator 2 (Levels 4-9, requires Blue Ribbon):**
```json
{
  "x": 10,
  "y": 0,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "wall",
    "west": "wall"
  },
  "type": "elevator",
  "requiresItem": "blue_ribbon",
  "destinations": [
    { "level": 4, "x": 10, "y": 0 },
    { "level": 5, "x": 10, "y": 0 },
    { "level": 6, "x": 10, "y": 0 },
    { "level": 7, "x": 10, "y": 0 },
    { "level": 8, "x": 10, "y": 0 },
    { "level": 9, "x": 10, "y": 0 }
  ]
}
```

Multi-level access points. The second elevator requires the Blue Ribbon (obtained from Monster Allocation Center on Level 4).

#### Chute

```json
{
  "x": 5,
  "y": 5,
  "walls": {
    "north": "open",
    "east": "open",
    "south": "open",
    "west": "open"
  },
  "type": "chute",
  "destination": {
    "level": 9,
    "x": 5,
    "y": 5
  }
}
```

Forces fall to lower level.

#### Locked Door Tile

```json
{
  "x": 8,
  "y": 7,
  "walls": {
    "north": "locked_door",
    "east": "wall",
    "south": "open",
    "west": "wall"
  },
  "type": "locked_tile",
  "requiresKey": "bronze_key",
  "direction": "north"
}
```

Tile with a locked door that requires a specific key. When the party has the required key, they can pass through the locked door. Without the key, they are pushed back one step.

#### Sliding Wall

```json
{
  "x": 17,
  "y": 12,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "open",
    "west": "wall"
  },
  "type": "sliding_wall",
  "requiresItem": "bear_statue",
  "direction": "east",
  "message": "A large sliding wall with a bear image blocks the way"
}
```

Special wall that slides open when party possesses the required item (typically the Bear Statue on Level 4). Once opened, allows passage in the specified direction.

### Effect Tiles

#### Spinner

```json
{
  "x": 8,
  "y": 15,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "wall",
    "west": "open"
  },
  "type": "spinner"
}
```

Randomly rotates party facing direction.

#### Darkness Zone Start

```json
{
  "x": 9,
  "y": 12,
  "walls": {
    "north": "open",
    "east": "wall",
    "south": "wall",
    "west": "open"
  },
  "type": "darkness_zone_start"
}
```

Begins area where light spells don't work.

#### Darkness Zone End

```json
{
  "x": 19,
  "y": 19,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "open",
    "west": "open"
  },
  "type": "darkness_zone_end"
}
```

Exits darkness zone.

#### Anti-Magic Zone

```json
{
  "x": 5,
  "y": 5,
  "walls": {
    "north": "open",
    "east": "open",
    "south": "open",
    "west": "open"
  },
  "type": "anti_magic_zone"
}
```

Area where spells cannot be cast.

### Encounter Tiles

#### Fixed Encounter

```json
{
  "x": 10,
  "y": 19,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "open",
    "west": "door"
  },
  "type": "fixed_encounter",
  "encounterId": "encounter_c",
  "repeatable": true
}
```

- `encounterId`: Reference to monster/encounter definition
- `repeatable`: Can be encountered multiple times
- `isUnique`: (Optional) Only one in entire game (e.g., Werdna)
- `isFinalBoss`: (Optional) Final boss encounter

### Interactive Tiles

#### Chest

```json
{
  "x": 13,
  "y": 3,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "open",
    "west": "wall"
  },
  "type": "chest",
  "item": "bronze_key",
  "trapped": false,
  "trapType": null
}
```

**Chest Mechanics**:
- Chests only appear after combat encounters that occur when going through a door
- Random encounters in hallways typically only give gold (no chests)
- Gold in chests is distributed evenly among surviving party members
- Items are given to one random party member

#### Searchable Item

```json
{
  "x": 12,
  "y": 8,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "open",
    "west": "wall"
  },
  "type": "searchable",
  "message": "You see a message on the wall",
  "promptSearch": true,
  "item": "gold_key"
}
```

Items found by searching after reading a message (not in combat chests). Used for quest items like keys and statues.

#### Message

```json
{
  "x": 9,
  "y": 19,
  "walls": {
    "north": "wall",
    "east": "wall",
    "south": "open",
    "west": "wall"
  },
  "type": "message",
  "message": "You see a wizard. He gestures.",
  "effect": "return_to_castle"
}
```

For Level 10, can include:
- `latin`: Latin text
- `translation`: English translation
- `pointOfNoReturn`: Can't turn back after this

### No Need to Check Adjacent Tiles

With this format, you **never** need to check adjacent tiles. The tile you're standing on has complete information about all four walls.

**Example:**
```javascript
// Simple check - no adjacent tile lookup needed!
function canMoveNorth(tile) {
  return tile.walls.north !== "wall";
}
```

## Zones (Optional)

Define special areas with unique properties:

```json
{
  "zones": [
    {
      "name": "Darkness Zone",
      "bounds": {
        "xMin": 9,
        "yMin": 12,
        "xMax": 19,
        "yMax": 19
      },
      "properties": ["darkness", "no_light_spells"]
    }
  ]
}
```

### Zone Properties

- `darkness`: Visual range reduced
- `anti_magic`: Cannot cast spells
- `no_light_spells`: Only light spells blocked
- `safe_zone`: No random encounters
- `high_encounter`: Increased encounter rate

## Level Restrictions (Optional)

```json
{
  "restrictions": [
    "no_malor_in",
    "no_malor_out",
    "no_dumapic"
  ]
}
```

- `no_malor_in`: Cannot teleport into level
- `no_malor_out`: Cannot teleport out of level
- `no_dumapic`: DUMAPIC spell doesn't work

## Edge Wrapping (Wrap-Around)

Some levels feature edge wrapping, where a magical field surrounds the maze:

```json
{
  "level": 1,
  "edgeWrapping": true,
  ...
}
```

**Mechanics**:
- When `edgeWrapping` is `true`, moving off one edge teleports to the opposite edge
- Example: At (19, 10) moving East → arrives at (0, 10)
- Example: At (5, 0) moving South → arrives at (5, 19)
- Preserves facing direction
- All Wizardry 1 levels use edge wrapping

**Implementation Note**: The wrap-around creates a toroidal topology (doughnut-shaped space).

## Encounter Configuration

```json
{
  "encounterRate": 0.10,
  "encounterTable": "level_1_monsters"
}
```

The `encounterTable` references a monster group definition:

```json
{
  "encounterTables": {
    "level_1_monsters": [
      { "monsterId": "bubbly_slime", "weight": 20 },
      { "monsterId": "orc", "weight": 15 },
      { "monsterId": "kobold", "weight": 15 }
    ]
  }
}
```

## File Structure

Recommended directory structure:

```
data/
  maps/
    level1.json
    level2.json
    ...
    level10.json
  encounters/
    level_1_monsters.json
    level_2_monsters.json
    ...
```

## Research Validation Summary

**Validated Against**: Wizardry 1: Proving Grounds of the Mad Overlord (2025-10-26)

**Sources**:
- StrategyWiki Walkthrough and Floor Guides
- The-Spoiler.com Solutions
- Data Driven Gamer Treasure Analysis
- Steam Community Guides

**Key Updates from Research**:

1. **Door Types**: Added `locked_door` and `secret_door` wall types based on key mechanics (Bronze/Silver/Gold Keys) and secret passage detection via MILWA/LOMILWA spells

2. **Locked Doors**: Added `locked_tile` type with `requiresKey` field for doors that push party back without proper key

3. **Sliding Walls**: Added `sliding_wall` type for Bear Statue-activated passages (Level 4, E17-N12)

4. **Edge Wrapping**: Added `edgeWrapping` level property - confirmed all Wizardry 1 levels use magical field wrap-around

5. **Elevator Configurations**: Updated examples to show both elevator systems:
   - Elevator 1: Levels 1-4 (E10-N8)
   - Elevator 2: Levels 4-9 (E10-N0, requires Blue Ribbon)

6. **Item Placement**: Added `searchable` tile type for quest items found by searching (not in combat chests). Documented that chests only appear after door-combat encounters, not random hallway encounters.

7. **Chest Mechanics**: Clarified that treasure chests appear only after combat through doors; gold is distributed evenly, items given to random party member

**Confirmed Accurate**:
- ✅ Coordinate system (0,0 = southwest, X=east, Y=north)
- ✅ 20×20 grid for all levels
- ✅ All special tile types (stairs, teleporters, spinners, chutes, darkness zones, anti-magic zones)
- ✅ Level restrictions (no_malor_in, no_malor_out, no_dumapic)
- ✅ Encounter mechanics (fixed, repeatable, unique)

## Complete Example

See `level1.json` for a complete working example with all 270 tiles fully defined.
