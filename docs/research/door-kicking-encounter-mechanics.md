# Wizardry 1: Encounter & Combat System Implementation Reference

A comprehensive technical specification for implementing authentic Wizardry 1 encounter triggering, combat flow, and related mechanics. Based on Thomas William Ewers' reverse-engineered Pascal source code and validated against primary sources.

---

## Table of Contents

1. [Core Type Definitions](#1-core-type-definitions)
2. [FIGHTMAP System](#2-fightmap-system)
3. [Treasure Room Seeding](#3-treasure-room-seeding)
4. [Movement Encounters](#4-movement-encounters)
5. [Door Kicking Mechanics](#5-door-kicking-mechanics)
6. [Encounter Triggering Workflow](#6-encounter-triggering-workflow)
7. [Surprise Mechanics](#7-surprise-mechanics)
8. [Monster Group Selection](#8-monster-group-selection)
9. [Encounter Scaling](#9-encounter-scaling)
10. [Friendly/Neutral Encounters](#10-friendlyneutral-encounters)
11. [Combat Flow](#11-combat-flow)
12. [Initiative System](#12-initiative-system)
13. [Running Away](#13-running-away)
14. [Monster Call for Help](#14-monster-call-for-help)
15. [Breath Weapons](#15-breath-weapons)
16. [Spell Casting in Combat](#16-spell-casting-in-combat)
17. [Complete State Machine](#17-complete-state-machine)

---

## 1. Core Type Definitions

### 1.1 Enumerations

```typescript
/**
 * Character and party alignment
 * Determines encounter eligibility and alignment shift mechanics
 */
export enum Alignment {
  GOOD = 'good',
  NEUTRAL = 'neutral',
  EVIL = 'evil'
}

/**
 * Surprise states for combat initiation
 */
export enum SurpriseState {
  NONE = 0,           // Normal encounter - both sides act
  PARTY_SURPRISES = 1, // Party gets free action round
  MONSTERS_SURPRISE = 2 // Monsters get free action round
}

/**
 * Combat action types available to characters
 */
export enum CombatAction {
  FIGHT = 'fight',
  PARRY = 'parry',
  SPELL = 'spell',
  RUN = 'run',
  DISPEL = 'dispel',
  USE_ITEM = 'use_item'
}

/**
 * Monster behavior flags
 */
export enum MonsterAbility {
  CAN_RUN = 'can_run',
  CAN_BREATHE = 'can_breathe',
  CAN_GATE = 'can_gate',        // Call for help
  REGENERATE = 'regenerate',
  DRAIN_LEVEL = 'drain_level',
  POISON = 'poison',
  PARALYZE = 'paralyze',
  CRITICAL_HIT = 'critical_hit',
  STONE = 'stone',
  UNDEAD = 'undead',
  WERE = 'were',
  MAGE = 'mage',
  PRIEST = 'priest'
}

/**
 * Breath weapon damage types
 */
export enum BreathType {
  FIRE = 'fire',
  COLD = 'cold',
  POISON = 'poison',
  DRAIN = 'drain',
  STONE = 'stone'
}

/**
 * Tile types for encounter eligibility
 */
export enum TileType {
  CORRIDOR = 'corridor',  // Only random 1% encounters
  ROOM = 'room'           // Can have treasure, door-kick encounters
}

/**
 * Special square types
 */
export enum SquareType {
  NORMAL = 'normal',
  DARK = 'dark',
  ENCOUNTER = 'encounter',  // Fixed encounter location
  STAIRS_UP = 'stairs_up',
  STAIRS_DOWN = 'stairs_down',
  PIT = 'pit',
  CHUTE = 'chute',
  SPINNER = 'spinner',
  TELEPORT = 'teleport',
  ANTIMAGIC = 'antimagic'
}
```

### 1.2 Core Interfaces

```typescript
/**
 * Position on the dungeon map
 */
export interface Position {
  x: number;  // 0-19 (East-West)
  y: number;  // 0-19 (North-South)
  level: number;  // 1-10
}

/**
 * Map tile definition
 */
export interface MapTile {
  position: Position;
  tileType: TileType;
  squareType: SquareType;
  walls: {
    north: WallType;
    south: WallType;
    east: WallType;
    west: WallType;
  };
  // Special encounter configuration (when squareType === ENCOUNTER)
  encounterConfig?: FixedEncounterConfig;
}

/**
 * Wall types including doors
 */
export enum WallType {
  NONE = 'none',
  WALL = 'wall',
  DOOR = 'door',
  SECRET_DOOR = 'secret_door',
  ONE_WAY = 'one_way'
}

/**
 * Fixed encounter configuration (AUX values from original)
 */
export interface FixedEncounterConfig {
  aux0: number;  // Countdown - decrements each visit, becomes NORMAL at 0
  aux1: number;  // Random range added to aux2
  aux2: number;  // Base monster index
}

/**
 * Monster definition from bestiary
 */
export interface MonsterDefinition {
  id: number;
  name: string;
  namePlural: string;
  level: number;
  hitDice: number;        // Number of dice for HP
  hitDiceSides: number;   // Sides per die (usually d8)
  armorClass: number;
  attackCount: number;    // Number of attacks per round
  attackDice: number;     // Damage dice count
  attackDiceSides: number;// Damage dice sides
  abilities: MonsterAbility[];
  breathType?: BreathType;
  breathDamageMax: number; // Max breath damage
  spellsKnown?: string[]; // Spell IDs if MAGE or PRIEST
  xpReward: number;
  goldRange: [number, number];  // Min/max gold drop
  resistances: {
    fire: number;    // 0-100, percentage reduction
    cold: number;
    magic: number;
  };
  canBeCritical: boolean; // False if level > 23
  imageId: string;
}

/**
 * Active monster group in combat
 */
export interface MonsterGroup {
  definition: MonsterDefinition;
  count: number;           // Current alive count
  initialCount: number;    // Starting count
  currentHp: number[];     // HP for each monster in group
  identified: boolean;     // Has party identified this monster?
  status: MonsterStatus[];
  groupIndex: number;      // Position in encounter (0-3)
}

/**
 * Monster status effects
 */
export interface MonsterStatus {
  asleep: boolean;
  paralyzed: boolean;
  silenced: boolean;
  afraid: boolean;
}

/**
 * Character in party
 */
export interface Character {
  id: string;
  name: string;
  class: CharacterClass;
  level: number;
  alignment: Alignment;
  stats: CharacterStats;
  currentHp: number;
  maxHp: number;
  armorClass: number;
  status: CharacterStatus;
  position: number;  // 0-5, party order (0-2 front, 3-5 back)
  equipment: Equipment;
  spells: SpellSlots;
}

/**
 * Character stats
 */
export interface CharacterStats {
  strength: number;
  iq: number;
  piety: number;
  vitality: number;
  agility: number;
  luck: number;
}

/**
 * Character status effects
 */
export interface CharacterStatus {
  alive: boolean;
  poisoned: boolean;
  paralyzed: boolean;
  stoned: boolean;
  asleep: boolean;
  afraid: boolean;
  silenced: boolean;
}
```

### 1.3 Runtime State Interfaces

```typescript
/**
 * Per-level encounter tracking
 * Reset when leaving dungeon entirely (not on level change)
 */
export interface LevelEncounterState {
  level: number;
  
  /**
   * FIGHTMAP equivalent - tracks which tiles have had encounters
   * Key: "x,y" string for easy lookup
   * Value: true if encounter already occurred at this location
   */
  clearedTiles: Map<string, boolean>;
  
  /**
   * Treasure room locations for this visit
   * Set during level entry, cleared on dungeon exit
   */
  treasureRooms: Set<string>;  // "x,y" format
  
  /**
   * Alarm-spread tiles (clanging bells mechanic)
   * Tiles where next step guarantees encounter
   */
  alarmTiles: Set<string>;
}

/**
 * Complete dungeon encounter state
 */
export interface DungeonEncounterState {
  levels: Map<number, LevelEncounterState>;
  inDungeon: boolean;
}

/**
 * Active combat state
 */
export interface CombatState {
  active: boolean;
  surprise: SurpriseState;
  round: number;
  
  // Combatants
  party: Character[];
  monsterGroups: MonsterGroup[];
  
  // Round state
  currentPhase: CombatPhase;
  initiativeOrder: InitiativeEntry[];
  currentActorIndex: number;
  
  // Pending actions
  characterActions: Map<string, CharacterCombatAction>;
  
  // Results tracking
  roundLog: CombatLogEntry[];
  
  // Special flags
  chestAlarmTriggered: boolean;  // Triggers new encounter after combat
  canRun: boolean;               // False on Level 10
}

/**
 * Combat phases
 */
export enum CombatPhase {
  SURPRISE_CHECK = 'surprise_check',
  MONSTER_GENERATION = 'monster_generation',
  IDENTIFICATION = 'identification',
  ACTION_SELECTION = 'action_selection',
  INITIATIVE_ROLL = 'initiative_roll',
  EXECUTION = 'execution',
  END_ROUND = 'end_round',
  COMBAT_END = 'combat_end'
}

/**
 * Initiative entry for turn order
 */
export interface InitiativeEntry {
  type: 'character' | 'monster_group';
  id: string | number;  // Character ID or group index
  initiative: number;   // Lower acts first
  acted: boolean;
}

/**
 * Character's chosen combat action
 */
export interface CharacterCombatAction {
  characterId: string;
  action: CombatAction;
  target?: number;       // Monster group index
  spellId?: string;      // If action is SPELL
  itemId?: string;       // If action is USE_ITEM
}
```

---

## 2. FIGHTMAP System

The FIGHTMAP is a runtime boolean array tracking encounter eligibility per tile. It prevents immediate repeat encounters and enables the door-kick farming mechanic.

### 2.1 Data Structure

```typescript
/**
 * FIGHTMAP manager for encounter state tracking
 */
export class FightMap {
  private state: Map<number, LevelEncounterState> = new Map();
  
  /**
   * Initialize or reset state for a dungeon level
   */
  initializeLevel(level: number, dungeonMap: MapTile[][]): void {
    const levelState: LevelEncounterState = {
      level,
      clearedTiles: new Map(),
      treasureRooms: new Set(),
      alarmTiles: new Set()
    };
    
    // Mark all ROOM tiles as eligible for encounters initially
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const tile = dungeonMap[y][x];
        if (tile.tileType === TileType.ROOM) {
          // FALSE means encounter CAN occur here
          // (inverted from intuitive - matches original)
          levelState.clearedTiles.set(`${x},${y}`, false);
        }
      }
    }
    
    this.state.set(level, levelState);
  }
  
  /**
   * Check if an encounter can occur at position
   * Returns TRUE if encounter is possible
   */
  canEncounter(pos: Position): boolean {
    const levelState = this.state.get(pos.level);
    if (!levelState) return false;
    
    const key = `${pos.x},${pos.y}`;
    
    // Alarm tiles always trigger
    if (levelState.alarmTiles.has(key)) {
      return true;
    }
    
    // Check if tile hasn't been cleared
    const cleared = levelState.clearedTiles.get(key);
    return cleared === false;  // false = not yet cleared = can encounter
  }
  
  /**
   * Mark a tile as cleared (encounter occurred)
   */
  markCleared(pos: Position): void {
    const levelState = this.state.get(pos.level);
    if (!levelState) return;
    
    const key = `${pos.x},${pos.y}`;
    levelState.clearedTiles.set(key, true);
    levelState.alarmTiles.delete(key);
  }
  
  /**
   * Check if position has treasure room
   */
  hasTreasure(pos: Position): boolean {
    const levelState = this.state.get(pos.level);
    if (!levelState) return false;
    return levelState.treasureRooms.has(`${pos.x},${pos.y}`);
  }
  
  /**
   * Spread alarm (clanging bells mechanic)
   * Sets FIGHTMAP = TRUE in area, current tile = FALSE
   */
  spreadAlarm(center: Position, radius: number): void {
    const levelState = this.state.get(center.level);
    if (!levelState) return;
    
    const size = 2 * radius + 1;
    const startX = center.x - radius;
    const startY = center.y - radius;
    
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        
        // Bounds check
        if (x < 0 || x >= 20 || y < 0 || y >= 20) continue;
        
        const key = `${x},${y}`;
        
        if (x === center.x && y === center.y) {
          // Current position - clear it (no encounter here)
          levelState.clearedTiles.set(key, true);
          levelState.alarmTiles.delete(key);
        } else {
          // Surrounding tiles - mark for guaranteed encounter
          levelState.alarmTiles.add(key);
        }
      }
    }
  }
  
  /**
   * Reset all state (called when leaving dungeon entirely)
   */
  resetAll(): void {
    this.state.clear();
  }
}
```

### 2.2 FIGHTMAP Logic Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FIGHTMAP STATE FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │ Enter Level │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────┐                                       │
│  │ Initialize Level │                                       │
│  │ - All ROOM tiles │                                       │
│  │   cleared=false  │                                       │
│  │ - Seed 9 treasure│                                       │
│  │   rooms          │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────┐     ┌─────────────────┐                │
│  │ Player moves   │────▶│ Check FIGHTMAP  │                │
│  └────────────────┘     └────────┬────────┘                │
│           ▲                      │                          │
│           │              ┌───────┴───────┐                  │
│           │              ▼               ▼                  │
│           │      cleared=false    cleared=true              │
│           │      (CAN encounter)  (already cleared)         │
│           │              │               │                  │
│           │              ▼               ▼                  │
│           │      ┌────────────┐   ┌──────────────┐         │
│           │      │ Roll check │   │ No encounter │         │
│           │      │ (1%, kick, │   │ from FIGHTMAP│         │
│           │      │  treasure) │   │ (1% still    │         │
│           │      └─────┬──────┘   │  possible)   │         │
│           │            │          └──────────────┘         │
│           │    ┌───────┴───────┐                           │
│           │    ▼               ▼                           │
│           │  PASS           FAIL                           │
│           │    │               │                           │
│           │    ▼               │                           │
│           │ ┌────────────┐     │                           │
│           │ │ ENCOUNTER! │     │                           │
│           │ │ Mark tile  │     │                           │
│           │ │ cleared=   │     │                           │
│           │ │ true       │     │                           │
│           │ └────────────┘     │                           │
│           │                    │                           │
│           └────────────────────┘                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ RESET CONDITION: Leave dungeon entirely              │  │
│  │ (Not triggered by: level change, death, teleport)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Treasure Room Seeding

When entering a dungeon level, exactly 9 rooms are designated as treasure rooms with guaranteed encounters.

### 3.1 Seeding Algorithm

```typescript
/**
 * Seed 9 treasure rooms for a dungeon level
 * Algorithm favors lower-left due to scan direction
 */
export function seedTreasureRooms(
  level: number,
  dungeonMap: MapTile[][],
  levelState: LevelEncounterState,
  rng: RandomGenerator
): void {
  const TREASURE_ROOMS_TO_SEED = 9;
  let seeded = 0;
  let attempts = 0;
  const MAX_ATTEMPTS = 200;  // Prevent infinite loops
  
  // Get all room tiles
  const roomTiles: Position[] = [];
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      if (dungeonMap[y][x].tileType === TileType.ROOM) {
        roomTiles.push({ x, y, level });
      }
    }
  }
  
  if (roomTiles.length === 0) return;
  
  while (seeded < TREASURE_ROOMS_TO_SEED && attempts < MAX_ATTEMPTS) {
    attempts++;
    
    // Step 1: Random starting position
    const startIdx = rng.nextInt(0, roomTiles.length - 1);
    let pos = { ...roomTiles[startIdx] };
    
    // Step 2: Scan for valid room (rightward, then down)
    const found = scanForValidRoom(pos, dungeonMap, levelState);
    
    if (found) {
      // Step 3: Mark all contiguous room tiles
      markContiguousRoomAsTreasure(found, dungeonMap, levelState);
      seeded++;
    }
  }
}

/**
 * Scan rightward then downward for valid room tile
 * This creates the "lower-left corner bias"
 */
function scanForValidRoom(
  start: Position,
  dungeonMap: MapTile[][],
  levelState: LevelEncounterState
): Position | null {
  let { x, y } = start;
  const startX = x;
  const startY = y;
  
  do {
    const key = `${x},${y}`;
    const tile = dungeonMap[y]?.[x];
    
    // Check if valid room tile that isn't already treasure
    if (
      tile?.tileType === TileType.ROOM &&
      !levelState.treasureRooms.has(key)
    ) {
      return { x, y, level: start.level };
    }
    
    // Move right
    x++;
    
    // Wrap to next row down
    if (x >= 20) {
      x = 0;
      y++;
      
      // Wrap to top if we go past bottom
      if (y >= 20) {
        y = 0;
      }
    }
    
    // Stop if we've scanned everything
  } while (!(x === startX && y === startY));
  
  return null;
}

/**
 * Mark all contiguous room tiles as treasure
 * Uses flood-fill to find connected room tiles
 */
function markContiguousRoomAsTreasure(
  start: Position,
  dungeonMap: MapTile[][],
  levelState: LevelEncounterState
): void {
  const visited = new Set<string>();
  const queue: Position[] = [start];
  
  while (queue.length > 0) {
    const pos = queue.shift()!;
    const key = `${pos.x},${pos.y}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    const tile = dungeonMap[pos.y]?.[pos.x];
    if (!tile || tile.tileType !== TileType.ROOM) continue;
    
    // Mark as treasure room
    levelState.treasureRooms.add(key);
    
    // Check adjacent tiles (only if no wall between)
    const adjacent = [
      { dx: 0, dy: -1, wall: 'north' },  // North
      { dx: 0, dy: 1, wall: 'south' },   // South
      { dx: 1, dy: 0, wall: 'east' },    // East
      { dx: -1, dy: 0, wall: 'west' }    // West
    ];
    
    for (const adj of adjacent) {
      const newX = pos.x + adj.dx;
      const newY = pos.y + adj.dy;
      const newKey = `${newX},${newY}`;
      
      // Check bounds
      if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) continue;
      
      // Check if no wall blocking
      const wall = tile.walls[adj.wall as keyof typeof tile.walls];
      if (wall === WallType.WALL) continue;
      
      // Add to queue if not visited
      if (!visited.has(newKey)) {
        queue.push({ x: newX, y: newY, level: pos.level });
      }
    }
  }
}
```

### 3.2 Treasure Room Properties

```typescript
/**
 * Check encounter requirements for a treasure room
 */
export function checkTreasureRoomEncounter(
  pos: Position,
  fightMap: FightMap,
  dungeonMap: MapTile[][]
): boolean {
  // Treasure rooms GUARANTEE encounter on entry
  // But only if the FIGHTMAP hasn't cleared this tile
  
  const tile = dungeonMap[pos.y][pos.x];
  
  // Must be a room tile
  if (tile.tileType !== TileType.ROOM) return false;
  
  // Check if this is a treasure room
  if (!fightMap.hasTreasure(pos)) return false;
  
  // Check if not already cleared
  return fightMap.canEncounter(pos);
}
```

---

## 4. Movement Encounters

A 1% chance of random encounter occurs on every movement step, regardless of tile type.

### 4.1 Movement Encounter Check

```typescript
/**
 * Constants for encounter probabilities
 */
export const ENCOUNTER_CONSTANTS = {
  RANDOM_ENCOUNTER_CHANCE: 1,      // 1 in 99 (approximately 1%)
  RANDOM_ENCOUNTER_TARGET: 35,     // Specific number to match
  RANDOM_ENCOUNTER_MODULO: 99,
  
  DOOR_KICK_CHANCE: 8,             // 1 in 8 (12.5%)
  DOOR_KICK_TARGET: 3,             // Specific number to match
  
  SURPRISE_PARTY_THRESHOLD: 80,    // >80 = party surprises (20%)
  SURPRISE_MONSTER_THRESHOLD: 80,  // >80 = monsters surprise (20% of 80%)
} as const;

/**
 * Check for random movement encounter
 * Called on every N/S/E/W movement
 */
export function checkMovementEncounter(rng: RandomGenerator): boolean {
  // Original: (RANDOM MOD 99) = 35
  const roll = rng.nextInt(0, ENCOUNTER_CONSTANTS.RANDOM_ENCOUNTER_MODULO - 1);
  return roll === ENCOUNTER_CONSTANTS.RANDOM_ENCOUNTER_TARGET;
}

/**
 * Process movement and check all encounter conditions
 */
export function processMovement(
  party: Party,
  direction: Direction,
  dungeonMap: MapTile[][],
  fightMap: FightMap,
  rng: RandomGenerator
): MovementResult {
  const currentPos = party.position;
  const newPos = calculateNewPosition(currentPos, direction);
  
  // Check for walls/obstacles first
  const moveValid = canMove(currentPos, direction, dungeonMap);
  if (!moveValid.canMove) {
    return { moved: false, encounter: false, reason: moveValid.reason };
  }
  
  // Move the party
  party.position = newPos;
  
  // Check encounter conditions in priority order
  let encounterTriggered = false;
  let encounterReason: EncounterReason | null = null;
  
  // 1. Check alarm tiles (always trigger)
  const levelState = fightMap.getLevelState(newPos.level);
  if (levelState?.alarmTiles.has(`${newPos.x},${newPos.y}`)) {
    encounterTriggered = true;
    encounterReason = 'alarm';
  }
  
  // 2. Check treasure room (guaranteed encounter if not cleared)
  else if (checkTreasureRoomEncounter(newPos, fightMap, dungeonMap)) {
    encounterTriggered = true;
    encounterReason = 'treasure_room';
  }
  
  // 3. Check 1% random encounter (always possible)
  else if (checkMovementEncounter(rng)) {
    encounterTriggered = true;
    encounterReason = 'random';
  }
  
  if (encounterTriggered) {
    fightMap.markCleared(newPos);
  }
  
  return {
    moved: true,
    encounter: encounterTriggered,
    reason: encounterReason,
    newPosition: newPos
  };
}

export type EncounterReason = 'random' | 'door_kick' | 'treasure_room' | 
                              'alarm' | 'fixed' | 'chest_trap';

export interface MovementResult {
  moved: boolean;
  encounter: boolean;
  reason?: EncounterReason | string | null;
  newPosition?: Position;
}
```

---

## 5. Door Kicking Mechanics

Door kicking provides a 12.5% (1 in 8) chance of encounter when entering room tiles through doors.

### 5.1 Door Kick Logic

```typescript
/**
 * Process door kick action
 * In original: Press 'K' when facing a door
 */
export function processDoorKick(
  party: Party,
  direction: Direction,
  dungeonMap: MapTile[][],
  fightMap: FightMap,
  rng: RandomGenerator
): DoorKickResult {
  const currentPos = party.position;
  const currentTile = dungeonMap[currentPos.y][currentPos.x];
  
  // Check if there's a door in the facing direction
  const wall = currentTile.walls[direction];
  if (wall !== WallType.DOOR && wall !== WallType.SECRET_DOOR) {
    return { 
      success: false, 
      moved: false, 
      encounter: false,
      message: 'No door in that direction' 
    };
  }
  
  // Calculate destination
  const newPos = calculateNewPosition(currentPos, direction);
  const destTile = dungeonMap[newPos.y]?.[newPos.x];
  
  if (!destTile) {
    return { 
      success: false, 
      moved: false, 
      encounter: false,
      message: 'Invalid destination' 
    };
  }
  
  // Move through the door (kick = movement action)
  party.position = newPos;
  
  // Determine encounter eligibility
  let encounterTriggered = false;
  let reason: EncounterReason | null = null;
  
  // Check if destination is a ROOM tile with FIGHTS flag
  if (destTile.tileType === TileType.ROOM) {
    // First check if treasure room (guaranteed)
    if (fightMap.hasTreasure(newPos) && fightMap.canEncounter(newPos)) {
      encounterTriggered = true;
      reason = 'treasure_room';
    }
    // Then check 12.5% kick chance
    // NOTE: This works EVEN IF tile already cleared!
    // This is the farming mechanic
    else if (checkDoorKickEncounter(rng)) {
      encounterTriggered = true;
      reason = 'door_kick';
    }
  }
  
  // Also check 1% random (always applies)
  if (!encounterTriggered && checkMovementEncounter(rng)) {
    encounterTriggered = true;
    reason = 'random';
  }
  
  // Mark cleared if encounter from FIGHTMAP-based trigger
  if (encounterTriggered && reason !== 'random') {
    fightMap.markCleared(newPos);
  }
  
  return {
    success: true,
    moved: true,
    encounter: encounterTriggered,
    encounterReason: reason,
    newPosition: newPos
  };
}

/**
 * Check for door kick encounter (12.5%)
 * Original: (RANDOM MOD 8) = 3
 */
export function checkDoorKickEncounter(rng: RandomGenerator): boolean {
  const roll = rng.nextInt(0, ENCOUNTER_CONSTANTS.DOOR_KICK_CHANCE - 1);
  return roll === ENCOUNTER_CONSTANTS.DOOR_KICK_TARGET;
}

export interface DoorKickResult {
  success: boolean;
  moved: boolean;
  encounter: boolean;
  encounterReason?: EncounterReason | null;
  newPosition?: Position;
  message?: string;
}
```

### 5.2 Door State (None)

```typescript
/**
 * IMPORTANT: Doors have NO persistent open/closed state!
 * 
 * The original game does NOT track whether a door has been opened.
 * - Doors always render the same (closed appearance in wireframe)
 * - Kicking moves through the door in one action
 * - You can kick the same door repeatedly for encounter farming
 * 
 * This is intentional for the grinding mechanic.
 */

// There is NO DoorState interface because doors don't have state!
// The FIGHTMAP tracks encounters, not door state.

/**
 * Door rendering - always shows door frame
 * No "open door" graphic exists in wireframe renderer
 */
export function renderDoor(ctx: CanvasRenderingContext2D, wall: WallType): void {
  // Always render door outline regardless of whether
  // player has passed through
  if (wall === WallType.DOOR) {
    // Draw door frame (same appearance always)
    drawDoorFrame(ctx);
  }
}
```

---

## 6. Encounter Triggering Workflow

### 6.1 Complete Trigger Decision Tree

```typescript
/**
 * Master encounter check - called after any movement
 */
export function checkForEncounter(
  context: EncounterContext
): EncounterCheckResult {
  const { 
    position, 
    dungeonMap, 
    fightMap, 
    rng, 
    isDoorKick,
    chestAlarmActive 
  } = context;
  
  const tile = dungeonMap[position.y][position.x];
  
  // Priority 1: Chest alarm trap (immediate encounter)
  if (chestAlarmActive) {
    return { 
      trigger: true, 
      reason: 'chest_trap',
      guaranteedFight: true 
    };
  }
  
  // Priority 2: Alarm tiles (clanging bells)
  const levelState = fightMap.getLevelState(position.level);
  if (levelState?.alarmTiles.has(`${position.x},${position.y}`)) {
    return { 
      trigger: true, 
      reason: 'alarm',
      guaranteedFight: true 
    };
  }
  
  // Priority 3: Fixed encounter squares
  if (tile.squareType === SquareType.ENCOUNTER) {
    const config = tile.encounterConfig!;
    
    // Check countdown
    if (config.aux0 > 0) {
      // Decrement counter (in original, persists until dungeon exit)
      config.aux0--;
      
      // Check FIGHTS flag
      if (tile.tileType === TileType.ROOM && fightMap.canEncounter(position)) {
        return { 
          trigger: true, 
          reason: 'fixed',
          fixedEncounterConfig: config,
          guaranteedFight: true 
        };
      }
    }
  }
  
  // Priority 4: Treasure room (guaranteed if not cleared)
  if (tile.tileType === TileType.ROOM && 
      fightMap.hasTreasure(position) && 
      fightMap.canEncounter(position)) {
    return { 
      trigger: true, 
      reason: 'treasure_room',
      guaranteedFight: true 
    };
  }
  
  // Priority 5: Door kick check (12.5% for room tiles)
  if (isDoorKick && tile.tileType === TileType.ROOM) {
    // NOTE: Works even if FIGHTMAP cleared!
    if (checkDoorKickEncounter(rng)) {
      return { 
        trigger: true, 
        reason: 'door_kick',
        guaranteedFight: false 
      };
    }
  }
  
  // Priority 6: Random 1% (always checked last)
  if (checkMovementEncounter(rng)) {
    return { 
      trigger: true, 
      reason: 'random',
      guaranteedFight: false 
    };
  }
  
  return { trigger: false };
}

export interface EncounterContext {
  position: Position;
  dungeonMap: MapTile[][];
  fightMap: FightMap;
  rng: RandomGenerator;
  isDoorKick: boolean;
  chestAlarmActive: boolean;
}

export interface EncounterCheckResult {
  trigger: boolean;
  reason?: EncounterReason;
  fixedEncounterConfig?: FixedEncounterConfig;
  guaranteedFight?: boolean;
}
```

### 6.2 Trigger Priority Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                 ENCOUNTER TRIGGER PRIORITY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ Movement occurs  │                                           │
│  │ (walk or kick)   │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PRIORITY 1: Chest Alarm Active?                          │   │
│  │ (from failed disarm)                                     │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ YES ──────────────────────────────────────▶ ENCOUNTER!   │   │
│  │ NO ───▼                                                  │   │
│  └───────┼──────────────────────────────────────────────────┘   │
│          │                                                       │
│          ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PRIORITY 2: Alarm Tile? (clanging bells)                 │   │
│  │ Check: alarmTiles.has(position)                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ YES ──────────────────────────────────────▶ ENCOUNTER!   │   │
│  │ NO ───▼                                                  │   │
│  └───────┼──────────────────────────────────────────────────┘   │
│          │                                                       │
│          ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PRIORITY 3: Fixed Encounter Square?                      │   │
│  │ Check: squareType === ENCOUNTER && aux0 > 0              │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ YES + FIGHTS=true ────────────────────────▶ ENCOUNTER!   │   │
│  │ NO ───▼                                                  │   │
│  └───────┼──────────────────────────────────────────────────┘   │
│          │                                                       │
│          ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PRIORITY 4: Treasure Room?                               │   │
│  │ Check: hasTreasure(pos) && canEncounter(pos)             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ YES ──────────────────────────────────────▶ ENCOUNTER!   │   │
│  │ NO ───▼                                                  │   │
│  └───────┼──────────────────────────────────────────────────┘   │
│          │                                                       │
│          ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PRIORITY 5: Door Kick + Room Tile?                       │   │
│  │ Check: isDoorKick && tileType === ROOM                   │   │
│  │ Roll: (RANDOM MOD 8) === 3 (12.5%)                       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ YES ──────────────────────────────────────▶ ENCOUNTER!   │   │
│  │ NO ───▼                                                  │   │
│  └───────┼──────────────────────────────────────────────────┘   │
│          │                                                       │
│          ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PRIORITY 6: Random 1% Check                              │   │
│  │ Roll: (RANDOM MOD 99) === 35                             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ YES ──────────────────────────────────────▶ ENCOUNTER!   │   │
│  │ NO ───▼                                                  │   │
│  └───────┼──────────────────────────────────────────────────┘   │
│          │                                                       │
│          ▼                                                       │
│  ┌──────────────────┐                                           │
│  │ No encounter     │                                           │
│  │ Continue moving  │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Surprise Mechanics

### 7.1 Surprise Calculation

```typescript
/**
 * Determine surprise state for combat
 * 
 * Probability breakdown:
 * - 20% party surprises monsters
 * - 16% monsters surprise party (20% of remaining 80%)
 * - 64% normal encounter
 */
export function determineSurprise(rng: RandomGenerator): SurpriseState {
  // First roll: Does party surprise monsters?
  const partyRoll = rng.nextInt(0, 99);
  if (partyRoll > ENCOUNTER_CONSTANTS.SURPRISE_PARTY_THRESHOLD) {
    // >80 means party surprises (20% chance)
    return SurpriseState.PARTY_SURPRISES;
  }
  
  // Second roll: Do monsters surprise party?
  const monsterRoll = rng.nextInt(0, 99);
  if (monsterRoll > ENCOUNTER_CONSTANTS.SURPRISE_MONSTER_THRESHOLD) {
    // >80 means monsters surprise (20% of 80% = 16% overall)
    return SurpriseState.MONSTERS_SURPRISE;
  }
  
  // Neither side surprised (64%)
  return SurpriseState.NONE;
}

/**
 * Apply surprise effects to combat state
 */
export function applySurpriseEffects(
  combatState: CombatState,
  appleIIBehavior: boolean = true
): void {
  switch (combatState.surprise) {
    case SurpriseState.PARTY_SURPRISES:
      // Party gets free action round
      // Monsters cannot act in round 1
      combatState.monsterGroups.forEach(group => {
        group.status.forEach(status => {
          status.canActThisRound = false;
        });
      });
      
      // Party CAN cast spells during surprise (Apple II)
      // IBM PC and NES block spell casting
      if (!appleIIBehavior) {
        combatState.spellsBlockedThisRound = true;
      }
      break;
      
    case SurpriseState.MONSTERS_SURPRISE:
      // Monsters get free action round
      // Party cannot act in round 1
      combatState.party.forEach(char => {
        char.canActThisRound = false;
      });
      
      // Characters cannot cast (all versions agree)
      combatState.spellsBlockedThisRound = true;
      break;
      
    case SurpriseState.NONE:
      // Normal encounter - everyone can act
      break;
  }
}
```

### 7.2 Surprise Round Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   SURPRISE DETERMINATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Roll 1: RANDOM(0-99) > 80?                          │    │
│  │ (20% chance for YES)                                │    │
│  └───────────────────┬─────────────────────────────────┘    │
│                      │                                       │
│           ┌──────────┴──────────┐                           │
│           ▼                     ▼                           │
│         YES                    NO                           │
│           │                     │                           │
│           ▼                     ▼                           │
│  ┌────────────────┐   ┌───────────────────────────────┐    │
│  │ PARTY          │   │ Roll 2: RANDOM(0-99) > 80?    │    │
│  │ SURPRISES      │   │ (20% of remaining 80% = 16%)  │    │
│  │ MONSTERS       │   └───────────────┬───────────────┘    │
│  └────────────────┘                   │                     │
│                            ┌──────────┴──────────┐          │
│                            ▼                     ▼          │
│                          YES                    NO          │
│                            │                     │          │
│                            ▼                     ▼          │
│                   ┌────────────────┐    ┌────────────────┐  │
│                   │ MONSTERS       │    │ NORMAL         │  │
│                   │ SURPRISE       │    │ ENCOUNTER      │  │
│                   │ PARTY          │    │ (64%)          │  │
│                   └────────────────┘    └────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    SURPRISE EFFECTS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PARTY SURPRISES (20%):                                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • Party acts first (free round)                    │     │
│  │ • Monsters cannot act in Round 1                   │     │
│  │ • Spells ALLOWED (Apple II) or BLOCKED (PC/NES)    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  MONSTERS SURPRISE (16%):                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • Monsters act first (free round)                  │     │
│  │ • Party cannot act in Round 1                      │     │
│  │ • Spells BLOCKED (all versions)                    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  NORMAL (64%):                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • Initiative determines turn order                 │     │
│  │ • Both sides can act                               │     │
│  │ • Spells ALLOWED                                   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Monster Group Selection

### 8.1 Monster Table Structure

```typescript
/**
 * Monster encounter table for a dungeon level
 * Three rows with different selection weights
 */
export interface MonsterEncounterTable {
  level: number;
  rows: [MonsterTableRow, MonsterTableRow, MonsterTableRow];
}

/**
 * Single row in monster table (ENMYCALC equivalent)
 */
export interface MonsterTableRow {
  minEnemy: number;      // MINENEMY - base monster index
  range: number;         // RANGE0N - range for random selection
  percentWorse: number;  // PERCWORS - chance for upgraded monster
  multiplyWorse: number; // MULTWORS - multiplier for upgrade
  worse01: number;       // WORSE01 - additional upgrade factor
}

/**
 * Row selection weights
 */
export const MONSTER_ROW_WEIGHTS = {
  ROW_A: 0.75,    // 75% - Most common monsters
  ROW_B: 0.1875,  // 18.75% - Uncommon monsters
  ROW_C: 0.0625   // 6.25% - Rare monsters
} as const;

/**
 * Select which monster table row to use
 */
export function selectMonsterRow(rng: RandomGenerator): 0 | 1 | 2 {
  const roll = rng.nextFloat();
  
  if (roll < MONSTER_ROW_WEIGHTS.ROW_A) {
    return 0;  // Row A (75%)
  } else if (roll < MONSTER_ROW_WEIGHTS.ROW_A + MONSTER_ROW_WEIGHTS.ROW_B) {
    return 1;  // Row B (18.75%)
  } else {
    return 2;  // Row C (6.25%)
  }
}
```

### 8.2 Monster Selection Algorithm

```typescript
/**
 * Generate monster for encounter from table row
 */
export function selectMonsterFromRow(
  row: MonsterTableRow,
  rng: RandomGenerator
): number {
  // Base selection: minEnemy + random(0 to range)
  let monsterIndex = row.minEnemy + rng.nextInt(0, row.range);
  
  // Upgrade check (PERCWORS)
  if (row.percentWorse > 0) {
    const upgradeRoll = rng.nextInt(0, 99);
    if (upgradeRoll < row.percentWorse) {
      // Apply upgrade: add multiplyWorse * worse01
      monsterIndex += row.multiplyWorse * row.worse01;
    }
  }
  
  return monsterIndex;
}

/**
 * Generate complete encounter group
 */
export function generateEncounterGroups(
  level: number,
  encounterTables: Map<number, MonsterEncounterTable>,
  bestiary: MonsterDefinition[],
  rng: RandomGenerator,
  fixedConfig?: FixedEncounterConfig
): MonsterGroup[] {
  const groups: MonsterGroup[] = [];
  const limits = getEncounterLimits(level);
  
  // Determine number of groups
  const groupCount = rng.nextInt(1, limits.maxGroups);
  
  for (let g = 0; g < groupCount; g++) {
    let monsterIndex: number;
    
    if (fixedConfig) {
      // Fixed encounter - use AUX values
      monsterIndex = fixedConfig.aux2;
      if (fixedConfig.aux1 > 0) {
        monsterIndex += rng.nextInt(0, fixedConfig.aux1);
      }
    } else {
      // Random encounter - use table
      const table = encounterTables.get(level);
      if (!table) continue;
      
      const rowIndex = selectMonsterRow(rng);
      monsterIndex = selectMonsterFromRow(table.rows[rowIndex], rng);
    }
    
    const definition = bestiary[monsterIndex];
    if (!definition) continue;
    
    // Determine count
    const count = rng.nextInt(1, limits.maxPerGroup);
    
    // Generate HP for each monster
    const currentHp: number[] = [];
    for (let m = 0; m < count; m++) {
      let hp = 0;
      for (let d = 0; d < definition.hitDice; d++) {
        hp += rng.nextInt(1, definition.hitDiceSides);
      }
      currentHp.push(Math.max(1, hp));
    }
    
    groups.push({
      definition,
      count,
      initialCount: count,
      currentHp,
      identified: false,
      status: Array(count).fill(null).map(() => ({
        asleep: false,
        paralyzed: false,
        silenced: false,
        afraid: false
      })),
      groupIndex: g
    });
  }
  
  return groups;
}
```

---

## 9. Encounter Scaling

### 9.1 Scaling Limits by Level

```typescript
/**
 * Encounter limits based on maze level
 */
export interface EncounterLimits {
  maxGroups: number;
  maxPerGroup: number;
}

/**
 * Get encounter limits for a dungeon level
 */
export function getEncounterLimits(level: number): EncounterLimits {
  // Original table from source code
  const LIMITS: Record<number, EncounterLimits> = {
    1: { maxGroups: 2, maxPerGroup: 5 },
    2: { maxGroups: 3, maxPerGroup: 6 },
    3: { maxGroups: 3, maxPerGroup: 7 },
    4: { maxGroups: 4, maxPerGroup: 8 },
    5: { maxGroups: 4, maxPerGroup: 9 },
    6: { maxGroups: 4, maxPerGroup: 9 },
    7: { maxGroups: 4, maxPerGroup: 9 },
    8: { maxGroups: 4, maxPerGroup: 9 },
    9: { maxGroups: 4, maxPerGroup: 9 },
    10: { maxGroups: 4, maxPerGroup: 9 }
  };
  
  return LIMITS[level] || LIMITS[10];
}

/**
 * Scaling summary table
 * 
 * | Level | Max Groups | Max Per Group |
 * |-------|------------|---------------|
 * | 1     | 2          | 5             |
 * | 2     | 3          | 6             |
 * | 3     | 3          | 7             |
 * | 4     | 4          | 8             |
 * | 5+    | 4          | 9             |
 */
```

---

## 10. Friendly/Neutral Encounters

### 10.1 Alignment System

```typescript
/**
 * Determine party's effective alignment
 * Based on first non-neutral member
 */
export function getPartyAlignment(party: Character[]): Alignment {
  for (const char of party) {
    if (char.alignment !== Alignment.NEUTRAL) {
      return char.alignment;
    }
  }
  return Alignment.NEUTRAL;
}

/**
 * Check if party can encounter friendly monsters
 * Only GOOD parties can have friendly encounters
 */
export function canHaveFriendlyEncounter(party: Character[]): boolean {
  const alignment = getPartyAlignment(party);
  return alignment === Alignment.GOOD;
}

/**
 * Monster disposition types
 */
export enum MonsterDisposition {
  HOSTILE = 'hostile',
  FRIENDLY = 'friendly',
  UNKNOWN = 'unknown'
}

/**
 * Determine monster disposition for this encounter
 */
export function determineDisposition(
  monsterDef: MonsterDefinition,
  party: Character[],
  rng: RandomGenerator
): MonsterDisposition {
  // Evil parties NEVER get friendly encounters
  const partyAlignment = getPartyAlignment(party);
  if (partyAlignment === Alignment.EVIL) {
    return MonsterDisposition.HOSTILE;
  }
  
  // Neutral parties also don't get friendlies
  if (partyAlignment === Alignment.NEUTRAL) {
    return MonsterDisposition.HOSTILE;
  }
  
  // Only GOOD parties can have friendly encounters
  // Check monster's alignment compatibility
  // (Specific logic varies by monster - some are always hostile)
  if (monsterDef.abilities.includes(MonsterAbility.UNDEAD)) {
    return MonsterDisposition.HOSTILE;  // Undead always hostile
  }
  
  // Roll for friendly disposition
  // (Exact percentage varies by monster)
  const friendlyChance = getFriendlyChance(monsterDef);
  if (rng.nextFloat() < friendlyChance) {
    return MonsterDisposition.FRIENDLY;
  }
  
  return MonsterDisposition.HOSTILE;
}
```

### 10.2 Alignment Shift Mechanic

```typescript
/**
 * Check for alignment shift when fighting friendlies
 * GOOD characters have 1/2000 (0.05%) chance to turn EVIL per encounter
 */
export function checkAlignmentShift(
  character: Character,
  foughtFriendlies: boolean,
  rng: RandomGenerator
): boolean {
  // Only applies to GOOD characters fighting friendlies
  if (character.alignment !== Alignment.GOOD) return false;
  if (!foughtFriendlies) return false;
  
  // 1 in 2000 chance (0.05%)
  const SHIFT_CHANCE = 1 / 2000;
  
  if (rng.nextFloat() < SHIFT_CHANCE) {
    character.alignment = Alignment.EVIL;
    return true;  // Alignment shifted!
  }
  
  return false;
}

/**
 * Apply alignment checks to all party members after combat
 */
export function processAlignmentShifts(
  party: Character[],
  combatResult: CombatResult,
  rng: RandomGenerator
): AlignmentShiftResult[] {
  const shifts: AlignmentShiftResult[] = [];
  
  if (!combatResult.foughtFriendlyMonsters) return shifts;
  
  for (const char of party) {
    if (checkAlignmentShift(char, true, rng)) {
      shifts.push({
        characterId: char.id,
        characterName: char.name,
        from: Alignment.GOOD,
        to: Alignment.EVIL
      });
    }
  }
  
  return shifts;
}

export interface AlignmentShiftResult {
  characterId: string;
  characterName: string;
  from: Alignment;
  to: Alignment;
}
```

---

## 11. Combat Flow

### 11.1 Combat State Machine

```typescript
/**
 * Combat phase definitions with transitions
 */
export const COMBAT_PHASES = {
  ENCOUNTER_START: {
    next: 'SURPRISE_CHECK',
    action: 'initializeCombat'
  },
  SURPRISE_CHECK: {
    next: 'MONSTER_GENERATION',
    action: 'determineSurprise'
  },
  MONSTER_GENERATION: {
    next: 'IDENTIFICATION',
    action: 'generateMonsters'
  },
  IDENTIFICATION: {
    next: 'ACTION_SELECTION',
    action: 'identifyMonsters'
  },
  ACTION_SELECTION: {
    next: 'INITIATIVE_ROLL',
    action: 'selectActions',
    skipIf: 'allActionsSelected'
  },
  INITIATIVE_ROLL: {
    next: 'EXECUTION',
    action: 'rollInitiative'
  },
  EXECUTION: {
    next: 'END_ROUND',
    action: 'executeActions',
    loop: 'untilAllActed'
  },
  END_ROUND: {
    next: 'ACTION_SELECTION',  // or COMBAT_END
    action: 'processEndRound',
    exitIf: 'combatEnded'
  },
  COMBAT_END: {
    next: null,
    action: 'finalizeCombat'
  }
} as const;

/**
 * Main combat controller
 */
export class CombatController {
  private state: CombatState;
  private rng: RandomGenerator;
  
  constructor(rng: RandomGenerator) {
    this.rng = rng;
    this.state = this.createInitialState();
  }
  
  /**
   * Start a new combat encounter
   */
  startCombat(
    party: Character[],
    position: Position,
    encounterReason: EncounterReason,
    fixedConfig?: FixedEncounterConfig
  ): void {
    this.state = this.createInitialState();
    this.state.active = true;
    this.state.party = [...party];
    
    // Phase 1: Determine surprise
    this.state.surprise = determineSurprise(this.rng);
    applySurpriseEffects(this.state);
    
    // Phase 2: Generate monsters
    this.state.monsterGroups = generateEncounterGroups(
      position.level,
      this.encounterTables,
      this.bestiary,
      this.rng,
      fixedConfig
    );
    
    // Phase 3: Identification attempts
    this.attemptIdentification();
    
    // Ready for action selection
    this.state.currentPhase = CombatPhase.ACTION_SELECTION;
  }
  
  /**
   * Process character action selection
   */
  selectAction(characterId: string, action: CharacterCombatAction): void {
    this.state.characterActions.set(characterId, action);
    
    // Check if all characters have selected
    const activeChars = this.state.party.filter(c => 
      c.status.alive && !c.status.paralyzed && !c.status.stoned
    );
    
    if (this.state.characterActions.size >= activeChars.length) {
      this.advanceToExecution();
    }
  }
  
  /**
   * Roll initiative and begin execution phase
   */
  private advanceToExecution(): void {
    this.state.currentPhase = CombatPhase.INITIATIVE_ROLL;
    
    // Roll initiative for all combatants
    this.state.initiativeOrder = this.rollAllInitiative();
    
    // Sort by initiative (lowest first)
    this.state.initiativeOrder.sort((a, b) => {
      if (a.initiative === b.initiative) {
        // Ties: characters before monsters
        if (a.type === 'character' && b.type === 'monster_group') return -1;
        if (a.type === 'monster_group' && b.type === 'character') return 1;
      }
      return a.initiative - b.initiative;
    });
    
    this.state.currentPhase = CombatPhase.EXECUTION;
    this.state.currentActorIndex = 0;
  }
  
  /**
   * Execute next action in initiative order
   */
  executeNextAction(): CombatActionResult {
    const entry = this.state.initiativeOrder[this.state.currentActorIndex];
    let result: CombatActionResult;
    
    if (entry.type === 'character') {
      result = this.executeCharacterAction(entry.id as string);
    } else {
      result = this.executeMonsterAction(entry.id as number);
    }
    
    entry.acted = true;
    this.state.currentActorIndex++;
    
    // Check if round is complete
    if (this.state.currentActorIndex >= this.state.initiativeOrder.length) {
      this.endRound();
    }
    
    return result;
  }
  
  /**
   * Process end of round
   */
  private endRound(): void {
    this.state.currentPhase = CombatPhase.END_ROUND;
    this.state.round++;
    
    // Process regeneration
    this.processRegeneration();
    
    // Check victory/defeat conditions
    if (this.checkCombatEnd()) {
      this.state.currentPhase = CombatPhase.COMBAT_END;
      this.finalizeCombat();
      return;
    }
    
    // Clear surprise effects after round 1
    if (this.state.round === 2) {
      this.clearSurpriseEffects();
    }
    
    // Reset for next round
    this.state.characterActions.clear();
    this.state.currentActorIndex = 0;
    this.state.currentPhase = CombatPhase.ACTION_SELECTION;
  }
  
  // ... additional implementation methods
}
```

### 11.2 Combat Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       COMPLETE COMBAT FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐                                                │
│  │ ENCOUNTER       │                                                │
│  │ TRIGGERED       │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: SURPRISE CHECK                                     │    │
│  │ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │ Roll 1: RANDOM(0-99) > 80? → Party surprises (20%)    │   │    │
│  │ │ Roll 2: RANDOM(0-99) > 80? → Monsters surprise (16%)  │   │    │
│  │ │ Neither: Normal encounter (64%)                       │   │    │
│  │ └───────────────────────────────────────────────────────┘   │    │
│  └────────┬────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: MONSTER GENERATION                                 │    │
│  │ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │ 1. Select table row (A:75%, B:18.75%, C:6.25%)        │   │    │
│  │ │ 2. Roll monster index from row                        │   │    │
│  │ │ 3. Roll group count (1 to maxGroups)                  │   │    │
│  │ │ 4. Roll monster count per group (1 to maxPerGroup)    │   │    │
│  │ │ 5. Roll HP for each monster                           │   │    │
│  │ └───────────────────────────────────────────────────────┘   │    │
│  └────────┬────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ PHASE 3: IDENTIFICATION                                     │    │
│  │ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │ For each monster group:                               │   │    │
│  │ │   Roll identification based on character INT/class    │   │    │
│  │ │   Success: Show monster name and count                │   │    │
│  │ │   Failure: Show "? ??????" (unidentified)             │   │    │
│  │ └───────────────────────────────────────────────────────┘   │    │
│  └────────┬────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ PHASE 4: ACTION SELECTION (repeat for each character)       │    │
│  │ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │ Options:                                              │   │    │
│  │ │ • [F]ight - Attack with weapon                        │   │    │
│  │ │ • [P]arry - Defensive stance (+AC bonus)              │   │    │
│  │ │ • [S]pell - Cast spell (if able)                      │   │    │
│  │ │ • [R]un   - Attempt to flee                           │   │    │
│  │ │ • [D]ispel - Turn undead (priests/lords)              │   │    │
│  │ │ • [U]se   - Use item                                  │   │    │
│  │ └───────────────────────────────────────────────────────┘   │    │
│  └────────┬────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ PHASE 5: INITIATIVE ROLL                                    │    │
│  │ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │ Characters: RANDOM(0-9) + AgilityModifier, min 1      │   │    │
│  │ │ Monsters:   RANDOM(0-7) + 2, range 2-9                │   │    │
│  │ │ Sort all by initiative (lowest acts first)            │   │    │
│  │ │ Ties: Characters act before monsters                  │   │    │
│  │ └───────────────────────────────────────────────────────┘   │    │
│  └────────┬────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ PHASE 6: EXECUTION (in initiative order)                    │    │
│  │ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │ For each combatant in initiative order:               │   │    │
│  │ │   If character → Execute selected action              │   │    │
│  │ │   If monster   → AI selects and executes action       │   │    │
│  │ │   Process damage, status effects, deaths              │   │    │
│  │ │   Check for combat end after each action              │   │    │
│  │ └───────────────────────────────────────────────────────┘   │    │
│  └────────┬────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ PHASE 7: END ROUND                                          │    │
│  │ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │ • Process monster regeneration                        │   │    │
│  │ │ • Clear parry bonuses                                 │   │    │
│  │ │ • Check victory/defeat conditions                     │   │    │
│  │ │ • Clear surprise effects (after round 1)              │   │    │
│  │ └───────────────────────────────────────────────────────┘   │    │
│  └────────┬────────────────────────────────────────────────────┘    │
│           │                                                          │
│     ┌─────┴─────┐                                                   │
│     ▼           ▼                                                   │
│  CONTINUE?   END COMBAT                                             │
│     │           │                                                   │
│     │           ▼                                                   │
│     │  ┌─────────────────────────────────────────────────────┐     │
│     │  │ PHASE 8: COMBAT END                                 │     │
│     │  │ ┌───────────────────────────────────────────────┐   │     │
│     │  │ │ Victory:                                      │   │     │
│     │  │ │   • Award XP (divided by alive party count)   │   │     │
│     │  │ │   • Generate treasure chest                   │   │     │
│     │  │ │   • Check alignment shifts                    │   │     │
│     │  │ │                                               │   │     │
│     │  │ │ Defeat:                                       │   │     │
│     │  │ │   • All party dead → Game over / return body  │   │     │
│     │  │ │                                               │   │     │
│     │  │ │ Fled:                                         │   │     │
│     │  │ │   • No XP, no treasure                        │   │     │
│     │  │ │   • Possible damage during retreat            │   │     │
│     │  │ └───────────────────────────────────────────────┘   │     │
│     │  └─────────────────────────────────────────────────────┘     │
│     │                                                               │
│     └──────────▶ LOOP TO PHASE 4 (next round)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12. Initiative System

### 12.1 Initiative Calculation

```typescript
/**
 * Agility modifier table
 * Higher agility = LOWER modifier = acts SOONER
 */
export const AGILITY_MODIFIERS: Record<number, number> = {
  3: 3,    // Worst - acts last
  4: 3,
  5: 2,
  6: 2,
  7: 1,
  8: 1,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: -1,
  14: -1,
  15: -2,
  16: -2,
  17: -3,
  18: -4   // Best - acts first
};

/**
 * Calculate character initiative for combat round
 * Formula: RANDOM(0-9) + AgilityModifier, minimum 1
 */
export function rollCharacterInitiative(
  character: Character,
  rng: RandomGenerator
): number {
  const baseRoll = rng.nextInt(0, 9);
  const modifier = AGILITY_MODIFIERS[character.stats.agility] || 0;
  
  const initiative = baseRoll + modifier;
  return Math.max(1, initiative);  // Minimum 1
}

/**
 * Calculate monster group initiative
 * Formula: RANDOM(0-7) + 2, range 2-9
 */
export function rollMonsterInitiative(rng: RandomGenerator): number {
  return rng.nextInt(0, 7) + 2;  // Always 2-9
}

/**
 * Roll initiative for all combatants
 */
export function rollAllInitiative(
  party: Character[],
  monsterGroups: MonsterGroup[],
  rng: RandomGenerator
): InitiativeEntry[] {
  const entries: InitiativeEntry[] = [];
  
  // Characters
  for (const char of party) {
    if (!char.status.alive || char.status.paralyzed || char.status.stoned) {
      continue;  // Can't act
    }
    
    entries.push({
      type: 'character',
      id: char.id,
      initiative: rollCharacterInitiative(char, rng),
      acted: false
    });
  }
  
  // Monster groups (one roll per group)
  for (let i = 0; i < monsterGroups.length; i++) {
    const group = monsterGroups[i];
    if (group.count === 0) continue;  // All dead
    
    entries.push({
      type: 'monster_group',
      id: i,
      initiative: rollMonsterInitiative(rng),
      acted: false
    });
  }
  
  // Sort: lowest initiative acts first
  // Ties: characters before monsters
  entries.sort((a, b) => {
    if (a.initiative === b.initiative) {
      if (a.type === 'character' && b.type === 'monster_group') return -1;
      if (a.type === 'monster_group' && b.type === 'character') return 1;
      return 0;
    }
    return a.initiative - b.initiative;
  });
  
  return entries;
}
```

### 12.2 Initiative Order Example

```
┌─────────────────────────────────────────────────────────────┐
│                 INITIATIVE EXAMPLE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Party:                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Fighter "Bob"    AGI: 12  Roll: 4  Mod: 0  Init: 4  │    │
│  │ Mage "Alice"     AGI: 16  Roll: 7  Mod:-2  Init: 5  │    │
│  │ Thief "Carol"    AGI: 18  Roll: 3  Mod:-4  Init: 1* │    │
│  │ Priest "Dave"    AGI: 9   Roll: 8  Mod: 0  Init: 8  │    │
│  └─────────────────────────────────────────────────────┘    │
│  * Carol's raw init was -1, minimum forced to 1             │
│                                                              │
│  Monsters:                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Group 0 (Kobolds x4)    Roll: 5+2 = 7               │    │
│  │ Group 1 (Orc x2)        Roll: 2+2 = 4               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  SORTED ORDER (lowest first):                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Carol (Thief)      Init: 1                      │    │
│  │  2. Bob (Fighter)      Init: 4  ← TIE               │    │
│  │  3. Group 1 (Orcs)     Init: 4  ← Characters first  │    │
│  │  4. Alice (Mage)       Init: 5                      │    │
│  │  5. Group 0 (Kobolds)  Init: 7                      │    │
│  │  6. Dave (Priest)      Init: 8                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Running Away

### 13.1 Run Calculation

```typescript
/**
 * Running away constants
 */
export const RUN_CONSTANTS = {
  BASE_SUCCESS: 39,           // Base 39% chance
  LEVEL_PENALTY: 3,           // -3% per maze level
  SMALL_PARTY_THRESHOLD: 3,   // Party size for bonus
  SMALL_PARTY_BASE_BONUS: 20, // +20% for small parties
  SMALL_PARTY_PER_MEMBER: 5,  // -5% per member
  DEMORALIZED_BONUS: 20,      // +20% if monsters demoralized
  LEVEL_10_BLOCKED: true      // Cannot run on level 10
} as const;

/**
 * Calculate run success chance
 * Formula: 39% - (MazeLevel × 3%) + modifiers
 */
export function calculateRunChance(
  mazeLevel: number,
  partySize: number,
  monstersDemoralized: boolean
): number {
  // Level 10: Running NEVER works
  if (mazeLevel >= 10) {
    return 0;
  }
  
  // Base calculation
  let chance = RUN_CONSTANTS.BASE_SUCCESS - 
               (mazeLevel * RUN_CONSTANTS.LEVEL_PENALTY);
  
  // Small party bonus
  if (partySize <= RUN_CONSTANTS.SMALL_PARTY_THRESHOLD) {
    const bonus = RUN_CONSTANTS.SMALL_PARTY_BASE_BONUS - 
                  (partySize * RUN_CONSTANTS.SMALL_PARTY_PER_MEMBER);
    chance += bonus;
  }
  
  // Demoralized monsters bonus
  if (monstersDemoralized) {
    chance += RUN_CONSTANTS.DEMORALIZED_BONUS;
  }
  
  return Math.max(0, Math.min(100, chance));
}

/**
 * Attempt to run from combat
 */
export function attemptRun(
  combatState: CombatState,
  rng: RandomGenerator
): RunResult {
  const mazeLevel = combatState.currentLevel;
  const aliveParty = combatState.party.filter(c => c.status.alive);
  const demoralized = checkMonstersDemoralized(combatState);
  
  const chance = calculateRunChance(
    mazeLevel, 
    aliveParty.length, 
    demoralized
  );
  
  // Level 10 special message
  if (mazeLevel >= 10) {
    return {
      success: false,
      message: "You cannot escape from this battle!",
      chance: 0
    };
  }
  
  const roll = rng.nextInt(0, 99);
  const success = roll < chance;
  
  if (success) {
    return {
      success: true,
      message: "Your party successfully flees!",
      chance,
      roll
    };
  } else {
    return {
      success: false,
      message: "You failed to escape!",
      chance,
      roll
    };
  }
}

/**
 * Check if monsters are demoralized
 * Monsters demoralize when party total level > monster level × count
 */
export function checkMonstersDemoralized(
  combatState: CombatState
): boolean {
  const partyTotalLevel = combatState.party
    .filter(c => c.status.alive)
    .reduce((sum, c) => sum + c.level, 0);
  
  for (const group of combatState.monsterGroups) {
    const monsterPower = group.definition.level * group.count;
    if (partyTotalLevel > monsterPower) {
      return true;  // At least one group is demoralized
    }
  }
  
  return false;
}

export interface RunResult {
  success: boolean;
  message: string;
  chance: number;
  roll?: number;
}
```

### 13.2 Run Probability Table

```
┌─────────────────────────────────────────────────────────────┐
│                  RUN SUCCESS PROBABILITY                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BASE FORMULA: 39% - (Level × 3%)                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Level │ Base  │ +Small(3) │ +Small(2) │ +Demoralized│    │
│  ├───────┼───────┼───────────┼───────────┼─────────────┤    │
│  │   1   │  36%  │    41%    │    46%    │    +20%     │    │
│  │   2   │  33%  │    38%    │    43%    │    +20%     │    │
│  │   3   │  30%  │    35%    │    40%    │    +20%     │    │
│  │   4   │  27%  │    32%    │    37%    │    +20%     │    │
│  │   5   │  24%  │    29%    │    34%    │    +20%     │    │
│  │   6   │  21%  │    26%    │    31%    │    +20%     │    │
│  │   7   │  18%  │    23%    │    28%    │    +20%     │    │
│  │   8   │  15%  │    20%    │    25%    │    +20%     │    │
│  │   9   │  12%  │    17%    │    22%    │    +20%     │    │
│  │  10   │   0%  │     0%    │     0%    │     0%      │    │
│  └───────┴───────┴───────────┴───────────┴─────────────┘    │
│                                                              │
│  Notes:                                                      │
│  • Small party (3 members): +5% bonus                       │
│  • Small party (2 members): +10% bonus                      │
│  • Small party (1 member): +15% bonus                       │
│  • Level 10: Running BLOCKED regardless of bonuses          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 14. Monster Call for Help

### 14.1 Gate-In Mechanic

```typescript
/**
 * Monster call for help (gating) constants
 */
export const GATE_CONSTANTS = {
  TRIGGER_THRESHOLD: 5,       // Group must have fewer than 5 monsters
  SUCCESS_CHANCE: 75,         // 75% base chance to attempt
  LEVEL_PREVENTION_FACTOR: 10 // Higher level = harder to prevent
} as const;

/**
 * Check if monster group attempts to call for help
 * Triggers when group count drops below 5
 */
export function checkCallForHelp(
  group: MonsterGroup,
  rng: RandomGenerator
): CallForHelpResult {
  // Must have CAN_GATE ability
  if (!group.definition.abilities.includes(MonsterAbility.CAN_GATE)) {
    return { attempted: false, reason: 'no_ability' };
  }
  
  // Must have fewer than 5 monsters remaining
  if (group.count >= GATE_CONSTANTS.TRIGGER_THRESHOLD) {
    return { attempted: false, reason: 'group_too_large' };
  }
  
  // 75% chance to attempt
  if (rng.nextInt(0, 99) >= GATE_CONSTANTS.SUCCESS_CHANCE) {
    return { attempted: false, reason: 'chose_not_to' };
  }
  
  // Attempt the gate-in
  // Higher level monsters succeed more often
  // Formula: (RANDOM 0-199) > (10 × Monster Level)
  const roll = rng.nextInt(0, 199);
  const threshold = GATE_CONSTANTS.LEVEL_PREVENTION_FACTOR * 
                   group.definition.level;
  
  if (roll <= threshold) {
    // Prevented by level check
    return { 
      attempted: true, 
      success: false, 
      reason: 'failed_check',
      roll,
      threshold
    };
  }
  
  // Success! Determine reinforcement count
  const reinforcements = rng.nextInt(1, 4);  // 1-4 additional monsters
  
  return {
    attempted: true,
    success: true,
    reinforcements,
    roll,
    threshold
  };
}

/**
 * Apply reinforcements to monster group
 */
export function applyReinforcements(
  group: MonsterGroup,
  count: number,
  rng: RandomGenerator
): void {
  for (let i = 0; i < count; i++) {
    // Roll HP for new monster
    let hp = 0;
    for (let d = 0; d < group.definition.hitDice; d++) {
      hp += rng.nextInt(1, group.definition.hitDiceSides);
    }
    hp = Math.max(1, hp);
    
    // Add to group
    group.currentHp.push(hp);
    group.status.push({
      asleep: false,
      paralyzed: false,
      silenced: false,
      afraid: false
    });
    group.count++;
  }
}

export interface CallForHelpResult {
  attempted: boolean;
  success?: boolean;
  reinforcements?: number;
  reason: string;
  roll?: number;
  threshold?: number;
}
```

### 14.2 Gate-In Probability by Level

```
┌─────────────────────────────────────────────────────────────┐
│                CALL FOR HELP SUCCESS RATE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Prerequisites:                                              │
│  • Monster has CAN_GATE ability                             │
│  • Group count < 5                                          │
│  • 75% chance monster decides to call                       │
│                                                              │
│  Success formula: RANDOM(0-199) > (10 × MonsterLevel)       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Monster Level │ Threshold │ Success Probability     │    │
│  ├───────────────┼───────────┼─────────────────────────┤    │
│  │      1        │    10     │      ~95%               │    │
│  │      2        │    20     │      ~90%               │    │
│  │      3        │    30     │      ~85%               │    │
│  │      5        │    50     │      ~75%               │    │
│  │      7        │    70     │      ~65%               │    │
│  │     10        │   100     │      ~50%               │    │
│  │     15        │   150     │      ~25%               │    │
│  │     19        │   190     │      ~5%                │    │
│  │     20+       │   200+    │      ~0%                │    │
│  └───────────────┴───────────┴─────────────────────────┘    │
│                                                              │
│  Higher level monsters are BETTER at calling for help!      │
│  This makes high-level encounters more dangerous.           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 15. Breath Weapons

### 15.1 Breath Attack System

```typescript
/**
 * Breath weapon constants
 */
export const BREATH_CONSTANTS = {
  USE_CHANCE: 60,  // 60% chance monster uses breath attack
} as const;

/**
 * Check if monster uses breath attack this round
 */
export function willUseBreathAttack(
  monster: MonsterDefinition,
  rng: RandomGenerator
): boolean {
  // Must have breath ability
  if (!monster.abilities.includes(MonsterAbility.CAN_BREATHE)) {
    return false;
  }
  
  // 60% chance to use breath
  return rng.nextInt(0, 99) < BREATH_CONSTANTS.USE_CHANCE;
}

/**
 * Calculate breath weapon damage
 */
export function calculateBreathDamage(
  monster: MonsterDefinition,
  target: Character,
  rng: RandomGenerator
): BreathDamageResult {
  // Roll damage (up to max)
  const baseDamage = rng.nextInt(1, monster.breathDamageMax);
  let finalDamage = baseDamage;
  
  // Check target resistance
  const resistanceType = getResistanceForBreath(monster.breathType!);
  const resistance = target.equipment.getResistance(resistanceType);
  
  // Resistance halves damage
  if (resistance > 0) {
    finalDamage = Math.floor(finalDamage / 2);
  }
  
  // Protective equipment halves again (stacks to 1/4)
  const hasProtection = checkBreathProtection(target, monster.breathType!);
  if (hasProtection) {
    finalDamage = Math.floor(finalDamage / 2);
  }
  
  return {
    baseDamage,
    finalDamage,
    resistanceApplied: resistance > 0,
    protectionApplied: hasProtection,
    breathType: monster.breathType!
  };
}

/**
 * Execute breath attack against party
 */
export function executeBreathAttack(
  attacker: MonsterGroup,
  party: Character[],
  rng: RandomGenerator
): BreathAttackResult {
  const results: BreathDamageResult[] = [];
  
  // Breath attacks hit ALL party members
  for (const target of party) {
    if (!target.status.alive) continue;
    
    const damage = calculateBreathDamage(
      attacker.definition, 
      target, 
      rng
    );
    
    // Apply damage
    target.currentHp -= damage.finalDamage;
    if (target.currentHp <= 0) {
      target.currentHp = 0;
      target.status.alive = false;
    }
    
    results.push({
      ...damage,
      targetId: target.id,
      targetName: target.name
    });
  }
  
  return {
    attacker: attacker.definition.name,
    breathType: attacker.definition.breathType!,
    targets: results
  };
}

/**
 * Get resistance type for breath weapon
 */
function getResistanceForBreath(breathType: BreathType): string {
  switch (breathType) {
    case BreathType.FIRE: return 'fire';
    case BreathType.COLD: return 'cold';
    case BreathType.POISON: return 'poison';
    default: return 'magic';
  }
}

export interface BreathDamageResult {
  baseDamage: number;
  finalDamage: number;
  resistanceApplied: boolean;
  protectionApplied: boolean;
  breathType: BreathType;
  targetId?: string;
  targetName?: string;
}

export interface BreathAttackResult {
  attacker: string;
  breathType: BreathType;
  targets: BreathDamageResult[];
}
```

### 15.2 Breath Damage Reduction

```
┌─────────────────────────────────────────────────────────────┐
│                  BREATH DAMAGE REDUCTION                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Base Damage: RANDOM(1 to MaxBreathDamage)                  │
│                                                              │
│  Reduction stacking:                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Resistance  │ Equipment │ Final Damage              │    │
│  ├─────────────┼───────────┼───────────────────────────┤    │
│  │    No       │    No     │  100% (full damage)       │    │
│  │    Yes      │    No     │   50% (halved)            │    │
│  │    No       │    Yes    │   50% (halved)            │    │
│  │    Yes      │    Yes    │   25% (quartered)         │    │
│  └─────────────┴───────────┴───────────────────────────┘    │
│                                                              │
│  Breath types and resistances:                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Type   │ Resistance Source                          │    │
│  ├────────┼────────────────────────────────────────────┤    │
│  │ FIRE   │ Fire resistance (spell, item, racial)      │    │
│  │ COLD   │ Cold resistance (spell, item, racial)      │    │
│  │ POISON │ Poison resistance (item, high VIT)         │    │
│  │ DRAIN  │ Level drain resistance (rare items)        │    │
│  │ STONE  │ Petrification resistance (rare)            │    │
│  └────────┴────────────────────────────────────────────┘    │
│                                                              │
│  Example:                                                    │
│  Fire Dragon breathes fire for 50 damage                    │
│  → Target has fire resistance: 50 / 2 = 25                  │
│  → Target has protective cloak: 25 / 2 = 12                 │
│  → Final damage: 12                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 16. Spell Casting in Combat

### 16.1 Spell System Structure

```typescript
/**
 * Spell definition
 */
export interface SpellDefinition {
  id: string;
  name: string;
  level: number;           // Spell level (1-7)
  type: 'mage' | 'priest';
  targetType: SpellTargetType;
  effect: SpellEffect;
  baseCost: number;        // MP cost
  combatOnly: boolean;     // Can only use in combat?
  fieldOnly: boolean;      // Can only use outside combat?
}

export enum SpellTargetType {
  SELF = 'self',
  SINGLE_ALLY = 'single_ally',
  ALL_ALLIES = 'all_allies',
  SINGLE_ENEMY = 'single_enemy',
  ENEMY_GROUP = 'enemy_group',
  ALL_ENEMIES = 'all_enemies'
}

export interface SpellEffect {
  type: SpellEffectType;
  damage?: DiceRoll;
  healing?: DiceRoll;
  statusEffect?: StatusEffectType;
  duration?: number;
  saveType?: 'magic' | 'breath' | 'none';
}

export enum SpellEffectType {
  DAMAGE = 'damage',
  HEALING = 'healing',
  BUFF = 'buff',
  DEBUFF = 'debuff',
  STATUS = 'status',
  UTILITY = 'utility'
}

/**
 * Check if character can cast spells this round
 */
export function canCastSpell(
  character: Character,
  combatState: CombatState
): SpellCastEligibility {
  // Check character status
  if (!character.status.alive) {
    return { canCast: false, reason: 'dead' };
  }
  if (character.status.silenced) {
    return { canCast: false, reason: 'silenced' };
  }
  if (character.status.paralyzed) {
    return { canCast: false, reason: 'paralyzed' };
  }
  if (character.status.asleep) {
    return { canCast: false, reason: 'asleep' };
  }
  
  // Check class
  const canCastClass = ['mage', 'priest', 'bishop', 'samurai', 'lord', 'ninja'];
  if (!canCastClass.includes(character.class)) {
    return { canCast: false, reason: 'class_cannot_cast' };
  }
  
  // Check surprise blocking (version-dependent)
  if (combatState.spellsBlockedThisRound) {
    return { canCast: false, reason: 'surprised' };
  }
  
  // Check anti-magic zone
  if (combatState.antiMagicActive) {
    return { canCast: false, reason: 'anti_magic_zone' };
  }
  
  // Check available spell slots
  if (!hasAvailableSpellSlots(character)) {
    return { canCast: false, reason: 'no_spell_slots' };
  }
  
  return { canCast: true };
}

/**
 * Execute spell cast
 */
export function castSpell(
  caster: Character,
  spell: SpellDefinition,
  target: SpellTarget,
  combatState: CombatState,
  rng: RandomGenerator
): SpellCastResult {
  // Deduct spell slot
  caster.spells[spell.type][spell.level - 1].current--;
  
  // Apply effect based on target type
  switch (spell.targetType) {
    case SpellTargetType.SINGLE_ENEMY:
      return castOnSingleEnemy(spell, target as number, combatState, rng);
    
    case SpellTargetType.ENEMY_GROUP:
      return castOnEnemyGroup(spell, target as number, combatState, rng);
    
    case SpellTargetType.ALL_ENEMIES:
      return castOnAllEnemies(spell, combatState, rng);
    
    case SpellTargetType.SINGLE_ALLY:
      return castOnSingleAlly(spell, target as string, combatState, rng);
    
    case SpellTargetType.ALL_ALLIES:
      return castOnAllAllies(spell, combatState, rng);
    
    case SpellTargetType.SELF:
      return castOnSelf(spell, caster, combatState, rng);
  }
}

/**
 * Apply damage spell to enemy group
 */
function castOnEnemyGroup(
  spell: SpellDefinition,
  groupIndex: number,
  combatState: CombatState,
  rng: RandomGenerator
): SpellCastResult {
  const group = combatState.monsterGroups[groupIndex];
  const results: SpellHitResult[] = [];
  
  // Roll damage once, apply to all in group
  const damage = rollDice(spell.effect.damage!, rng);
  
  for (let i = 0; i < group.count; i++) {
    // Save check
    let finalDamage = damage;
    if (spell.effect.saveType !== 'none') {
      if (rollSavingThrow(group.definition, spell.effect.saveType!, rng)) {
        finalDamage = Math.floor(damage / 2);  // Save for half
      }
    }
    
    // Apply damage
    group.currentHp[i] -= finalDamage;
    const killed = group.currentHp[i] <= 0;
    
    if (killed) {
      group.currentHp[i] = 0;
      group.count--;
    }
    
    results.push({
      targetIndex: i,
      damage: finalDamage,
      saved: finalDamage < damage,
      killed
    });
  }
  
  return {
    success: true,
    spell: spell.name,
    targetGroup: groupIndex,
    results,
    message: `${spell.name} strikes ${group.definition.namePlural}!`
  };
}

export interface SpellCastEligibility {
  canCast: boolean;
  reason?: string;
}

export interface SpellCastResult {
  success: boolean;
  spell: string;
  targetGroup?: number;
  targetCharacter?: string;
  results: SpellHitResult[];
  message: string;
}

export interface SpellHitResult {
  targetIndex: number;
  damage?: number;
  healing?: number;
  saved: boolean;
  killed: boolean;
  statusApplied?: string;
}
```

### 16.2 Common Combat Spells

```typescript
/**
 * Combat spell database (subset)
 */
export const COMBAT_SPELLS: SpellDefinition[] = [
  // Mage Level 1
  {
    id: 'halito',
    name: 'HALITO',
    level: 1,
    type: 'mage',
    targetType: SpellTargetType.SINGLE_ENEMY,
    effect: {
      type: SpellEffectType.DAMAGE,
      damage: { count: 1, sides: 8 },
      saveType: 'magic'
    },
    baseCost: 1,
    combatOnly: true,
    fieldOnly: false
  },
  {
    id: 'katino',
    name: 'KATINO',
    level: 1,
    type: 'mage',
    targetType: SpellTargetType.ENEMY_GROUP,
    effect: {
      type: SpellEffectType.STATUS,
      statusEffect: 'asleep',
      saveType: 'magic'
    },
    baseCost: 1,
    combatOnly: true,
    fieldOnly: false
  },
  // Mage Level 3
  {
    id: 'mahalito',
    name: 'MAHALITO',
    level: 3,
    type: 'mage',
    targetType: SpellTargetType.ENEMY_GROUP,
    effect: {
      type: SpellEffectType.DAMAGE,
      damage: { count: 4, sides: 6 },
      saveType: 'magic'
    },
    baseCost: 1,
    combatOnly: true,
    fieldOnly: false
  },
  // Mage Level 5
  {
    id: 'tiltowait',
    name: 'TILTOWAIT',
    level: 7,
    type: 'mage',
    targetType: SpellTargetType.ALL_ENEMIES,
    effect: {
      type: SpellEffectType.DAMAGE,
      damage: { count: 10, sides: 15 },
      saveType: 'magic'
    },
    baseCost: 1,
    combatOnly: true,
    fieldOnly: false
  },
  // Priest Level 1
  {
    id: 'badios',
    name: 'BADIOS',
    level: 1,
    type: 'priest',
    targetType: SpellTargetType.SINGLE_ENEMY,
    effect: {
      type: SpellEffectType.DAMAGE,
      damage: { count: 1, sides: 8 },
      saveType: 'magic'
    },
    baseCost: 1,
    combatOnly: true,
    fieldOnly: false
  },
  {
    id: 'dios',
    name: 'DIOS',
    level: 1,
    type: 'priest',
    targetType: SpellTargetType.SINGLE_ALLY,
    effect: {
      type: SpellEffectType.HEALING,
      healing: { count: 1, sides: 8 }
    },
    baseCost: 1,
    combatOnly: false,
    fieldOnly: false
  }
];
```

---

## 17. Complete State Machine

### 17.1 Master Game State

```typescript
/**
 * Complete game state for encounter/combat system
 */
export interface EncounterSystemState {
  // Dungeon state
  dungeon: {
    currentLevel: number;
    position: Position;
    inDungeon: boolean;
  };
  
  // Fight tracking
  fightMap: FightMap;
  
  // Party state
  party: Character[];
  
  // Combat state (null if not in combat)
  combat: CombatState | null;
  
  // Pending actions
  pendingChestAlarm: boolean;
  
  // Configuration
  config: {
    appleIIBehavior: boolean;  // Allow surprise spellcasting
    randomSeed?: number;
  };
}

/**
 * Master state machine for encounter system
 */
export class EncounterStateMachine {
  private state: EncounterSystemState;
  private rng: RandomGenerator;
  
  constructor(config: EncounterSystemConfig) {
    this.rng = new RandomGenerator(config.randomSeed);
    this.state = this.createInitialState(config);
  }
  
  /**
   * Handle player movement
   */
  handleMove(direction: Direction): MoveResult {
    const result = processMovement(
      { position: this.state.dungeon.position },
      direction,
      this.getDungeonMap(),
      this.state.fightMap,
      this.rng
    );
    
    if (result.moved) {
      this.state.dungeon.position = result.newPosition!;
      
      if (result.encounter) {
        return {
          ...result,
          combatStarted: this.startCombat(result.reason as EncounterReason)
        };
      }
    }
    
    return result;
  }
  
  /**
   * Handle door kick action
   */
  handleKick(direction: Direction): KickResult {
    const result = processDoorKick(
      { position: this.state.dungeon.position },
      direction,
      this.getDungeonMap(),
      this.state.fightMap,
      this.rng
    );
    
    if (result.moved && result.encounter) {
      return {
        ...result,
        combatStarted: this.startCombat(result.encounterReason!)
      };
    }
    
    return result;
  }
  
  /**
   * Start combat encounter
   */
  private startCombat(reason: EncounterReason): boolean {
    const controller = new CombatController(this.rng);
    
    controller.startCombat(
      this.state.party,
      this.state.dungeon.position,
      reason
    );
    
    this.state.combat = controller.getState();
    return true;
  }
  
  /**
   * Handle combat action selection
   */
  handleCombatAction(
    characterId: string, 
    action: CharacterCombatAction
  ): void {
    if (!this.state.combat) return;
    
    // Validate action
    const character = this.state.party.find(c => c.id === characterId);
    if (!character) return;
    
    // Apply action
    this.state.combat.characterActions.set(characterId, action);
    
    // Check if all actions selected
    this.checkCombatAdvance();
  }
  
  /**
   * Execute next combat action
   */
  executeCombatAction(): CombatActionResult | null {
    if (!this.state.combat) return null;
    if (this.state.combat.currentPhase !== CombatPhase.EXECUTION) return null;
    
    return this.executeNextAction();
  }
  
  /**
   * Handle leaving dungeon
   */
  handleLeaveDungeon(): void {
    // Reset all FIGHTMAP state
    this.state.fightMap.resetAll();
    this.state.dungeon.inDungeon = false;
    this.state.combat = null;
  }
  
  /**
   * Handle entering dungeon level
   */
  handleEnterLevel(level: number): void {
    // Initialize FIGHTMAP for this level
    this.state.fightMap.initializeLevel(level, this.getDungeonMap(level));
    
    // Seed treasure rooms
    const levelState = this.state.fightMap.getLevelState(level);
    if (levelState) {
      seedTreasureRooms(
        level,
        this.getDungeonMap(level),
        levelState,
        this.rng
      );
    }
    
    this.state.dungeon.currentLevel = level;
  }
  
  // ... additional implementation methods
}
```

### 17.2 Complete System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WIZARDRY ENCOUNTER SYSTEM OVERVIEW                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        DUNGEON ENTRY                            │    │
│  │  1. Initialize FightMap for all levels                          │    │
│  │  2. Seed 9 treasure rooms per level                             │    │
│  │  3. Set inDungeon = true                                        │    │
│  └───────────────────────────────┬─────────────────────────────────┘    │
│                                  │                                       │
│                                  ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      EXPLORATION LOOP                           │    │
│  └───────────────────────────────┬─────────────────────────────────┘    │
│                                  │                                       │
│          ┌───────────────────────┼───────────────────────┐              │
│          ▼                       ▼                       ▼              │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐       │
│  │    MOVE       │      │    KICK       │      │    OTHER      │       │
│  │  (N/S/E/W)    │      │  (at door)    │      │  (search,etc) │       │
│  └───────┬───────┘      └───────┬───────┘      └───────────────┘       │
│          │                      │                                       │
│          ▼                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                   ENCOUNTER CHECK CHAIN                        │     │
│  │  ┌─────────────────────────────────────────────────────────┐  │     │
│  │  │ 1. Chest Alarm?          → 100% encounter               │  │     │
│  │  │ 2. Alarm Tile?           → 100% encounter               │  │     │
│  │  │ 3. Fixed Encounter?      → 100% if FIGHTS=true          │  │     │
│  │  │ 4. Treasure Room?        → 100% if not cleared          │  │     │
│  │  │ 5. Door Kick + Room?     → 12.5% (1 in 8)               │  │     │
│  │  │ 6. Random Movement       → 1% (1 in 99)                 │  │     │
│  │  └─────────────────────────────────────────────────────────┘  │     │
│  └───────────────────────────────┬───────────────────────────────┘     │
│                                  │                                       │
│          ┌───────────────────────┴───────────────────────┐              │
│          ▼                                               ▼              │
│  ┌───────────────┐                              ┌───────────────┐       │
│  │ NO ENCOUNTER  │                              │   ENCOUNTER!  │       │
│  │ Continue      │                              │   Start       │       │
│  │ exploration   │                              │   Combat      │       │
│  └───────┬───────┘                              └───────┬───────┘       │
│          │                                              │               │
│          │                                              ▼               │
│          │                      ┌───────────────────────────────────┐  │
│          │                      │         COMBAT SYSTEM             │  │
│          │                      │  ┌─────────────────────────────┐  │  │
│          │                      │  │ Surprise (20%/16%/64%)      │  │  │
│          │                      │  │ Monster Generation          │  │  │
│          │                      │  │ Identification              │  │  │
│          │                      │  │ Action Selection            │  │  │
│          │                      │  │ Initiative Roll             │  │  │
│          │                      │  │ Execution (in order)        │  │  │
│          │                      │  │   - Character actions       │  │  │
│          │                      │  │   - Monster actions         │  │  │
│          │                      │  │   - Call for help           │  │  │
│          │                      │  │   - Breath weapons          │  │  │
│          │                      │  │   - Spell casting           │  │  │
│          │                      │  │ End Round                   │  │  │
│          │                      │  │   - Regeneration            │  │  │
│          │                      │  │   - Status clear            │  │  │
│          │                      │  │   - Victory/Defeat check    │  │  │
│          │                      │  └─────────────────────────────┘  │  │
│          │                      └───────────────────┬───────────────┘  │
│          │                                          │                   │
│          │          ┌───────────────────────────────┼─────────────────┐│
│          │          ▼                               ▼                 ▼││
│          │  ┌───────────────┐              ┌───────────────┐  ┌───────┐││
│          │  │   VICTORY     │              │   DEFEAT      │  │  RUN  │││
│          │  │ • Award XP    │              │ • Party dead  │  │• No XP│││
│          │  │ • Treasure    │              │ • Recovery?   │  │• Flee │││
│          │  │ • Alignment   │              │               │  │       │││
│          │  └───────┬───────┘              └───────────────┘  └───┬───┘││
│          │          │                                             │    ││
│          │          └──────────────────┬──────────────────────────┘    ││
│          │                             │                               ││
│          └─────────────────────────────┴───────────────────────────────┘│
│                                        │                                │
│                                        ▼                                │
│                      ┌─────────────────────────────────────────┐       │
│                      │           BACK TO EXPLORATION           │       │
│                      │         (or dungeon exit)               │       │
│                      └─────────────────────────────────────────┘       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        DUNGEON EXIT                             │   │
│  │  1. Reset all FightMap state                                    │   │
│  │  2. Treasure rooms cleared                                      │   │
│  │  3. Alarm tiles cleared                                         │   │
│  │  4. "Monsters revive"                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Quick Reference Tables

### A.1 Encounter Probabilities

| Trigger | Probability | Condition |
|---------|-------------|-----------|
| Random movement | 1.01% (1/99) | Any step |
| Door kick | 12.5% (1/8) | Room tile through door |
| Treasure room | 100% | Unclaimed treasure room |
| Alarm tile | 100% | After clanging bells |
| Fixed encounter | 100% | SQRETYPE=ENCOUNTER, AUX0>0 |
| Chest alarm | 100% | Failed disarm |

### A.2 Surprise Probabilities

| State | Probability | Effect |
|-------|-------------|--------|
| Party surprises | 20% | Free action round, monsters skip |
| Monsters surprise | 16% | Monsters free round, party skip |
| Normal | 64% | Initiative determines order |

### A.3 Monster Group Weights

| Row | Selection Weight | Typical Contents |
|-----|------------------|------------------|
| A | 75% | Common monsters |
| B | 18.75% | Uncommon monsters |
| C | 6.25% | Rare monsters |

### A.4 Run Success by Level

| Level | Base % | +3 Members | +2 Members | +Demoralized |
|-------|--------|------------|------------|--------------|
| 1 | 36% | +5% | +10% | +20% |
| 5 | 24% | +5% | +10% | +20% |
| 9 | 12% | +5% | +10% | +20% |
| 10 | 0% | 0% | 0% | 0% |

---

## Appendix B: Implementation Checklist

### B.1 Core Systems

- [ ] FightMap class with per-level tracking
- [ ] Treasure room seeding algorithm
- [ ] Movement encounter check (1%)
- [ ] Door kick encounter check (12.5%)
- [ ] Fixed encounter handling (AUX values)
- [ ] Alarm spreading (clanging bells)

### B.2 Combat Systems

- [ ] Surprise determination
- [ ] Monster generation from tables
- [ ] Initiative calculation
- [ ] Turn order management
- [ ] Character action execution
- [ ] Monster AI action selection
- [ ] Call for help (gating)
- [ ] Breath weapon attacks
- [ ] Spell casting system
- [ ] Run away calculation
- [ ] Combat end conditions

### B.3 State Management

- [ ] Combat state machine
- [ ] Level state persistence
- [ ] Dungeon exit reset
- [ ] Alignment shift tracking

---

*Document Version: 1.0*
*Based on: Thomas William Ewers' re-engineered Pascal source (2014)*
*For: Wizardry 1 Remake Project*
