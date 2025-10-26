# maps.json Format

**Map/dungeon data file specification.**

## File Location

`src/data/maps.json`

## Format

```json
{
  "levels": [
    {
      "level": 1,
      "name": "Castle Entrance",
      "size": { "width": 20, "height": 20 },
      "startPosition": { "x": 0, "y": 0, "facing": "north" },
      "tiles": [
        {
          "x": 0,
          "y": 0,
          "type": "stairs_up",
          "destination": { "type": "castle" }
        },
        {
          "x": 0,
          "y": 10,
          "type": "stairs_down",
          "destination": { "level": 2, "x": 0, "y": 10 }
        },
        {
          "x": 5,
          "y": 9,
          "type": "teleporter",
          "destination": { "level": 1, "x": 15, "y": 4 }
        },
        {
          "x": 10,
          "y": 8,
          "type": "elevator",
          "requiresItem": "blue_ribbon",
          "destinations": [
            { "level": 1, "x": 10, "y": 8 },
            { "level": 2, "x": 10, "y": 8 },
            { "level": 3, "x": 10, "y": 8 },
            { "level": 4, "x": 10, "y": 8 }
          ]
        },
        {
          "x": 13,
          "y": 5,
          "type": "fixed_encounter",
          "encounterId": "murphy_ghosts",
          "repeatable": true
        },
        {
          "x": 9,
          "y": 12,
          "type": "darkness_zone_start"
        },
        {
          "x": 9,
          "y": 19,
          "type": "message",
          "message": "You see a wizard. He gestures and you are returned to the castle.",
          "effect": "return_to_castle"
        },
        {
          "x": 13,
          "y": 3,
          "type": "chest",
          "item": "bronze_key",
          "trapped": false
        }
      ],
      "walls": [
        { "x": 0, "y": 0, "direction": "north" },
        { "x": 0, "y": 0, "direction": "west" },
        { "x": 1, "y": 0, "direction": "north" }
      ],
      "zones": [
        {
          "name": "Southwest Quadrant",
          "bounds": { "xMin": 0, "yMin": 0, "xMax": 9, "yMax": 9 }
        },
        {
          "name": "Darkness Zone",
          "bounds": { "xMin": 9, "yMin": 12, "xMax": 19, "yMax": 19 },
          "properties": ["darkness", "no_light_spells"]
        }
      ],
      "encounterRate": 0.10,
      "encounterTable": "level_1_monsters"
    },
    {
      "level": 10,
      "name": "Werdna's Lair",
      "size": { "width": 20, "height": 20 },
      "startPosition": { "x": 0, "y": 0, "facing": "north" },
      "restrictions": [
        "no_malor_in",
        "no_malor_out",
        "no_dumapic"
      ],
      "tiles": [
        {
          "x": 0,
          "y": 0,
          "type": "message",
          "message": "Welcome to my castle. I await you at the end. -Werdna",
          "latin": "Contra-dextra avenue",
          "translation": "Don't travel right"
        },
        {
          "x": 1,
          "y": 0,
          "type": "teleporter",
          "destination": { "type": "castle" },
          "description": "Warp to castle"
        },
        {
          "x": 1,
          "y": 8,
          "type": "teleporter",
          "destination": { "level": 10, "x": 1, "y": 18 },
          "room": "room_1_to_2"
        },
        {
          "x": 17,
          "y": 3,
          "type": "fixed_encounter",
          "encounterId": "werdna_final_battle",
          "repeatable": false,
          "isUnique": true,
          "isFinalBoss": true
        },
        {
          "x": 17,
          "y": 4,
          "type": "message",
          "message": "You have found Werdna. Prepare for battle!",
          "pointOfNoReturn": true
        }
      ],
      "rooms": [
        {
          "id": "room_1",
          "guardian": { "level": 10, "x": 1, "y": 8 }
        },
        {
          "id": "room_2",
          "guardian": { "level": 10, "x": 1, "y": 18 }
        },
        {
          "id": "room_3",
          "guardian": { "level": 10, "x": 9, "y": 12 }
        },
        {
          "id": "room_4",
          "guardian": { "level": 10, "x": 10, "y": 18 }
        },
        {
          "id": "room_5",
          "guardian": { "level": 10, "x": 16, "y": 10 }
        },
        {
          "id": "room_6",
          "guardian": { "level": 10, "x": 18, "y": 13 }
        },
        {
          "id": "room_7",
          "boss": { "level": 10, "x": 17, "y": 3 }
        }
      ],
      "encounterRate": 0.15,
      "encounterTable": "level_10_monsters"
    }
  ]
}
```

