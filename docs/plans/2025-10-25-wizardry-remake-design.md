# Wizardry: Proving Grounds Remake - Game Design Document

**Version**: 1.0
**Date**: 2025-10-25
**Status**: Design Phase Complete

---

## 1. Project Overview

### 1.1 Vision

Create a faithful remake of the original Wizardry 1: Proving Grounds of the Mad Overlord with modernized UI/UX while preserving authentic game mechanics and systems.

**Fidelity Approach**: Modernized Faithful
- ✅ Keep all core mechanics (party, classes, alignment, spells, dungeon, combat)
- ✅ Preserve challenge and difficulty
- ✅ Modernize UI/UX (better readability, automap, quality-of-life)
- ✅ Enhance graphics (hand-drawn assets, placeholder first)
- ❌ No mechanical changes to balance or systems

### 1.2 Technology Stack

- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **Rendering**: HTML5 Canvas (first-person 3D-style view)
- **Storage**: IndexedDB (game saves + event replay data)
- **Platform**: Modern web browsers only (ES2020+)
- **Testing**: Jest (unit + integration)
- **Data Files**: JSON (spells, monsters, items, maps)

### 1.3 Success Criteria

- Complete playable game matching original Wizardry 1
- All 10 dungeon levels with authentic maps
- Full spell system (7 mage + 7 priest spell levels)
- All 8 character classes functional
- Combat system faithful to original
- Self-hostable online (play in browser)

---

## 2. Core Architecture

### 2.1 Architecture Approach: Party-First

**Design Decision**: Build party management as the core abstraction from day one, then integrate proven roguelike patterns around it.

**Why**: Wizardry's party-based mechanics are fundamentally different from single-character roguelikes. Starting with party architecture ensures systems are designed correctly rather than retrofitted.

### 2.2 Architecture Layers

```
┌─────────────────────────────────────────┐
│ UI Layer (First-Person + Menus)        │
│ - Canvas 3D-style dungeon view         │
│ - Party stats panel                     │
│ - Combat interface                      │
│ - Character sheets, spell selection    │
│ - Blueprint-style automap              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Command Layer                           │
│ - MovePartyCommand                      │
│ - TurnCommand (left/right)              │
│ - StrafeCommand (left/right)            │
│ - CastSpellCommand                      │
│ - AttackCommand (combat)                │
│ - RestCommand, SearchCommand, etc.      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Service Layer                           │
│ - PartyService (formation, positioning) │
│ - CombatService (round-based timeline)  │
│ - SpellService (spell points, casting)  │
│ - DungeonService (map loading)          │
│ - CharacterService (classes, leveling)  │
│ - MapService (automap, exploration)     │
│ - BodyRecoveryService (death handling)  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Data Layer                              │
│ - GameState (party, dungeon, turn)      │
│ - Character Roster (all created chars)  │
│ - Data files: spells.json, monsters.json│
│ - Event log (replay system)             │
│ - IndexedDB (saves + replay data)       │
└─────────────────────────────────────────┘
```

### 2.3 Reused from Roguelike Architecture

**Core Patterns (60% reuse):**
- ✅ Event sourcing + replay system
- ✅ Command pattern (discrete actions)
- ✅ Service layer separation (pure functions)
- ✅ Immutable state updates
- ✅ Testing strategy (colocated, scenario-based)
- ✅ Canvas rendering (adapted for first-person)
- ✅ Turn counter and game loop
- ✅ IndexedDB persistence
- ✅ TypeScript + Vite stack

**Not Reused:**
- ❌ Procedural dungeon generation (Wizardry uses fixed maps)
- ❌ FOV/shadowcasting (replaced with first-person view)
- ❌ Light/hunger systems (not in Wizardry 1)
- ❌ Single entity focus (Wizardry is party-based)

---

## 3. Game State & Modal System

### 3.1 Modal Game States

Wizardry operates in distinct modes with different UIs and mechanics:

