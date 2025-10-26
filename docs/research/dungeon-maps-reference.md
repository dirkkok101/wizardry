# Wizardry 1 Dungeon Maps Reference

**Sources**:
- Strategy Wiki (strategywiki.org)
- TK421 Wizardry Archive (tk421.net)
- Zimlab Wizardry Fan Page (zimlab.com)

**Validated**: 2025-10-25
**Status**: ⚠️ Partial - Detailed coordinate data available in image format only

---

## Dungeon Structure Overview

**Total Levels**: 10 floors
**Grid Size**: 20×20 per level (400 tiles each)
**Coordinate System**: (East, North) from lower-left corner (0,0)
**Total Tiles**: 4000 tiles across all 10 levels

---

## Map Features by Type

### Standard Tiles
- **Floor**: Walkable space
- **Wall**: Impassable rock
- **Doors**: Open, closed, locked, secret
- **Stairs Up**: Ascend to previous level
- **Stairs Down**: Descend to next level

### Special Tiles
- **Elevator**: Multi-level access (connects Levels 1-4)
- **Teleporter**: Instant transport to another coordinate
- **Spinner**: Randomly changes facing direction
- **Chute**: Forces movement to lower level
- **Darkness Zone**: Cannot be lit (MILWA/LOMILWA ineffective)
- **Anti-Magic Zone**: Spells cannot be cast
- **Message Tile**: Displays text or triggers event

---

## Level 1 - Castle Entrance

**Starting Point**: (0E, 0N) - Southwest corner
**Key Locations**:
- **Stairs Up** (0E, 0N): Return to castle
- **Stairs Down** (0E, 10N): Descend to Level 2
- **Elevator** (10E, 8N): Access Levels 1-4

**Special Features**:
- **Teleporters**: (5E, 9N) and (13E, 4N) → both warp to (15E, 4N) in southeast zone
- **Darkness Zone**: Starts at (9E, 12N) - "cloaked in eternal darkness"
- **Message Room**: (9E, 19N) - NPC wizard, entering = instant return to castle

**Notable Encounters**:
- **Murphy's Ghosts** at (13E, 5N): Repeatable encounter, cannot escape, high XP
- Guardian encounters at zone entrances

**Items**:
- **Bronze Key** at (13E, 3N): Required for Level 2
- **Silver Key** at (13E, 18N): Required for Level 2

**Zone Division**: Four quadrants (SW, NW, NE, SE) with guardian checkpoints

**Recommended Level**: 3-4 for safe exploration

---

## Level 2 - Upper Dungeon

**Access**: Bronze Key required to pass checkpoint

**Key Features**:
- Stairs connecting to Levels 1 and 3
- Silver Key checkpoint (from Level 1)
- Progressively harder monsters than Level 1

**Special Tiles**: (Data requires image map extraction)

---

## Level 3 - Mid Dungeon

**Key Features**:
- Stairs connecting to Levels 2 and 4
- Monsters: Dragon Fly, Giant Toad, Level 3 enemies

**Special Tiles**: (Data requires image map extraction)

---

## Level 4 - Elevator Access

**Key Features**:
- **Blue Ribbon** item: Required for elevator access
- Elevator connecting to Levels 1-4
- Stairs connecting to Levels 3 and 5

**Special Tiles**: (Data requires image map extraction)

**Recommended Level**: 5-7

---

## Level 5 - Deep Dungeon

**Key Features**:
- Stairs connecting to Levels 4 and 6
- Tougher encounters (Lifestealer, Weretiger, Spirit)

**Special Tiles**: (Data requires image map extraction)

---

## Level 6 - Guardian Level

**Key Features**:
- Stairs connecting to Levels 5 and 7
- Powerful guardians (Chimera, Earth Giant, High Wizard)
- High-value treasure

**Special Tiles**: (Data requires image map extraction)

**Recommended Level**: 8-10

---

## Level 7 - Deep Guardian Level

**Key Features**:
- Stairs connecting to Levels 6 and 8
- Boss-tier encounters (Lesser Demon, Gorgon, Maelific)

**Special Tiles**: (Data requires image map extraction)

---

## Level 8 - Trap Level

**Key Features**:
- Stairs connecting to Levels 7 and 9
- **Dark Area with Teleport**: Exit on southern wall
- **Spinner Area**: "Nasty" zone full of spinners + teleport

**Special Tiles**:
- Darkness + Teleport combination (coordinates TBD)
- Multiple spinners (coordinates TBD)

**Recommended Level**: 11-13

---

## Level 9 - Pre-Final Level

**Key Features**:
- Stairs connecting to Levels 8 and 10
- Extremely tough encounters (Maelific, Frost Giant, Dragon Zombie)
- Preparation zone before final level

**Special Tiles**: (Data requires image map extraction)

**Recommended Level**: 13-15

---

## Level 10 - Werdna's Lair (Final Level)

**Structure**: Seven distinct rooms connected **only by teleportation** (no walking between rooms)

**Starting Room (0E, 0N)**:
- Welcome message: Werdna's challenge
- Latin clue: "Contra-dextra avenue" = "Don't travel right"

**Teleporter Types**:
1. **Warp to Castle** (1E, 0N): Direct escape to castle
2. **Progression Warps**: Advance to next room (Rooms 1→2→3→4→5→6→7)
3. **Reset Warps**: Return to starting point (0E, 0N)

**Room Guardians** (Toughest Monsters):
- Room 1: (1E, 8N)
- Room 2: (1E, 18N)
- Room 3: (9E, 12N)
- Room 4: (10E, 18N)
- Room 5: (16E, 10N)
- Room 6: (18E, 13N)