## Field Definitions

### Level Object

**level**: `number` - Dungeon level (1-10)

**name**: `string` - Level name (e.g. "Castle Entrance", "Werdna's Lair")

**size**: `object` - Grid dimensions
- `width`: Number of tiles wide (always 20 for Wizardry 1)
- `height`: Number of tiles tall (always 20 for Wizardry 1)

**startPosition**: `object` - Where party appears when entering level
- `x`: X coordinate
- `y`: Y coordinate
- `facing`: Initial direction ("north", "south", "east", "west")

**tiles**: `array` - Special tile definitions (see Tile Types below)

**walls**: `array` - Wall definitions
- `x`, `y`: Tile coordinates
- `direction`: Wall side ("north", "south", "east", "west")

**zones**: `array` - Optional zone definitions for special areas
- `name`: Zone name
- `bounds`: Bounding box (`xMin`, `yMin`, `xMax`, `yMax`)
- `properties`: Special zone effects (e.g. ["darkness", "anti_magic"])

**encounterRate**: `number` - Probability of encounter per step (0.0 to 1.0)

**encounterTable**: `string` - Reference to monster encounter table

**restrictions**: `array` - Level-wide restrictions (optional)
- `"no_malor_in"` - Cannot teleport into level
- `"no_malor_out"` - Cannot teleport out of level
- `"no_dumapic"` - DUMAPIC spell doesn't work

**rooms**: `array` - Room definitions (Level 10 only)

## Tile Types

### Navigation Tiles

**stairs_up**: Ascend to previous level or castle
```json
{
  "x": 0, "y": 0,
  "type": "stairs_up",
  "destination": { "type": "castle" }
}
```
- `destination.type`: "castle" or object with level/coordinates

**stairs_down**: Descend to next level
```json
{
  "x": 0, "y": 10,
  "type": "stairs_down",
  "destination": { "level": 2, "x": 0, "y": 10 }
}
```

**teleporter**: Instant transport
```json
{
  "x": 5, "y": 9,
  "type": "teleporter",
  "destination": { "level": 1, "x": 15, "y": 4 },
  "isOneWay": true
}
```
- `destination`: Target coordinates
- `isOneWay`: Optional, defaults to true

**elevator**: Multi-level access (requires Blue Ribbon)
```json
{
  "x": 10, "y": 8,
  "type": "elevator",
  "requiresItem": "blue_ribbon",
  "destinations": [
    { "level": 1, "x": 10, "y": 8 },
    { "level": 2, "x": 10, "y": 8 },
    { "level": 3, "x": 10, "y": 8 },
    { "level": 4, "x": 10, "y": 8 }
  ]
}
```

**chute**: Forces fall to lower level
```json
{
  "x": 5, "y": 5,
  "type": "chute",
  "destination": { "level": 9, "x": 5, "y": 5 }
}
```

### Special Effect Tiles

**spinner**: Randomly changes facing direction
```json
{
  "x": 8, "y": 15,
  "type": "spinner"
}
```

**darkness_zone_start**: Begin darkness zone (light spells ineffective)
```json
{
  "x": 9, "y": 12,
  "type": "darkness_zone_start"
}
```

**darkness_zone_end**: End darkness zone
```json
{
  "x": 19, "y": 19,
  "type": "darkness_zone_end"
}
```

**anti_magic_zone**: Spells cannot be cast
```json
{
  "x": 5, "y": 5,
  "type": "anti_magic_zone",
  "bounds": { "xMin": 5, "yMin": 5, "xMax": 10, "yMax": 10 }
}
```

### Encounter Tiles

**fixed_encounter**: Specific monster at specific location
```json
{
  "x": 13, "y": 5,
  "type": "fixed_encounter",
  "encounterId": "murphy_ghosts",
  "repeatable": true
}
```
- `encounterId`: Reference to monster ID
- `repeatable`: Can encounter multiple times?
- `isUnique`: Only one encounter (Werdna)
- `isFinalBoss`: Is this the final boss?

### Interactive Tiles