```typescript
interface GameState {
  // Game mode (modal states)
  mode: 'TOWN' | 'NAVIGATION' | 'COMBAT' | 'CHARACTER_CREATION' | 'CAMP';

  // Character management
  characterRoster: Map<string, Character>;  // ALL created characters
  activeParty: Party | null;  // Currently in dungeon (1-6 characters)

  // Navigation state (when mode === 'NAVIGATION')
  currentLevel: number;  // 1-10 (fixed maps)
  currentPosition: Position;  // Party position in maze
  currentFacing: Direction;  // N, S, E, W (first-person orientation)

  // Dungeon state (10 fixed 20×20 maps)
  dungeon: Dungeon;  // All 10 levels loaded from data files

  // Bodies in dungeon (deceased characters)
  bodiesInDungeon: Map<number, DeadBody[]>;  // level → bodies

  // Combat state (when mode === 'COMBAT')
  combatState: CombatState | null;

  // Town state (when mode === 'TOWN')
  townLocation?: TownLocation;

  // Game progression
  turnCount: number;
  hasAmulet: boolean;

  // Event sourcing
  gameId: string;
  seed: string;

  // Persistence
  isGameOver: boolean;
  isVictory: boolean;
}
```

### 3.2 Mode Transitions

```
TOWN ←→ NAVIGATION ←→ COMBAT
  ↓
CHARACTER_CREATION
  ↓
CAMP (rest, spells)
```

---

## 4. Party & Character System

### 4.1 Unified Combatant Abstraction

**Design Decision**: Use unified `Combatant` interface for both characters and monsters, with composition instead of inheritance.

**Why**:
- Wizardry has spellcasting monsters
- Single combat resolution system (no code duplication)
- Future-proofs for sophisticated monsters (dragons, bosses)
- Matches roguelike's proven Entity pattern

```typescript
interface Combatant {
  id: string;
  name: string;

  // Combat stats (common to all)
  hp: number;
  maxHp: number;
  ac: number;  // Armor class (lower = better, D&D 1st edition)

  // Core stats
  stats: CharacterStats;

  // Combat state
  isAlive: boolean;
  status: StatusEffect[];

  // Spell casting (optional)
  spellPoints?: SpellPointsByLevel;
  knownSpells?: Spell[];
  canCastSpells: boolean;

  // Position in formation
  position: 'FRONT_ROW' | 'BACK_ROW';
}
```

### 4.2 Character Structure

```typescript
interface Character extends Combatant {
  // Class & progression
  class: CharacterClass;  // Fighter, Mage, Priest, Thief, Bishop, Samurai, Lord, Ninja
  race: Race;  // Human, Elf, Dwarf, Gnome, Hobbit
  alignment: Alignment;  // Good, Neutral, Evil
  level: number;
  xp: number;

  // Aging system
  age: number;  // Starts at 14-16
  vim: number;  // Vitality/youth, decreases with resting

  // Equipment
  equipped: Equipment;
  inventory: Item[];

  // Spell learning (characters can learn new spells)
  canLearnSpells: true;
}

interface CharacterStats {
  strength: number;     // STR - Melee damage
  intelligence: number; // INT/I.Q. - Mage spells
  piety: number;        // PIE - Priest spells
  vitality: number;     // VIT - HP, resurrection success
  agility: number;      // AGI - Initiative, AC, trap avoidance
  luck: number;         // LUC - General fortune, various checks
}
```

### 4.3 Party Structure

```typescript
interface Party {
  characters: Character[];  // 1-6 characters (includes dead ones!)
  formation: Formation;
  gold: number;  // Shared party gold
}

interface Formation {
  frontRow: (Character | null)[];  // Max 3 positions
  backRow: (Character | null)[];   // Max 3 positions
}
```

**Formation Mechanics**:
- Front row takes melee attacks
- Back row protected but cannot melee attack
- Ranged weapons and spells work from back row

### 4.4 Character Roster & Body Recovery

**Key Mechanic**: Players can create multiple characters in town roster, then select 6 for active party.

**Death & Recovery**:
1. Character dies in dungeon → body left at death location
2. Party wiped → return to town
3. Create new party from roster
4. Navigate to bodies
5. Pick up corpses (add to party)
6. Return to town
7. Pay temple for resurrection

```typescript
interface DeadBody {
  characterId: string;
  character: Character;  // Snapshot at death
  position: Position;    // Where they died
  level: number;         // Which dungeon level
  deathState: DeathState;
  turnOfDeath: number;
}

enum DeathState {
  DEAD,          // Fresh corpse, can resurrect with DI spell or temple
  ASHES,         // DI failed, need KADORTO or temple (expensive)
  LOST_FOREVER,  // KADORTO failed, character is gone
}
```

