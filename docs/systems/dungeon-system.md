# Dungeon System

**Comprehensive overview of dungeon structure, encounters, special tiles, and exploration.**

## Overview

The dungeon is the **core gameplay area** consisting of 10 levels beneath the town.

**Key Concepts**:
- 10 dungeon levels (Level 1 = easiest, Level 10 = hardest)
- 20×20 grid per level (400 tiles)
- Tile types: Floor, wall, door, stairs, special
- Random encounters based on level depth
- Fixed encounters at specific locations
- Boss encounters on deeper levels
- Special tiles: Teleporters, spinners, darkness zones, anti-magic

## Architecture

### Services Involved

- **DungeonService** - Map loading, tile resolution
- **MapService** - Map data management, level transitions
- **TileService** - Tile effects (teleport, spinner, etc.)
- **EncounterService** - Random encounter generation
- **DoorService** - Door interactions (open, locked, trapped)
- **SearchService** - Trap detection, secret door discovery
- **NavigationService** - Movement validation

### Commands Involved

- **EnterDungeonCommand** - Enter dungeon from town
- **MoveForwardCommand** - Move forward
- **MoveBackwardCommand** - Move backward
- **StrafeLeftCommand** / **StrafeRightCommand** - Strafe
- **TurnLeftCommand** / **TurnRightCommand** - Rotate
- **DescendStairsCommand** - Go down stairs
- **AscendStairsCommand** - Go up stairs
- **OpenDoorCommand** - Open door
- **SearchCommand** - Search for traps/secrets

### Data Structures

```typescript
interface DungeonLevel {
  level: number                 // 1-10
  tiles: Tile[][]              // 20×20 grid
  encounters: FixedEncounter[]  // Scripted encounters
  boss?: BossEncounter          // Boss on this level
  specialZones: SpecialZone[]   // Darkness, anti-magic, etc.
}

interface Tile {
  type: TileType
  position: Position
  walls: WallState              // Which walls present
  door?: Door                   // If door tile
  stairs?: Stairs               // If stairs tile
  teleporter?: Teleporter       // If teleporter tile
  special?: SpecialEffect       // Spinner, darkness, etc.
  trap?: Trap                   // Hidden trap
  treasure?: Treasure           // Hidden treasure
}

type TileType =
  | 'floor'                     // Walkable
  | 'wall'                      // Impassable (rendered)
  | 'rock'                      // Impassable (not rendered, out of bounds)
  | 'door'                      // Openable barrier
  | 'stairs'                    // Level transition
  | 'teleporter'                // Instant transport
  | 'spinner'                   // Rotates party
  | 'elevator'                  // Multi-level transport (rare)

interface Door {
  open: boolean
  locked: boolean
  lockDifficulty: number        // 1-10 (for thieves)
  trapped: boolean
  trapType?: TrapType
}

interface Stairs {
  direction: 'up' | 'down'
  destination: Position         // Where stairs lead
}

interface Teleporter {
  destination: Position         // Teleport target (can change level)
  silent: boolean               // Show message or not
}

type SpecialEffect = 'spinner' | 'darkness' | 'antimagic' | 'chute'
```

## Dungeon Layout

### Level Structure

**Standard Level**:
- 20×20 grid (400 tiles)
- Mix of corridors, rooms, dead ends
- Multiple paths to goal
- Stairs to next level
- Optional: Stairs back to previous level

**Level Progression**:
```
Town (Level 0)
  ↓
Level 1 - Easiest (Kobolds, Bushwackers)
  ↓
Level 2
  ↓
Level 3
  ↓
Level 4 - Mid-game
  ↓
Level 5
  ↓
Level 6
  ↓
Level 7
  ↓
Level 8
  ↓
Level 9 - Very hard
  ↓
Level 10 - Werdna's Lair (final boss)
```

### Coordinate System

**Grid Coordinates**:
- X: 0-19 (west to east)
- Y: 0-19 (north to south)
- Level: 1-10

**Example Positions**:
```
(0,0) = Northwest corner
(19,0) = Northeast corner
(0,19) = Southwest corner
(19,19) = Southeast corner
(10,10) = Center
```

### Map Boundaries

**Out of Bounds**:
- X < 0 or X > 19: Rock (impassable)
- Y < 0 or Y > 19: Rock (impassable)
- Movement validation prevents out-of-bounds

## Tile Types

### Floor Tiles

**Standard Floor**:
- Walkable
- Can contain monsters (random encounters)
- Can contain treasure
- Can contain traps

### Wall Tiles

**Walls**:
- Impassable
- Block line of sight
- Rendered in first-person view
- Four directions: North, South, East, West

**Wall Configuration**:
```typescript
interface WallState {
  north: boolean
  south: boolean
  east: boolean
  west: boolean
}

// Example: Corridor (walls left/right)
{ north: false, south: false, east: true, west: true }

// Example: Dead end (walls on 3 sides)
{ north: true, south: false, east: true, west: true }

// Example: Room corner
{ north: true, south: false, east: false, west: true }
```