**Werdna's Chamber (Room 7)**:
- **Werdna's Location**: (17E, 3N)
- **Message Tile**: (17E, 4N) - Adjacent to boss
- **Final Battle**: Werdna + Vampire Lord + 4 Vampires (minimum)

**Critical Restrictions**:
- ⚠️ **MALOR** (teleport spell): Cannot enter or exit Level 10 with MALOR
- ⚠️ **DUMAPIC** (coordinates): Non-functional on Level 10
- ⚠️ **One-Way Trip**: Once in Room 7, must fight Werdna (no escape)

**Reward**:
- **Amulet of Werdna**: Dropped on victory, can cast MALOR to escape

**Platform Note**: Original Apple II version strips all equipment + most gold upon victory

**Recommended Level**: 13+ with full party, best equipment, maxed spell points

---

## Special Tile Mechanics

### Teleporters
- **Instant transport** to predefined coordinates
- Can be one-way or two-way
- Level 10 uses teleporters exclusively for room connections
- Some teleport to different levels (rare)

### Spinners
- **Randomizes facing direction** when stepped on
- Can disorient party (lose sense of direction)
- Often combined with darkness for maximum confusion
- Multiple spinners in sequence = very disorienting

### Darkness Zones
- **Light spells ineffective** (MILWA, LOMILWA do nothing)
- Cannot see walls ahead
- Mapping becomes critical
- Dangerous combined with spinners or teleporters

### Anti-Magic Zones
- **Cannot cast spells** while in zone
- Spells already active remain in effect
- Must exit zone to cast again
- Strategic disadvantage in combat

### Chutes
- **Forces fall to lower level** (usually -1 floor)
- One-way drop (must find stairs to return)
- Can be used strategically for quick descent
- Can separate party if only some members step on

### Elevators
- **Multi-level access** (Levels 1-4)
- Requires Blue Ribbon (found on Level 4)
- Fast travel between connected levels
- Two-way access

### Message Tiles
- Display text when stepped on
- Can trigger events
- Some return party to castle (Level 1 wizard room)
- Latin clues (Level 10)

---

## Navigation Mechanics

### Movement System
- **Discrete tile-based**: Move one tile at a time
- **90° rotation**: Turn left/right in place
- **6-directional control**:
  - Forward (1 tile)
  - Backward (1 tile)
  - Strafe Left (1 tile)
  - Strafe Right (1 tile)
  - Turn Left (90°)
  - Turn Right (90°)

### View Distance
- **3 tiles ahead**: Can see 3 tiles in front of party
- Walls, doors, and special tiles visible within range
- Beyond 3 tiles = darkness/fog

### Mapping Strategy
- **Manual mapping required**: No in-game automap (in original)
- Use graph paper or digital tools (Gridmonger, "Where are We?")
- Record: walls, doors, stairs, special tiles, encounters
- Note coordinates for important locations

---

## Encounter System

### Random Encounters
- **Per-tile probability**: Each step has chance to trigger encounter
- **Encounter rate varies by level**: Deeper = more frequent
- **No encounters on special tiles**: Teleporters, stairs (usually)

### Fixed Encounters
- **Murphy's Ghosts** (Level 1): Fixed location, repeatable
- **Level 10 Guardians**: Fixed room guardians
- **Werdna** (Level 10): Final boss, one-time encounter

### Encounter Mechanics
- 1-4 monster groups per encounter
- Multiple monsters per group
- Group targeting (not individual monsters)

---

## Strategic Notes

### Early Exploration (Levels 1-3)
- Map systematically, avoid darkness zones initially
- Retreat frequently to save progress
- Build party levels before deep exploration

### Mid-Game (Levels 4-7)
- Blue Ribbon on Level 4 unlocks elevator (Levels 1-4)
- Darkness + Spinner combo on Level 8 is dangerous
- Party should be level 7-10

### Late Game (Levels 8-9)
- Prepare for Level 10 (no return without Amulet)
- Stock healing items, ensure full spell points
- Party should be level 11-13

### Level 10 Strategy
- **DO NOT go right** (Latin clue)
- Map teleporter network carefully
- Each room has reset warp (sends to start)
- Room 7 is point of no return
- Fight Werdna at full strength

---

## Map Data Sources

**Complete Coordinate Data Available At**:
- Zimlab: http://wizardryarchives.com/maps/WizardryIMaps.html
- TK421: https://www.tk421.net/wizardry/wiz1maps.shtml
- Strategy Wiki: https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord/Floor_1 (through Floor_10)
- Dungeon Mapper: https://www.oldgames.sk/dungeon-mapper/map.php?map=695

**Note**: Detailed tile-by-tile coordinates are primarily available as images. For implementation, maps should be extracted from these sources or reverse-engineered from gameplay.

---

## Implementation Recommendations

### Map Data Format (JSON)

```json
{
  "level": 1,
  "size": { "width": 20, "height": 20 },
  "startPosition": { "x": 0, "y": 0 },
  "tiles": [
    {
      "x": 0, "y": 0,
      "type": "stairs_up",
      "destination": "castle"
    },
    {
      "x": 5, "y": 9,
      "type": "teleporter",
      "destination": { "level": 1, "x": 15, "y": 4 }
    },
    {
      "x": 13, "y": 5,
      "type": "fixed_encounter",
      "encounter": "murphys_ghosts"
    }
  ]
}
```

### Required Map Properties
- Grid size (20×20 fixed)
- Tile types (wall, floor, door, stairs, special)
- Special tile data (teleport destinations, encounter IDs)
- Zone boundaries (if using zone-based loading)
- Initial facing direction (usually North)

---

**Last Updated**: 2025-10-25
**Next Steps**:
- Extract detailed coordinate data from image maps
- Create JSON map files for all 10 levels
- Implement map renderer and navigation system

**Status**: Overview complete, detailed coordinates pending image extraction