---

## 5. Character Classes & Stats

### 5.1 The Eight Classes

**Basic Classes:**
- **Fighter**: STR ≥ 11, any alignment
- **Mage**: INT ≥ 11, any alignment
- **Priest**: PIE ≥ 11, not neutral (Good or Evil only)
- **Thief**: AGI ≥ 11, not good (Neutral or Evil only)

**Advanced Classes:**
- **Bishop**: INT ≥ 12, PIE ≥ 12 (casts both mage + priest spells, can identify items)
- **Samurai**: STR ≥ 15, VIT ≥ 14, INT ≥ 11, PIE ≥ 10, AGI ≥ 10, not evil
- **Lord**: STR ≥ 15, VIT ≥ 15, INT ≥ 12, PIE ≥ 12, AGI ≥ 14, LUC ≥ 15, must be good
- **Ninja**: STR ≥ 17, VIT ≥ 17, INT ≥ 17, PIE ≥ 17, AGI ≥ 17, LUC ≥ 17, must be evil

### 5.2 Character Creation Flow

**Step 1: Name Entry**
Player enters character name.

**Step 2: Race Selection**
Choose from: Human, Elf, Dwarf, Gnome, Hobbit

Each race has **fixed base stats**:
- Human: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9
- Elf: STR 7, INT 10, PIE 10, VIT 6, AGI 9, LUC 6
- Dwarf: STR 10, INT 7, PIE 10, VIT 10, AGI 5, LUC 6
- Gnome: STR 7, INT 7, PIE 10, VIT 8, AGI 10, LUC 7
- Hobbit: STR 5, INT 7, PIE 7, VIT 6, AGI 10, LUC 15

**Step 3: Bonus Point Roll**
Roll for bonus point pool: 7-29 points

**Formula** (Apple II original):
1. Initial roll: 7-10 points
2. 10% chance to add 10 more
3. If still < 20, another 10% chance to add 10

**Result distribution**:
- 90% of rolls: 7-10 points
- 9.25% of rolls: 17-20 points
- 0.75% of rolls: 27-29 points (very rare!)

**Step 4: Stat Allocation**
Player distributes bonus points among the 6 stats.

**Step 5: Alignment Selection**
Choose: Good, Neutral, or Evil

**Step 6: Class Selection**
System shows eligible classes based on final stats + alignment.

**Step 7: Confirmation**
Character added to roster (not party yet).

### 5.3 Leveling & Stat Changes

**Level Up Mechanics**:
- Each stat has **75% chance** to be modified
- If modified, chance of increase = **(130 - age)%**
- Young characters (age 14-16): ~86-87% chance to gain, 13-14% to lose
- Old characters (age 50+): high chance to lose stats, can die of old age

**Aging**:
- Resting at inn ages character slightly (~0.1 years per rest)
- Decreases vim (vitality/youth)
- Characters age 50+ risk death from old age

**Class Changing**:
- After leveling, check if new stats qualify for different classes
- Can change class (resets to level 1, keeps stats)
- Allows progression: Fighter → Samurai → Lord

---

## 6. Spell System

### 6.1 Spell Points (Not Spell Slots)

**Key Mechanic**: Characters have spell points per spell level (1-7), not memorized spell slots.

```typescript
interface SpellPointsByLevel {
  level1: { current: number; max: number };
  level2: { current: number; max: number };
  level3: { current: number; max: number };
  level4: { current: number; max: number };
  level5: { current: number; max: number };
  level6: { current: number; max: number };
  level7: { current: number; max: number };
}
```

**Spell Point Calculation**:
Max points per level = **greater of**:
1. Number of spells learned at that level
2. 1 + (level when first spell learned) - (current character level), capped at 9

**Flexible Casting**:
- If you have 3 level-1 spell points and know 3 level-1 spells:
  - Cast same spell 3 times, OR
  - Cast each spell once, OR
  - Any combination
- Each spell cast costs **1 spell point from its level**

**Spell Point Restoration**:
- Rest at inn → restore all spell points

### 6.2 Spell Learning