### Door Tiles

**Door States**:
- **Open**: Passable, no blocking
- **Closed**: Impassable, can be opened
- **Locked**: Impassable, requires key or thief
- **Trapped**: Has trap that triggers on open

**Opening Doors**:
```typescript
function openDoor(door: Door, party: Party): DoorResult {
  if (door.open) {
    return { success: true, message: 'Door already open' }
  }

  if (door.locked) {
    const thief = findThief(party)
    if (!thief) {
      return { success: false, message: 'Door is locked, need thief' }
    }

    const pickSuccess = attemptPickLock(thief, door.lockDifficulty)
    if (!pickSuccess) {
      return { success: false, message: 'Failed to pick lock' }
    }
  }

  if (door.trapped && !door.disarmed) {
    const trapResult = triggerTrap(door.trapType, party)
    return {
      success: true,
      message: 'Door opened (trap triggered!)',
      trapDamage: trapResult.damage
    }
  }

  return { success: true, message: 'Door opened' }
}
```

### Stairs

**Descending Stairs**:
- Go down one level (1 → 2 → 3...)
- Cannot descend from Level 10
- Destination: Specific tile on next level

**Ascending Stairs**:
- Go up one level (3 → 2 → 1)
- Level 1 → Town (exit dungeon)
- Destination: Specific tile on previous level

**Stairs Usage**:
```typescript
function useStairs(stairs: Stairs, party: Party): Position {
  if (stairs.direction === 'down') {
    if (party.position.level >= 10) {
      throw new Error('Cannot descend from Level 10')
    }
    return stairs.destination  // Next level
  } else {
    if (party.position.level <= 1) {
      return { x: 0, y: 0, level: 0 }  // Exit to town
    }
    return stairs.destination  // Previous level
  }
}
```

## Special Tiles

### Teleporters

**Teleporter Effect**:
- Instant transport to destination
- Can change level
- Can change facing
- May be silent or show message

**Teleport Process**:
```typescript
function triggerTeleporter(teleporter: Teleporter, party: Party): Party {
  const message = teleporter.silent
    ? null
    : 'You feel a strange sensation...'

  return {
    ...party,
    position: teleporter.destination,
    // Optionally: randomize facing
    facing: randomDirection()
  }
}
```

**Strategic Teleporters**:
- Shortcuts to deeper levels
- Traps (teleport into danger)
- Puzzle elements (must find correct teleporter)

### Spinners

**Spinner Effect**:
- Rotates party 90°, 180°, or 270°
- Disorients player
- No damage

**Spinner Process**:
```typescript
function triggerSpinner(party: Party): Party {
  const rotations = [90, 180, 270]
  const rotation = rotations[random(0, 2)]

  const newFacing = rotateFacing(party.facing, rotation)

  return {
    ...party,
    facing: newFacing
  }
}

function rotateFacing(facing: Direction, degrees: number): Direction {
  const directions = ['north', 'east', 'south', 'west']
  const currentIndex = directions.indexOf(facing)
  const steps = degrees / 90
  const newIndex = (currentIndex + steps) % 4

  return directions[newIndex] as Direction
}
```

### Darkness Zones

**Darkness Effect**:
- Cannot see walls in first-person view
- Movement still allowed
- Automap shows explored tiles normally
- MILWA spell provides light

**Darkness Check**:
```typescript
function isInDarkness(position: Position, level: DungeonLevel): boolean {
  const tile = level.tiles[position.y][position.x]
  return tile.special === 'darkness'
}

function canSeeWalls(party: Party, level: DungeonLevel): boolean {
  const inDarkness = isInDarkness(party.position, level)
  const hasMILWA = party.members.some(m => m.activeSpells.includes('MILWA'))

  return !inDarkness || hasMILWA
}
```

### Anti-Magic Zones

**Anti-Magic Effect**:
- Cannot cast spells
- Active spell effects dispelled
- MILWA disabled (darkness returns)
- Magic items don't work

**Anti-Magic Check**:
```typescript
function canCastSpell(party: Party, level: DungeonLevel): boolean {
  const tile = level.tiles[party.position.y][party.position.x]
  return tile.special !== 'antimagic'
}
```

### Chutes

**Chute Effect**:
- Falls down 1-3 levels
- Takes falling damage
- Cannot avoid (automatic)

**Chute Process**:
```typescript
function triggerChute(party: Party): Party {
  const fallLevels = random(1, 3)
  const newLevel = Math.min(party.position.level + fallLevels, 10)

  const damage = fallLevels * random(1, 6)  // 1d6 per level fallen

  return {
    ...party,
    position: {
      ...party.position,
      level: newLevel
    },
    members: party.members.map(m => ({
      ...m,
      hp: Math.max(0, m.hp - damage)
    }))
  }
}
```

## Encounters

### Random Encounters