**chest**: Treasure chest
```json
{
  "x": 13, "y": 3,
  "type": "chest",
  "item": "bronze_key",
  "trapped": false,
  "trapType": null,
  "requiresThief": false
}
```
- `item`: Item ID (references items.json)
- `trapped`: Is chest trapped?
- `trapType`: Type of trap if trapped
- `requiresThief`: Requires thief to open?

**door**: Door (open, closed, locked, secret)
```json
{
  "x": 5, "y": 5,
  "type": "door",
  "state": "locked",
  "requiresKey": "bronze_key",
  "isSecret": false
}
```
- `state`: "open", "closed", "locked"
- `requiresKey`: Item ID of required key
- `isSecret`: Requires search to find?

**message**: Display text or trigger event
```json
{
  "x": 9, "y": 19,
  "type": "message",
  "message": "You see a wizard.",
  "effect": "return_to_castle",
  "latin": "Contra-dextra avenue",
  "translation": "Don't travel right"
}
```
- `message`: Text to display
- `effect`: Optional effect trigger
- `latin`: Latin text (Level 10)
- `translation`: English translation
- `pointOfNoReturn`: Can't turn back after this

## Wall Encoding

Walls can be encoded in two ways:

### Explicit Wall List
```json
{
  "walls": [
    { "x": 0, "y": 0, "direction": "north" },
    { "x": 0, "y": 0, "direction": "west" }
  ]
}
```

### Grid String (Alternative)
```json
{
  "wallGrid": [
    "####################",
    "#..................#",
    "#..................#",
    "####################"
  ]
}
```
- `#` = wall
- `.` = floor
- More compact but less flexible

## Coordinate System

**Origin**: (0, 0) at southwest corner (lower-left)

**X Axis**: Increases eastward (0 to 19)

**Y Axis**: Increases northward (0 to 19)

**Directions**:
- North: +Y
- South: -Y
- East: +X
- West: -X

## Zone Properties

**darkness**: Light spells ineffective (MILWA, LOMILWA don't work)

**anti_magic**: Cannot cast spells in zone

**no_light_spells**: Specific to light spells only

**safe_zone**: No random encounters

**high_encounter**: Increased encounter rate

## Level 10 Special Structure

Level 10 is unique with 7 isolated rooms connected only by teleporters.

**Room Structure**:
- Room 0: Starting area (0E, 0N)
- Rooms 1-6: Guardian rooms with progressive warps
- Room 7: Werdna's chamber (final boss)

**Teleporter Network**:
- Each room has progression warp (to next room)
- Each room has reset warp (back to Room 0)
- Must follow sequence: Room 1 → 2 → 3 → 4 → 5 → 6 → 7

**Restrictions**:
- Cannot use MALOR to enter or exit Level 10
- DUMAPIC doesn't work (coordinates hidden)
- Point of no return at Room 7 entrance

## Encounter Tables

**encounterTable** references monster groups by level:

```json
{
  "encounterTables": {
    "level_1_monsters": [
      { "monsterId": "bubbly_slime", "weight": 20 },
      { "monsterId": "orc", "weight": 15 },
      { "monsterId": "kobold", "weight": 15 },
      { "monsterId": "lvl_1_mage", "weight": 5 }
    ]
  }
}
```

- `weight`: Relative probability of encounter
- Higher weight = more common

## Validation

See [Dungeon Maps Reference](../research/dungeon-maps-reference.md) for complete map structure.

Map coordinates and special tiles validated against original Wizardry 1 dungeon layout.

## Implementation Notes

**Map Loading**: Load entire level at once (20×20 is small enough for full load)

**Wall Detection**: Check wall array for movement validation

**Tile Effects**: Apply automatically when party enters tile

**Teleporter Handling**: Instant transport, no animation (original behavior)

**Spinner Effects**: Random direction change (0-3: N/E/S/W)

**Darkness Rendering**: Show walls/floor but not details beyond 1 tile

**Elevator Interaction**: Show menu with available floors

## Data Size Estimate

- 10 levels × 20×20 tiles = 4000 tiles total
- Special tiles: ~50-100 per level (500-1000 total)
- Walls: ~200-300 per level (2000-3000 total)
- Total JSON size: ~500KB-1MB (highly compressible)

## Notes

- Original Wizardry 1 maps are well-documented with complete coordinates
- Maps are static (don't change during gameplay)
- No procedural generation (faithful to original)
- Level 10 is most complex with teleporter-only navigation
- Some areas intentionally designed to disorient (spinners + darkness)