**On Level Up**:
- Chance to learn new spell = (INT or PIE) / 30
- Example: INT 18 = 60% chance per eligible spell
- Failed rolls = spell not learned (can try again next level)

### 6.3 Spell Casting Contexts

**Three Casting Contexts**:

1. **Combat** - Cast on enemies or allies during battle
2. **Dungeon** - Cast while exploring (healing, utility spells only)
3. **Town** - Cast for healing/utility (if allowed)

```typescript
interface Spell {
  id: string;
  name: string;  // e.g., "KATINO", "DUMAPIC", "HALITO"
  spellType: 'MAGE' | 'PRIEST';
  level: number;  // 1-7

  // Where spell can be cast
  canCastInCombat: boolean;
  canCastInDungeon: boolean;
  canCastInTown: boolean;

  // Valid targets by context
  validTargets: {
    combat: SpellTarget[];      // Can target enemies in combat
    dungeon: SpellTarget[];     // Only party/allies outside combat
    town: SpellTarget[];
  };

  // Spell effects
  effect: SpellEffect;

  // Special mechanics
  minLevel?: number;  // HAMAN/MAHAMAN require level 13+
  successRate?: (caster: Character) => number;  // LOKTOFEIT: level * 2%
}
```

### 6.4 Spell Failure

**No General Fizzle Rate**:
- Most spells always work if you have spell points
- Specific spells have success rates (e.g., LOKTOFEIT: level × 2%)
- Resurrection spells can fail (DI → ashes, KADORTO → lost forever)

**Casting Prevented By**:
- Silenced status
- Paralyzed status
- Insufficient spell points
- Level too low (special spells)

### 6.5 Example Spells

**Level 1 Mage Spells**:
- KATINO - Sleep enemy group
- DUMAPIC - Show current coordinates
- HALITO - 1d8 fire damage to enemy group
- MOGREF - -2 AC to one ally

**Level 1 Priest Spells**:
- DIOS - Heal 1d8 HP to one ally
- BADIOS - 1d8 holy damage to one enemy

---

## 7. Combat System

### 7.1 Combat Structure

**Modal Combat**: Combat is a separate game mode with distinct phases.

```typescript
interface CombatState {
  roundNumber: number;
  phase: CombatPhase;

  // Participants
  party: Character[];  // 6 party members
  monsterGroups: MonsterGroup[];  // 1-4 groups

  // Initiative order (calculated per round)
  initiativeOrder: CombatantId[];

  // Input phase - queued actions
  queuedActions: Map<string, CombatAction>;

  // Resolution phase - current state
  currentActorIndex: number;

  // Results
  combatLog: CombatMessage[];
  loot: { gold: number; items: Item[] };
  xpGained: number;
}

enum CombatPhase {
  SURPRISE_CHECK,    // Determine if anyone is surprised
  INPUT,             // Collect actions from all 6 party members
  INITIATIVE,        // Calculate turn order
  RESOLUTION,        // Execute actions in initiative order
  VICTORY,           // All monsters dead
  DEFEAT,            // All party dead or fled
}
```

### 7.2 Combat Round Flow

**Input Phase**:
1. For each of 6 party members (alive or dead status shown)
2. Player selects action: Attack, Cast Spell, Use Item, Defend, Parry, Run
3. If spell: select spell, then select target (monster group or ally)
4. If attack: target selected automatically (front row monsters prioritized)
5. All actions queued

**Initiative Phase**:
1. Calculate initiative for all combatants (party + monsters)
2. Initiative = Agility + random(1-10) + action modifier
3. Sort by initiative (highest first)

**Resolution Phase**:
1. Execute actions in initiative order
2. Apply damage/effects
3. Check for deaths
4. Generate combat messages
5. After all actions, check victory/defeat
6. If combat continues, return to Input Phase

### 7.3 Monster Groups

```typescript
interface MonsterGroup {
  id: string;
  monsterType: MonsterDefinition;
  count: number;  // e.g., "3 Orcs"
  members: Monster[];
  formation: 'FRONT' | 'BACK';
}
```

**Targeting**:
- Player targets monster **group**, not individual monsters
- Damage distributes across group members
- Some spells affect entire group (area effect)

### 7.4 Initiative Modifiers