**Encounter Check** (per move):
```typescript
function checkEncounter(party: Party, level: DungeonLevel): boolean {
  const baseChance = 10  // 10% per move
  const levelModifier = level.level * 2  // +2% per level

  const encounterChance = baseChance + levelModifier

  return random(1, 100) <= encounterChance
}
```

**Encounter Frequency**:
- Level 1: ~12% per move
- Level 5: ~20% per move
- Level 10: ~30% per move

**Monster Selection**:
```typescript
function generateEncounter(level: number): MonsterGroup[] {
  const monsterPool = getMonstersByLevel(level)
  const numGroups = random(1, 4)  // 1-4 groups

  const groups: MonsterGroup[] = []
  for (let i = 0; i < numGroups; i++) {
    const monster = selectRandomMonster(monsterPool)
    const count = random(monster.minCount, monster.maxCount)

    groups.push({
      id: String.fromCharCode(65 + i),  // 'A', 'B', 'C', 'D'
      monsters: Array(count).fill(monster),
      formation: monster.prefersBack ? 'back' : 'front'
    })
  }

  return groups
}
```

### Fixed Encounters

**Scripted Encounters**:
- Specific tile triggers specific encounter
- One-time or repeating
- Often guards treasure or important areas

**Fixed Encounter Example**:
```typescript
interface FixedEncounter {
  position: Position
  monsters: MonsterGroup[]
  oneTime: boolean              // Triggers only once
  triggered: boolean            // Has been triggered
  treasureGuarded?: Treasure
}
```

### Boss Encounters

**Boss Properties**:
- Much higher stats than normal monsters
- Cannot flee from boss fights
- Unique drops (special items)
- Story-critical encounters

**Final Boss** (Werdna, Level 10):
- Highest HP in game
- Multiple spell types
- Summons other monsters
- Guards Werdna's Amulet (victory condition)

## Traps

### Trap Types

**Damage Traps**:
- Arrow trap: 1d6 damage to one character
- Spear trap: 2d6 damage to front row
- Poison gas: 1d4 damage + poison status to party

**Status Traps**:
- Sleep gas: Party falls asleep
- Paralyze trap: One character paralyzed
- Teleport trap: Party teleported randomly

**Equipment Traps**:
- Rust trap: Armor damaged (-1 AC permanently)
- Corrosion trap: Weapon damaged (-1 damage)

### Trap Detection

**Search for Traps**:
```typescript
function searchForTraps(party: Party, tile: Tile): SearchResult {
  const thief = findThief(party)
  if (!thief) {
    return { found: false, message: 'No thief to search' }
  }

  if (!tile.trap) {
    return { found: false, message: 'No trap found' }
  }

  const detectChance = calculateDetectChance(thief, tile.trap.difficulty)
  const detected = random(1, 100) <= detectChance

  return {
    found: detected,
    message: detected ? `${tile.trap.type} trap found!` : 'No trap found',
    trap: detected ? tile.trap : null
  }
}

function calculateDetectChance(thief: Character, difficulty: number): number {
  const baseChance = 30
  const agilityBonus = (thief.stats.agi - 10) * 3
  const levelBonus = thief.level * 5
  const difficultyPenalty = difficulty * 5

  return baseChance + agilityBonus + levelBonus - difficultyPenalty
}
```

### Trap Disarming

**Disarm Trap**:
```typescript
function disarmTrap(thief: Character, trap: Trap): DisarmResult {
  const disarmChance = calculateDisarmChance(thief, trap.difficulty)
  const success = random(1, 100) <= disarmChance

  if (success) {
    return {
      success: true,
      message: 'Trap disarmed successfully!'
    }
  } else {
    // Failure triggers trap
    return {
      success: false,
      message: 'Failed to disarm trap! Trap triggered!',
      trapTriggered: true
    }
  }
}
```

## Related Documentation

**Services**:
- [DungeonService](../services/DungeonService.md) - Map loading, tile access
- [EncounterService](../services/EncounterService.md) - Random encounters
- [TileService](../services/TileService.md) - Special tile effects
- [NavigationService](../services/NavigationService.md) - Movement validation
- [SearchService](../services/SearchService.md) - Trap detection

**Commands**:
- [MoveForwardCommand](../commands/MoveForwardCommand.md) - Movement
- [DescendStairsCommand](../commands/DescendStairsCommand.md) - Stairs
- [OpenDoorCommand](../commands/OpenDoorCommand.md) - Doors
- [SearchCommand](../commands/SearchCommand.md) - Trap search

**Game Design**:
- [Dungeon Exploration](../game-design/06-dungeon.md) - Player guide
- [Monsters](../game-design/10-monsters.md) - Encounter reference

**Research**:
- [Monster Reference](../research/monster-reference.md) - All 96 monsters
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Level layouts

**Diagrams**:
- [Game State Machine](../diagrams/game-state-machine.md) - Dungeon state

**Implementation Notes**:
- 20×20 grid per level = 400 tiles (manageable size)
- Tile-based movement (not pixel-based)
- Special tiles add variety and challenge
- Encounter rate increases with depth
- Trap system rewards having thief in party