```typescript
// Action modifiers to initiative
switch (action.actionType) {
  case 'ATTACK':
    // No modifier
    break;
  case 'CAST_SPELL':
    initiative += spell.castTime || 0;  // Spells can be slow/fast
    break;
  case 'DEFEND':
    initiative += 5;  // Defending is fast
    break;
  case 'RUN':
    initiative -= 5;  // Running is slow
    break;
}
```

---

## 8. Dungeon System

### 8.1 Fixed Mazes (Not Procedural)

**Key Difference from Roguelike**: Wizardry uses **fixed 20×20 mazes**, not procedurally generated dungeons.

**Structure**:
- 10 dungeon levels
- Each level: 20×20 grid
- Maps loaded from JSON data files

```typescript
interface Dungeon {
  levels: Map<number, Level>;  // 1-10
}

interface Level {
  depth: number;  // 1-10
  width: 20;
  height: 20;
  tiles: Tile[][];  // 20×20 grid

  // Special locations
  stairs: StairLocation[];
  encounters: EncounterZone[];
  treasures: TreasureLocation[];
  specialEvents: SpecialEvent[];  // Riddles, teleporters, darkness zones

  // Exploration tracking
  visited: boolean[][];  // Has party visited this tile?
}
```

### 8.2 Tile Types

```typescript
interface Tile {
  type: TileType;  // WALL, FLOOR, DOOR, STAIRS_UP, STAIRS_DOWN, DARKNESS, TELEPORTER

  // Visual properties for first-person rendering
  north: WallTexture | null;
  south: WallTexture | null;
  east: WallTexture | null;
  west: WallTexture | null;
  floor: FloorTexture;
  ceiling: CeilingTexture;

  // Special properties
  isDark: boolean;  // Special dark zones (cannot be lit)
  hasEncounter: boolean;
  encounterRate: number;  // 0.0 - 1.0 probability per turn
}
```

### 8.3 Map Data Storage

```
/data/
  maps/
    level-01.json
    level-02.json
    ...
    level-10.json
  encounters/
    level-01-encounters.json
    ...
  treasures/
    level-01-treasures.json
    ...
```

**Example Map Data**:
```json
{
  "depth": 1,
  "width": 20,
  "height": 20,
  "tiles": [
    [/* 20×20 array of tile objects */]
  ],
  "stairs": [
    { "type": "UP", "position": { "x": 0, "y": 0 } },
    { "type": "DOWN", "position": { "x": 10, "y": 10 } }
  ],
  "encounters": [
    {
      "area": [{ "x": 5, "y": 5 }, { "x": 6, "y": 5 }],
      "monsterTable": "level_1_common",
      "encounterRate": 0.1
    }
  ]
}
```

---

## 9. First-Person Rendering System

### 9.1 View Distance & Perspective

**Classic Wizardry View**: 3 tiles ahead in facing direction.

```typescript
interface FirstPersonView {
  viewDistance: 3;  // Can see 3 tiles ahead

  // Visible tiles (in forward direction)
  tilesAhead: VisibleTile[];  // [1 tile ahead, 2 ahead, 3 ahead]
  tilesLeft: VisibleTile[];   // Left side at each distance
  tilesRight: VisibleTile[];  // Right side at each distance
}

interface VisibleTile {
  distance: number;  // 1, 2, or 3
  position: Position;
  tile: Tile;

  // What's visible
  hasWallAhead: boolean;
  hasWallLeft: boolean;
  hasWallRight: boolean;
  hasDoor: boolean;
  hasMonster: boolean;
  hasStairs: boolean;
}
```

**Perspective Scaling**:
- Distance 3: 40% scale (small, far away)
- Distance 2: 70% scale (medium)
- Distance 1: 100% scale (full size, close)

### 9.2 Movement System

**6-Directional Discrete Movement**:

**Movement Commands** (position changes, facing unchanged):
- Forward (W / ↑)
- Backward (S / ↓)
- Strafe Left (A)
- Strafe Right (D)

**Rotation Commands** (facing changes, position unchanged):
- Turn Left 90° (Q / ←)
- Turn Right 90° (E / →)

**All movements**:
- ✅ Instant (no animation)
- ✅ Discrete (1 tile or 90°)
- ✅ Cost 1 game turn each
- ✅ Trigger encounter checks (except rotation)

### 9.3 Rendering Approach

**Canvas-based 3D-style**:
1. Render from back to front (painter's algorithm)
2. Distance 3 layer (farthest)
3. Distance 2 layer (middle)
4. Distance 1 layer (closest)
5. Overlay (monsters, items)

**Visual Assets**:
- Phase 1: Placeholder geometric shapes
- Phase 2: Hand-drawn illustrated assets

---

## 10. Automap System

### 10.1 Blueprint Style

**Visual Style**: Blue/white schematic map (like classic D&D blueprints).

```typescript
interface AutoMap {
  // Exploration tracking per level
  exploredTiles: Map<number, boolean[][]>;  // level → 20×20 grid

  // Player annotations
  annotations: Annotation[];

  // Visual settings
  showGrid: boolean;
  showCoordinates: boolean;
  style: 'BLUEPRINT';
}

interface Annotation {
  levelDepth: number;
  position: Position;
  symbol: string;  // Simple letters: 'S', 'T', 'D', etc.
  text?: string;   // Optional hover tooltip
  color?: string;
}
```

### 10.2 Map Rendering

**Blueprint Colors**:
- Background: `#4A90E2` (blueprint blue)
- Floor: `#FFFFFF` (white for walkable spaces)
- Walls: `#2D5A8C` (darker blue)
- Grid lines: `#6BA3DB` (light blue overlay)

**Symbols**:
- `S` - Secret door / Stairs
- `T` - Trap / Teleporter
- `D` - Special door
- `F` - Fountain
- `@` - Current party position
- `X` - Danger (player marked)

**Legend** (displayed in corner):
```
┌─────────────────────────────┐
│ ▬  Door       ⊛  Statue     │
│ ▢  Secret Door ≡  Stairs    │
└─────────────────────────────┘
```

### 10.3 Automap Rules

**Shows**:
- ✅ Tiles party has visited
- ✅ Walls party has seen
- ✅ Player-added custom annotations
- ✅ Grid coordinates (A-T, 1-20)

**Doesn't Show**:
- ❌ Unexplored areas (hidden)
- ❌ Auto-marked special tiles (player discovers and annotates)

**Toggle**: Press `M` key during navigation

---

## 11. Town/Castle System

### 11.1 Town Locations

```typescript
enum TownLocation {
  CASTLE_ENTRANCE,
  TRAINING_GROUNDS,  // Create/manage characters
  INN,               // Rest and heal (costs gold)
  TEMPLE,            // Resurrect, cure status (costs gold)
  TAVERN,            // Rumors, quests (future)
  SHOP,              // Buy/sell equipment
  EDGE_OF_TOWN,      // Enter dungeon
}
```

### 11.2 Training Grounds

**Character Roster Management**:
- Create new character (added to roster, not party)
- View all characters in roster
- Add character to active party (max 6)
- Remove character from party
- Inspect character (stats, equipment, spells)
- Delete character (permadeath)

### 11.3 Inn

**Rest & Recovery**:
- Costs gold (based on party level)
- Restores HP to max
- Restores all spell points
- Ages characters slightly (~0.1 years)
- Decreases vim (~0.05)

### 11.4 Temple

**Resurrection**:
```typescript
interface ResurrectResult {
  success: boolean;
  character?: Character;
  turnedToAshes?: boolean;  // DI failure
  lostForever?: boolean;    // KADORTO failure
  goldSpent: number;
  message: string;
}
```

**Resurrection Costs**:
- Dead → Alive (DI spell): 100 gold × level
- Ashes → Alive (KADORTO spell): 500 gold × level

**Resurrection Success Rates**:
- DI: ~90% success, 10% → ashes
- KADORTO: ~50% success, 50% → lost forever

**Cure Status Effects**:
- Poison, Paralysis, etc.
- Cost based on severity

### 11.5 Shop

**Buy/Sell Equipment**:
- Weapons, armor, shields
- Sell price typically 50% of buy price
- Available items filtered by party level

---

## 12. Event Sourcing & Replay System

### 12.1 Architecture (Reused from Roguelike)

**Dual Storage Model**:
- **Saves store** (IndexedDB): Full GameState snapshots (fast loading)
- **Replays store** (IndexedDB): Initial state + command log (debugging)

**Key Benefits**:
- Deterministic state reconstruction
- Bug reproduction at any turn
- Time-travel debugging
- Replay analysis

### 12.2 Determinism Requirements

**All Randomness Uses Seeded RNG**:
- Never use `Math.random()`
- Always use `IRandomService` (injectable)
- RNG state captured before command execution

**No Timing-Based Logic**:
- Use turn counter, not `Date.now()`
- No browser API randomness
- No external async without deterministic handling

---

## 13. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Set up project structure (TypeScript + Vite)
- Core data structures (GameState, Character, Party)
- Command layer skeleton
- Basic first-person rendering (placeholder graphics)
- Movement commands (forward, back, strafe, turn)

### Phase 2: Character & Party (Weeks 3-4)
- Character creation flow
- Stat rolling system
- Class eligibility logic
- Character roster management
- Party formation

### Phase 3: Town System (Week 5)
- Town navigation
- Training grounds (create/manage characters)
- Inn (rest, heal)
- Temple (resurrect, cure)
- Shop (buy/sell)

### Phase 4: Dungeon & Navigation (Weeks 6-7)
- Fixed map loading from JSON
- First-person view calculation
- Exploration tracking
- Special tiles (stairs, teleporters, darkness)
- Encounter system

### Phase 5: Automap (Week 8)
- Blueprint-style rendering
- Exploration tracking
- Player annotations
- Legend and coordinates

### Phase 6: Spell System (Weeks 9-10)
- Spell point management
- Spell learning on level-up
- Spell casting (dungeon context)
- Spell effects (healing, utility)

### Phase 7: Combat System (Weeks 11-13)
- Combat state machine
- Input phase (action selection)
- Initiative calculation
- Resolution phase (execute actions)
- Combat spells
- Monster AI (basic)

### Phase 8: Character Progression (Week 14)
- Level-up system
- Stat changes (aging-based)
- Class changing
- Death & body recovery

### Phase 9: Content & Balance (Weeks 15-16)
- Create all 10 dungeon maps
- Monster definitions (100+ monsters)
- Spell definitions (7 mage + 7 priest levels)
- Item/equipment database
- Encounter tables per level

### Phase 10: Polish & Testing (Weeks 17-18)
- Hand-drawn asset integration
- Sound effects (optional)
- UI/UX refinement
- Balance testing
- Bug fixes
- Performance optimization

---

## 14. Data Files

### 14.1 File Structure

```
/data/
  maps/
    level-01.json
    level-02.json
    ...
    level-10.json

  encounters/
    level-01-encounters.json
    ...
    level-10-encounters.json

  treasures/
    level-01-treasures.json
    ...

  spells/
    mage-spells.json
    priest-spells.json

  monsters/
    monsters.json

  items/
    weapons.json
    armor.json
    consumables.json

  config/
    classes.json
    races.json
    game-config.json
```

### 14.2 Example: Monster Definition

```json
{
  "id": "orc",
  "name": "Orc",
  "letter": "O",
  "hp": "2d8",
  "ac": 6,
  "damage": "1d8",
  "xpValue": 15,
  "canCastSpells": false,
  "aiProfile": {
    "behavior": "AGGRESSIVE",
    "intelligence": 2
  },
  "lootTable": {
    "gold": "5-20",
    "itemChance": 0.1
  },
  "minLevel": 1,
  "maxLevel": 3
}
```

### 14.3 Example: Spell Definition

```json
{
  "id": "HALITO",
  "name": "HALITO",
  "spellType": "MAGE",
  "level": 1,
  "canCastInCombat": true,
  "canCastInDungeon": false,
  "canCastInTown": false,
  "validTargets": {
    "combat": ["ENEMY_GROUP"],
    "dungeon": [],
    "town": []
  },
  "effect": {
    "type": "DAMAGE",
    "damageFormula": "1d8",
    "damageType": "FIRE",
    "areaEffect": true
  },
  "description": "Fire breath - 1-8 damage to enemy group"
}
```

---

## 15. Key Design Decisions Summary

### 15.1 Architectural Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Party-First | Wizardry is fundamentally party-based; design around this core |
| **Combatant Model** | Unified Interface | Monsters and characters share combat mechanics; avoid duplication |
| **Dungeon** | Fixed Maps | Wizardry uses handcrafted 20×20 mazes, not procedural generation |
| **Spell System** | Spell Points | Original uses points per level, not memorized slots |
| **Movement** | Discrete Tile-Based | Classic Wizardry feel, no smooth animations |
| **Combat** | Round-Based Queued | All actions input first, then resolve by initiative |
| **Rendering** | Canvas First-Person | 3D-style view with 3-tile depth, painter's algorithm |

### 15.2 Modernizations

| Feature | Original | Modernized |
|---------|----------|------------|
| **Map** | Manual graph paper | Blueprint-style automap with annotations |
| **UI** | Text-based | Canvas rendering with visual assets |
| **Controls** | Keyboard only | WASD + mouse support (future) |
| **Graphics** | Wire-frame/ASCII | Hand-drawn illustrated (placeholder first) |
| **Save System** | Floppy disk | IndexedDB with event sourcing |
| **Info** | Minimal feedback | Clear combat log, better stat displays |

### 15.3 Faithful Mechanics Preserved

- ✅ 8 character classes with strict stat requirements
- ✅ Spell point system (7 levels × 2 types)
- ✅ Random stat changes on level-up (aging-based)
- ✅ Class changing after meeting requirements
- ✅ Body recovery system (rescue dead party members)
- ✅ Character roster (unlimited characters, 6 active)
- ✅ Fixed 10-level dungeon (20×20 each)
- ✅ Permadeath with resurrection (DI → ashes, KADORTO → lost)
- ✅ Aging system (inn rest ages characters)
- ✅ Party formation (front/back rows)
- ✅ Bonus point rolling at creation (7-29 points)

---

## 16. Risk Analysis

### 16.1 Technical Risks

| Risk | Mitigation |
|------|------------|
| **First-person rendering complexity** | Start with simple geometric placeholders; optimize later |
| **Combat system complexity** | Break into phases; test each phase independently |
| **Map data creation burden** | Create level-editor tool; start with 2-3 levels for testing |
| **Balance tuning effort** | Use original Wizardry data as baseline |

### 16.2 Scope Risks

| Risk | Mitigation |
|------|------------|
| **Feature creep** | Strict adherence to original Wizardry 1 scope |
| **Art asset workload** | Placeholder graphics acceptable for initial release |
| **Content volume (100+ monsters)** | Prioritize core 20-30 monsters; expand later |

---

## 17. Success Metrics

### 17.1 Functional Completeness

- [ ] All 8 character classes playable
- [ ] All 10 dungeon levels explorable
- [ ] Complete spell system (14 spell levels total)
- [ ] Full combat system with all mechanics
- [ ] Character creation → death → resurrection → class change working
- [ ] Town system fully functional (inn, temple, shop, training)

### 17.2 Quality Metrics

- [ ] Runs at 60 FPS on modern browsers
- [ ] No game-breaking bugs
- [ ] Save/load works reliably
- [ ] Replay system functional for debugging
- [ ] Test coverage >80% for core systems

### 17.3 Experience Goals

- [ ] Feels like original Wizardry (authentic challenge)
- [ ] Modern UI improves playability
- [ ] Automap enhances navigation without removing challenge
- [ ] Players can complete the game (defeat Mad Overlord, get amulet)

---

## Appendix A: Wizardry 1 Original Content

### A.1 Research Sources

- Wizardry Wiki: https://wizardry.fandom.com/
- Wizardry Fan Sites: https://www.zimlab.com/wizardry/
- Strategy Wiki: https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord
- Community Guides: Steam, GOG forums

### A.2 Content to Extract

- [ ] Complete monster list (100+ monsters)
- [ ] All spell definitions (mage + priest, levels 1-7)
- [ ] Dungeon maps (10 levels, 20×20 each)
- [ ] Item/equipment database
- [ ] Encounter tables per level
- [ ] Class stat requirements (verified)
- [ ] Racial base stats (verified)
- [ ] Spell formulas and mechanics

---

**End of Design Document**

*Next Steps*:
1. Set up git worktree
2. Create implementation plan
3. Begin Phase 1 implementation
