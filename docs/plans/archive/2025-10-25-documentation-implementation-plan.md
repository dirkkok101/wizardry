# Wizardry Remake Documentation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create world-class documentation for Wizardry 1 remake covering all services, commands, systems, and game design before implementation begins.

**Architecture:** Comprehensive documentation structure with services (40+ docs), commands (40+ docs), systems (9 deep-dives), game design (12 docs), diagrams (8 visual aids), and data formats (5 specs). Documentation-first approach ensures design validation and clarity before any coding.

**Tech Stack:** Markdown, Mermaid.js (diagrams), TypeScript type definitions (examples), JSON (data format specs)

**Current Status**: Week 1 complete (research & validation: 68% validated, 100% accuracy, 7 reference docs created)

**Remaining Work**: Weeks 2-11 (documentation), Week 12 (review & QA)

---

## Task 1: Documentation Hub Setup (Week 2, Day 1)

**Files:**
- Create: `docs/README.md`
- Create: `docs/architecture.md`
- Create: `docs/getting-started.md`

**Step 1: Create documentation hub README**

Create `docs/README.md`:

```markdown
# Wizardry: Proving Grounds Remake - Documentation

**Welcome to the comprehensive documentation for the Wizardry 1 remake.**

## Quick Links

- [Architecture Overview](./architecture.md) - Technical architecture & layers
- [Getting Started](./getting-started.md) - Quick start guide
- [Game Design](./game-design/README.md) - Game mechanics & systems
- [Services](./services/README.md) - Service layer documentation (40+ services)
- [Commands](./commands/README.md) - Command layer documentation (40+ commands)
- [Systems](./systems/README.md) - System deep-dives (9 major systems)
- [Diagrams](./diagrams/README.md) - Visual architecture diagrams
- [Testing Strategy](./testing-strategy.md) - Testing approach & patterns

## Documentation Structure

```
docs/
├── README.md (you are here)
├── architecture.md
├── diagrams/ (8 Mermaid diagrams)
├── services/ (40+ service docs)
├── commands/ (40+ command docs)
├── systems/ (9 system deep-dives)
├── game-design/ (12 game design docs)
├── data-format/ (5 JSON specs)
└── research/ (source validation & reference)
```

## Research & Validation

All game mechanics validated against original Wizardry 1 sources:
- **Validation Coverage**: 68% (71/105 items validated)
- **Accuracy**: 100% (0 errors remaining)
- **Reference Docs**: 7 comprehensive documents (3,682 lines)

See [Research Documentation](./research/week1-research-summary.md) for full validation report.

## Implementation Status

- ✅ **Week 1**: Research & Validation (COMPLETE)
- 🔄 **Weeks 2-11**: Documentation (IN PROGRESS)
- ⬜ **Week 12**: Review & Quality Assurance
- ⬜ **Weeks 13+**: Implementation

## Contributing

See [Contributing Guide](./contributing.md) for documentation standards and patterns.
```

**Step 2: Verify file created**

Run: `cat docs/README.md | head -20`
Expected: First 20 lines of hub README displayed

**Step 3: Create architecture overview**

Create `docs/architecture.md`:

```markdown
# Wizardry Remake - Technical Architecture

**Version**: 1.0
**Last Updated**: 2025-10-25

---

## 1. Architecture Overview

### 1.1 Design Philosophy

**Party-First Architecture**: Built around party management as core abstraction, not single-character roguelike patterns.

**Why**: Wizardry's party-based mechanics are fundamentally different from single-character roguelikes. Starting with party architecture ensures systems are designed correctly rather than retrofitted.

### 1.2 Four-Layer Architecture

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
│ - TurnCommand, StrafeCommand            │
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

See [Architecture Diagram](./diagrams/architecture-layers.md) for detailed visual.

## 2. Core Patterns

### 2.1 Event Sourcing

Every action creates an event. Game state derived from event replay.

**Benefits**:
- Save/load as event streams
- Replay system (watch game playback)
- Undo/redo support
- Debugging (step through events)

### 2.2 Command Pattern

All player actions as command objects.

**Benefits**:
- Undo/redo capability
- Action queuing (combat rounds)
- Macro support
- Replay from event log

### 2.3 Service Layer Separation

Pure functions, no side effects.

**Benefits**:
- Easy testing (no mocks needed)
- Parallel execution safe
- Deterministic outcomes
- State transitions explicit

## 3. Technology Stack

**Language**: TypeScript (strict mode)
**Build Tool**: Vite
**Rendering**: HTML5 Canvas (first-person 3D-style view)
**Storage**: IndexedDB (saves + event replay data)
**Platform**: Modern web browsers (ES2020+)
**Testing**: Jest (unit + integration)
**Data Files**: JSON (spells, monsters, items, maps)

## 4. Key Design Decisions

### 4.1 Party as Core Abstraction

**Decision**: Party is the primary game entity, not individual characters.

**Rationale**: Wizardry is party-based. All systems (movement, combat, inventory, death) operate on party context.

**Impact**:
- Party has position, facing, active members
- Characters belong to roster, subset active in party
- Movement moves entire party
- Combat involves entire party formation

### 4.2 Modal Game States

**States**: TOWN, NAVIGATION, COMBAT, CHARACTER_CREATION, CAMP

**Decision**: Explicit state machine prevents invalid transitions.

**Rationale**: Different modes have different valid actions.

**Impact**:
- Town: Can't move in dungeon, can access services
- Navigation: Can move, search, camp, encounter triggers combat
- Combat: Can't move map, can attack/cast/flee
- Clear state transitions prevent bugs

### 4.3 Spell Points (Not Slots)

**Decision**: Wizardry 1 uses spell points per level, not memorized slots.

**Rationale**: Validated against original game sources.

**Impact**:
- Separate point pools for each spell level (1-7)
- Each spell costs 1 point from its level
- Inn rest restores all points
- Simpler than D&D vancian magic

## 5. Service Architecture

### 5.1 Service Responsibilities

Each service handles one domain:
- **PartyService**: Formation, membership, position
- **CombatService**: Initiative, resolution, damage
- **SpellService**: Spell points, casting, learning
- **DungeonService**: Map loading, tile resolution
- **CharacterService**: Classes, stats, leveling

### 5.2 Service Dependencies

Services can call other services, but no circular dependencies.

**Example**: CombatService uses SpellService (for spell effects) but SpellService doesn't use CombatService.

See [Service Dependency Diagram](./diagrams/service-dependencies.md)

## 6. Data Model

### 6.1 Core Entities

- **Character**: Race, class, stats, spells, equipment, status
- **Party**: Active characters (1-6), formation (front/back), position, facing
- **GameState**: Mode, party, roster, dungeon level, event log
- **Combatant**: Unified interface for characters & monsters

### 6.2 Immutable Updates

All state changes create new state (no mutations).

**Pattern**:
```typescript
function updateCharacterHP(state: GameState, charId: string, newHP: number): GameState {
  return {
    ...state,
    roster: new Map(state.roster).set(charId, {
      ...state.roster.get(charId)!,
      hp: newHP
    })
  }
}
```

## 7. Testing Strategy

### 7.1 Service Testing

Pure function testing, no mocks:
```typescript
test('PartyService.addMember adds character to party', () => {
  const party = createEmptyParty()
  const character = createTestCharacter()

  const result = PartyService.addMember(party, character)

  expect(result.members).toHaveLength(1)
  expect(result.members[0]).toBe(character)
})
```

### 7.2 Command Testing

Test orchestration logic:
```typescript
test('MoveForwardCommand updates party position', () => {
  const state = createGameState()
  const command = new MoveForwardCommand()

  const result = command.execute(state)

  expect(result.party.position.y).toBe(state.party.position.y + 1)
})
```

See [Testing Strategy](./testing-strategy.md) for full approach.

---

**Next**: See [Game Design Documentation](./game-design/README.md) for game mechanics.
```

**Step 4: Verify architecture doc created**

Run: `wc -l docs/architecture.md`
Expected: ~250+ lines counted

**Step 5: Create getting started guide**

Create `docs/getting-started.md`:

```markdown
# Getting Started

**Quick start guide for understanding the Wizardry remake codebase.**

## For New Developers

### 1. Read This First

Start here to understand the system:
1. [Architecture Overview](./architecture.md) - Technical architecture
2. [Game Design Overview](./game-design/01-overview.md) - What we're building
3. [Research Summary](./research/week1-research-summary.md) - Validation & accuracy

### 2. Understanding the Code Structure

```
src/
├── commands/     # Command layer (user actions)
├── services/     # Service layer (business logic)
├── types/        # TypeScript type definitions
├── data/         # JSON data files (spells, monsters, maps)
└── ui/           # UI layer (Canvas rendering)

docs/
├── services/     # Service documentation
├── commands/     # Command documentation
├── game-design/  # Game mechanics
└── research/     # Source validation
```

### 3. Key Concepts

**Party-First**: Everything revolves around the party (not individual characters)

**Event Sourcing**: All actions create events, state derived from replay

**Modal States**: TOWN → NAVIGATION ↔ COMBAT (explicit transitions)

**Spell Points**: Not D&D slots; separate pools per level (1-7)

**Body Recovery**: Dead characters become items in dungeon, retrievable

### 4. Read These Docs Next

**If you're implementing services**:
- [Service Creation Guide](./services/creation-guide.md)
- [Service Testing Guide](./services/testing-guide.md)
- [Service Patterns](./services/patterns.md)

**If you're implementing commands**:
- [Command Creation Guide](./commands/creation-guide.md)
- [Command Testing Guide](./commands/testing-guide.md)
- [Command Patterns](./commands/patterns.md)

**If you're implementing game systems**:
- [Systems Overview](./systems/README.md)
- [Combat System](./systems/combat-system.md)
- [Spell System](./systems/spell-system.md)

### 5. Development Workflow

1. Read relevant documentation
2. Write failing test (TDD)
3. Implement minimal code to pass test
4. Refactor if needed
5. Commit frequently (small commits)

### 6. Common Questions

**Q: Why party-first instead of adapting roguelike?**
A: Wizardry's party mechanics are fundamentally different. Building party-first ensures correct design from day one.

**Q: Why spell points instead of slots?**
A: Validated against original Wizardry 1 sources. Original uses spell points, not D&D-style memorization.

**Q: Why modal states?**
A: Different game modes have different valid actions. Explicit states prevent bugs (can't attack in town, can't shop in dungeon).

**Q: What's the body recovery system?**
A: When character dies, body remains at death location. New party can retrieve body and resurrect at temple. Unique to Wizardry.

### 7. Need Help?

- Check [Service Docs](./services/README.md) for service API reference
- Check [Command Docs](./commands/README.md) for command reference
- Check [Game Design Docs](./game-design/README.md) for mechanics
- Check [Research Docs](./research/) for source validation

---

**Ready to start?** Pick a service or command to implement and read its documentation first.
```

**Step 6: Verify getting started guide created**

Run: `grep -c "^##" docs/getting-started.md`
Expected: 7 (seven level-2 headers counted)

**Step 7: Commit documentation hub setup**

```bash
git add docs/README.md docs/architecture.md docs/getting-started.md
git commit -m "docs: create documentation hub with architecture overview

- Add comprehensive docs/README.md hub with navigation
- Add docs/architecture.md with 4-layer architecture
- Add docs/getting-started.md quick start guide
- Week 2 Day 1: Documentation foundation complete"
```

---

## Task 2: Diagram Structure Setup (Week 2, Day 1)

**Files:**
- Create: `docs/diagrams/README.md`
- Create: `docs/diagrams/architecture-layers.md`
- Create: `docs/diagrams/party-structure.md`

**Step 1: Create diagrams index**

Create `docs/diagrams/README.md`:

```markdown
# Architecture Diagrams

**Visual diagrams of system architecture using Mermaid.js.**

## Available Diagrams

1. [Architecture Layers](./architecture-layers.md) - 4-layer system architecture
2. [Party Structure](./party-structure.md) - Party & character relationships
3. [Combat Flow](./combat-flow.md) - Combat round phases
4. [Spell System](./spell-system.md) - Spell points & casting
5. [Service Dependencies](./service-dependencies.md) - Service call graph
6. [Data Model](./data-model.md) - Entity relationships
7. [Game State Machine](./game-state-machine.md) - Modal state transitions
8. [Character Creation Flow](./character-creation-flow.md) - Creation steps

## Viewing Diagrams

These diagrams use [Mermaid.js](https://mermaid.js.org/) syntax.

**View in:**
- GitHub (renders automatically)
- VS Code (with Mermaid extension)
- Online: [Mermaid Live Editor](https://mermaid.live/)

## Diagram Standards

**Format**: Use Mermaid.js flowchart, sequence, or class diagram syntax
**Style**: Clear labels, logical flow top-to-bottom or left-to-right
**Sections**: Each diagram has description + Mermaid code block
```

**Step 2: Create architecture layers diagram**

Create `docs/diagrams/architecture-layers.md`:

```markdown
# Architecture Layers Diagram

**Visual representation of the 4-layer architecture.**

## Description

The Wizardry remake uses a clean 4-layer architecture:

1. **UI Layer**: Canvas rendering, user input
2. **Command Layer**: Action orchestration
3. **Service Layer**: Business logic (pure functions)
4. **Data Layer**: State storage, event log, persistence

Each layer only communicates with the layer below (no skipping layers).

## Diagram

\`\`\`mermaid
graph TD
    subgraph UI["UI Layer"]
        Canvas["Canvas Renderer<br/>(First-Person View)"]
        Input["Input Handler<br/>(Keyboard/Mouse)"]
        Panels["UI Panels<br/>(Stats, Inventory)"]
    end

    subgraph Commands["Command Layer"]
        MoveCmd["MoveForwardCommand"]
        TurnCmd["TurnCommand"]
        AttackCmd["AttackCommand"]
        SpellCmd["CastSpellCommand"]
        RestCmd["RestCommand"]
    end

    subgraph Services["Service Layer (Pure Functions)"]
        PartySvc["PartyService"]
        CombatSvc["CombatService"]
        SpellSvc["SpellService"]
        DungeonSvc["DungeonService"]
        CharSvc["CharacterService"]
    end

    subgraph Data["Data Layer"]
        GameState["GameState"]
        EventLog["Event Log"]
        IndexDB["IndexedDB<br/>(Persistence)"]
        DataFiles["JSON Data Files<br/>(Spells, Monsters)"]
    end

    UI --> Commands
    Commands --> Services
    Services --> Data

    style UI fill:#e1f5ff
    style Commands fill:#fff3e0
    style Services fill:#f3e5f5
    style Data fill:#e8f5e9
\`\`\`

## Layer Responsibilities

**UI Layer**:
- Render first-person dungeon view
- Display party stats, combat UI
- Handle user input (keyboard, mouse)
- Trigger commands based on input

**Command Layer**:
- Orchestrate service calls
- Validate command preconditions
- Create events for event log
- Return new game state

**Service Layer**:
- Pure functions (no side effects)
- Business logic implementation
- State transformations
- Calculations (combat, spells, etc.)

**Data Layer**:
- Game state storage
- Event log (for replay)
- IndexedDB persistence
- Static data files (JSON)

## Communication Flow

User Input → Command → Service(s) → New State → UI Update

**Example: Move Forward**
1. User presses 'W'
2. Input handler triggers MoveForwardCommand
3. Command calls PartyService.moveForward(state)
4. PartyService returns new state with updated position
5. Command adds MoveEvent to event log
6. UI re-renders with new party position
```

**Step 3: Create party structure diagram**

Create `docs/diagrams/party-structure.md`:

```markdown
# Party Structure Diagram

**Visual representation of party and character relationships.**

## Description

The party is the core game entity. Characters belong to the roster, with 1-6 active in the party at any time.

## Diagram

\`\`\`mermaid
classDiagram
    GameState --> CharacterRoster
    GameState --> Party
    Party --> Character : has 1-6
    CharacterRoster --> Character : has 0-20
    Party --> Formation
    Formation --> FrontRow : 0-3 characters
    Formation --> BackRow : 0-3 characters
    Character --> Class
    Character --> Race
    Character --> Equipment
    Character --> SpellBook
    Character --> StatusEffects

    class GameState {
        +mode: GameMode
        +characterRoster: Map~string, Character~
        +activeParty: Party
        +currentLevel: number
        +position: Position
        +eventLog: Event[]
    }

    class CharacterRoster {
        +characters: Map~string, Character~
        +addCharacter(char)
        +removeCharacter(id)
        +getCharacter(id)
    }

    class Party {
        +members: Character[]
        +formation: Formation
        +position: Position
        +facing: Direction
        +gold: number
        +addMember(char)
        +removeMember(id)
    }

    class Formation {
        +frontRow: Character[]
        +backRow: Character[]
        +getRow(char): Row
        +moveToFront(char)
        +moveToBack(char)
    }

    class Character {
        +id: string
        +name: string
        +race: Race
        +class: Class
        +stats: Stats
        +hp: number
        +spellPoints: Map~number, number~
        +equipment: Equipment
        +status: StatusEffect[]
    }
\`\`\`

## Key Relationships

**GameState → CharacterRoster**: All created characters (1:N)
**GameState → Party**: Current active party (1:1)
**Party → Character**: 1-6 active characters
**Party → Formation**: Front row (3 max) + Back row (3 max)

## Formation Rules

**Front Row**:
- Max 3 characters
- Takes melee hits
- Can attack in melee

**Back Row**:
- Max 3 characters
- Protected from melee
- Cannot melee attack (can use ranged/magic)

**Movement**:
- Characters can move front ↔ back
- Formation changes during camp (not combat)
```

**Step 4: Verify diagrams created**

Run: `ls -la docs/diagrams/`
Expected: README.md, architecture-layers.md, party-structure.md listed

**Step 5: Commit diagrams**

```bash
git add docs/diagrams/
git commit -m "docs: add architecture diagrams with Mermaid.js

- Add diagrams index and viewing instructions
- Add architecture layers diagram (4-layer)
- Add party structure diagram (entity relationships)
- Week 2 Day 1: Visual documentation foundation"
```

---

## Task 3: Service Documentation Structure (Week 2, Day 2)

**Files:**
- Create: `docs/services/README.md`
- Create: `docs/services/creation-guide.md`
- Create: `docs/services/patterns.md`
- Create: `docs/services/testing-guide.md`

**Step 1: Create services index**

Create `docs/services/README.md`:

```markdown
# Service Layer Documentation

**Pure function services implementing business logic.**

## Service Catalog (40+ Services)

### Core Services
1. [PartyService](./PartyService.md) - Party formation, membership
2. [CombatService](./CombatService.md) - Combat resolution
3. [SpellService](./SpellService.md) - Spell casting, points, learning
4. [CharacterService](./CharacterService.md) - Stats, classes, progression
5. [DungeonService](./DungeonService.md) - Map loading, tile resolution

### Character & Progression
6. [CharacterCreationService](./CharacterCreationService.md) - Creation flow
7. [LevelingService](./LevelingService.md) - XP, level-up, stat changes
8. [ClassChangeService](./ClassChangeService.md) - Class changing
9. [EquipmentService](./EquipmentService.md) - Equipment management
10. [InventoryService](./InventoryService.md) - Item management

### Combat & Spells
11. [InitiativeService](./InitiativeService.md) - Combat initiative
12. [AttackService](./AttackService.md) - Attack resolution
13. [DamageService](./DamageService.md) - Damage calculation
14. [SpellCastingService](./SpellCastingService.md) - Spell resolution
15. [SpellLearningService](./SpellLearningService.md) - Learn new spells

### Town Services
16. [TownService](./TownService.md) - Town state management
17. [InnService](./InnService.md) - Rest, restore HP/spells
18. [TempleService](./TempleService.md) - Resurrection, cure status
19. [ShopService](./ShopService.md) - Buy/sell equipment
20. [TrainingService](./TrainingService.md) - Roster management, level-up

### Dungeon & Navigation
21. [MapService](./MapService.md) - Automap, exploration
22. [NavigationService](./NavigationService.md) - Movement validation
23. [EncounterService](./EncounterService.md) - Random encounters
24. [TileService](./TileService.md) - Tile effects (teleport, spinner)
25. [DoorService](./DoorService.md) - Door interactions

### Death & Recovery
26. [DeathService](./DeathService.md) - Character death
27. [BodyRecoveryService](./BodyRecoveryService.md) - Body retrieval
28. [ResurrectionService](./ResurrectionService.md) - DI/KADORTO spells
29. [StatusEffectService](./StatusEffectService.md) - Poison, paralyze, etc.

### Monsters & AI
30. [MonsterService](./MonsterService.md) - Monster stat loading
31. [MonsterAIService](./MonsterAIService.md) - Monster behavior
32. [GroupService](./GroupService.md) - Monster group management

### Rendering & UI
33. [FirstPersonViewService](./FirstPersonViewService.md) - 3D view calc
34. [AutomapService](./AutomapService.md) - Blueprint map rendering
35. [VisibilityService](./VisibilityService.md) - Tile visibility

### Persistence & Events
36. [EventService](./EventService.md) - Event creation
37. [ReplayService](./ReplayService.md) - Event replay
38. [SaveService](./SaveService.md) - IndexedDB persistence
39. [LoadService](./LoadService.md) - Load saved games

### Utility Services
40. [ValidationService](./ValidationService.md) - Data validation
41. [FormulaService](./FormulaService.md) - Game formulas (hit chance, etc.)
42. [RandomService](./RandomService.md) - RNG with seed support

## Service Principles

**Pure Functions**: No side effects, deterministic
**Single Responsibility**: Each service handles one domain
**Testable**: Easy to test without mocks
**Composable**: Services call other services

## Getting Started

1. Read [Creation Guide](./creation-guide.md) to create new services
2. Read [Patterns](./patterns.md) for common patterns
3. Read [Testing Guide](./testing-guide.md) for testing approach
4. Check individual service docs for API reference
```

**Step 2: Verify services index created**

Run: `grep -c "^###" docs/services/README.md`
Expected: 8 (eight category headers counted)

**Step 3: Commit services structure**

```bash
git add docs/services/README.md
git commit -m "docs: create services documentation index

- Add service catalog with 42 services organized by category
- Add service principles (pure functions, testable)
- Add getting started links to guides
- Week 2 Day 2: Service documentation foundation"
```

---

## Task 4-42: Individual Service Documentation (Weeks 2-6)

**Note**: Each service follows same pattern. Template below, repeat for all 42 services.

**Template File**: `docs/services/[ServiceName].md`

**Step 1: Create service doc from template**

Example `docs/services/PartyService.md`:

```markdown
# PartyService

**Pure function service for party formation and membership management.**

## Responsibility

Manages party composition, formation (front/back rows), and membership changes.

## API Reference

### addMember

Add character to party.

**Signature**:
```typescript
function addMember(party: Party, character: Character): Party
```

**Parameters**:
- `party`: Current party state
- `character`: Character to add

**Returns**: New party with character added

**Throws**:
- `PartyFullError` if party has 6 members
- `CharacterAlreadyInPartyError` if character already in party

**Example**:
```typescript
const party = createEmptyParty()
const character = createCharacter({ name: "Gandalf", class: "Mage" })

const newParty = PartyService.addMember(party, character)
// newParty.members.length === 1
```

### removeMember

Remove character from party.

**Signature**:
```typescript
function removeMember(party: Party, characterId: string): Party
```

**Parameters**:
- `party`: Current party state
- `characterId`: ID of character to remove

**Returns**: New party without character

**Throws**:
- `CharacterNotInPartyError` if character not in party

### moveToFrontRow

Move character to front row.

**Signature**:
```typescript
function moveToFrontRow(party: Party, characterId: string): Party
```

**Parameters**:
- `party`: Current party state
- `characterId`: ID of character to move

**Returns**: New party with updated formation

**Throws**:
- `FrontRowFullError` if front row has 3 characters
- `CharacterNotInPartyError` if character not in party

### moveToBackRow

Move character to back row.

**Signature**:
```typescript
function moveToBackRow(party: Party, characterId: string): Party
```

## Dependencies

Uses:
- `ValidationService` (validate party size constraints)

## Testing

See [PartyService.test.ts](../../tests/services/PartyService.test.ts)

**Key test cases**:
- Adding character to empty party
- Adding to full party throws error
- Removing character from party
- Moving between front/back rows
- Front row max 3 characters
- Back row max 3 characters

## Related

- [Formation Diagram](../diagrams/party-structure.md)
- [FormPartyCommand](../commands/FormPartyCommand.md) - Uses this service
```

**Step 2: Verify service doc created**

Run: `grep "^## " docs/services/PartyService.md`
Expected: Sections listed (Responsibility, API, Dependencies, etc.)

**Step 3: Commit individual service doc**

```bash
git add docs/services/PartyService.md
git commit -m "docs(services): add PartyService documentation

- Document party formation and membership API
- Add code examples for all methods
- Document error cases and constraints
- Week 2: Service documentation (1/42)"
```

**Repeat Steps 1-3 for remaining 41 services over Weeks 2-6**

---

## Task 43: Command Documentation Structure (Week 7, Day 1)

**Files:**
- Create: `docs/commands/README.md`
- Create: `docs/commands/creation-guide.md`
- Create: `docs/commands/patterns.md`

**Step 1: Create commands index**

Create `docs/commands/README.md`:

```markdown
# Command Layer Documentation

**Command pattern implementations for all user actions.**

## Command Catalog (40+ Commands)

### Navigation Commands
1. [MoveForwardCommand](./MoveForwardCommand.md) - Move party forward
2. [MoveBackwardCommand](./MoveBackwardCommand.md) - Move party backward
3. [StrafeLeftCommand](./StrafeLeftCommand.md) - Strafe left
4. [StrafeRightCommand](./StrafeRightCommand.md) - Strafe right
5. [TurnLeftCommand](./TurnLeftCommand.md) - Turn 90° left
6. [TurnRightCommand](./TurnRightCommand.md) - Turn 90° right

### Combat Commands
7. [AttackCommand](./AttackCommand.md) - Physical attack
8. [CastSpellCommand](./CastSpellCommand.md) - Cast spell in combat
9. [DefendCommand](./DefendCommand.md) - Defensive stance
10. [ParryCommand](./ParryCommand.md) - Parry incoming attack
11. [FleeCommand](./FleeCommand.md) - Attempt to flee combat
12. [UseItemCommand](./UseItemCommand.md) - Use item in combat

### Character Management
13. [CreateCharacterCommand](./CreateCharacterCommand.md) - Create new character
14. [DeleteCharacterCommand](./DeleteCharacterCommand.md) - Delete character
15. [InspectCharacterCommand](./InspectCharacterCommand.md) - View character sheet
16. [LevelUpCharacterCommand](./LevelUpCharacterCommand.md) - Level up at training
17. [ChangeClassCommand](./ChangeClassCommand.md) - Change character class

### Party Management
18. [FormPartyCommand](./FormPartyCommand.md) - Create/modify party
19. [AddToPartyCommand](./AddToPartyCommand.md) - Add character to party
20. [RemoveFromPartyCommand](./RemoveFromPartyCommand.md) - Remove from party
21. [ChangeFormationCommand](./ChangeFormationCommand.md) - Move front/back

### Town Commands
22. [EnterTownCommand](./EnterTownCommand.md) - Enter town from dungeon
23. [RestAtInnCommand](./RestAtInnCommand.md) - Rest at inn
24. [VisitTempleCommand](./VisitTempleCommand.md) - Enter temple
25. [ResurrectCharacterCommand](./ResurrectCharacterCommand.md) - Temple resurrection
26. [VisitShopCommand](./VisitShopCommand.md) - Enter shop
27. [BuyItemCommand](./BuyItemCommand.md) - Purchase item
28. [SellItemCommand](./SellItemCommand.md) - Sell item

### Dungeon Commands
29. [EnterDungeonCommand](./EnterDungeonCommand.md) - Enter dungeon from town
30. [DescendStairsCommand](./DescendStairsCommand.md) - Go down stairs
31. [AscendStairsCommand](./AscendStairsCommand.md) - Go up stairs
32. [SearchCommand](./SearchCommand.md) - Search for secret doors
33. [OpenDoorCommand](./OpenDoorCommand.md) - Open door
34. [InspectCommand](./InspectCommand.md) - Inspect tile

### Inventory Commands
35. [EquipItemCommand](./EquipItemCommand.md) - Equip weapon/armor
36. [UnequipItemCommand](./UnequipItemCommand.md) - Unequip item
37. [DropItemCommand](./DropItemCommand.md) - Drop item
38. [IdentifyItemCommand](./IdentifyItemCommand.md) - Identify unknown item

### Spell Commands
39. [CastUtilitySpellCommand](./CastUtilitySpellCommand.md) - Non-combat spell
40. [LearnSpellCommand](./LearnSpellCommand.md) - Learn spell on level-up

### Meta Commands
41. [SaveGameCommand](./SaveGameCommand.md) - Save game to IndexedDB
42. [LoadGameCommand](./LoadGameCommand.md) - Load saved game
43. [ReplayCommand](./ReplayCommand.md) - Replay event log

## Command Principles

**Orchestration**: Commands orchestrate service calls
**Validation**: Check preconditions before execution
**Events**: Create events for event log
**Immutable**: Return new state, never mutate

## Getting Started

1. Read [Creation Guide](./creation-guide.md) for command structure
2. Read [Patterns](./patterns.md) for common patterns
3. Check individual command docs for implementation details
```

**Step 2: Verify commands index**

Run: `wc -l docs/commands/README.md`
Expected: 100+ lines

**Step 3: Commit commands structure**

```bash
git add docs/commands/README.md
git commit -m "docs: create commands documentation index

- Add command catalog with 43 commands by category
- Add command principles (orchestration, validation)
- Week 7: Command documentation foundation"
```

---

## Task 44-86: Individual Command Documentation (Weeks 7-8)

**Template**: Similar to service docs, repeat for all 43 commands.

---

## Task 87: Systems Documentation (Week 9)

**Files:**
- Create: `docs/systems/README.md`
- Create: `docs/systems/party-system.md`
- Create: `docs/systems/spell-system.md`
- Create: `docs/systems/combat-system.md`
- ... (9 system deep-dives total)

**Step 1: Create systems index**

Create `docs/systems/README.md`:

```markdown
# System Deep-Dives

**Comprehensive documentation of major game systems.**

## Available Systems

1. [Party System](./party-system.md) - Party management, formation, membership
2. [Spell System](./spell-system.md) - Spell points, casting, learning
3. [Combat System](./combat-system.md) - Initiative, resolution, damage
4. [Character Creation System](./character-creation-system.md) - Creation flow
5. [First-Person Rendering](./first-person-rendering.md) - 3D view calculation
6. [Automap System](./automap-system.md) - Blueprint map rendering
7. [Town System](./town-system.md) - Services (inn, temple, shop)
8. [Event Sourcing](./event-sourcing.md) - Replay & persistence
9. [Dungeon System](./dungeon-system.md) - Maps, encounters, tiles

## What Are System Docs?

System docs provide **comprehensive overviews** of major game systems, connecting multiple services, commands, and game mechanics.

**Use system docs to**:
- Understand how components work together
- See the big picture of a game feature
- Learn design decisions and tradeoffs
- Find entry points for implementation

**Use service/command docs to**:
- Get API reference for specific functions
- See code examples
- Understand single-responsibility components
```

**Step 2: Create example system doc**

Create `docs/systems/spell-system.md`:

```markdown
# Spell System

**Comprehensive overview of spell points, casting, and learning.**

## Overview

Wizardry 1 uses **spell points** (not D&D memorized slots).

**Key Concepts**:
- Separate point pools per spell level (1-7)
- Each spell costs 1 point from its level
- Mage and Priest have separate pools
- Points restore at inn
- Spells learned on level-up (chance = (INT or PIE) / 30)

## Architecture

**Services Involved**:
- `SpellService` - Point management, validation
- `SpellCastingService` - Spell resolution
- `SpellLearningService` - Learn new spells
- `CharacterService` - Spell point allocation

**Commands Involved**:
- `CastSpellCommand` (combat)
- `CastUtilitySpellCommand` (dungeon/town)
- `LearnSpellCommand` (level-up)
- `RestAtInnCommand` (restore points)

**Data**:
- `spells.json` - All spell definitions
- `Character.spellPoints: Map<number, number>` - Points per level
- `Character.spellBook: Set<string>` - Learned spells

## Spell Point Pools

Each character has 7 mage pools + 7 priest pools (if applicable):

```typescript
interface Character {
  mageSpellPoints: Map<number, number>  // Level → Points
  priestSpellPoints: Map<number, number> // Level → Points
  // Example: Map { 1 → 3, 2 → 2, 3 → 1 } = 3 L1, 2 L2, 1 L3 points
}
```

**Pool Size Formula** (validated from Wizardry 1):
```
Points[level] = max(
  spellsLearned[level],
  1 + firstSpellLevel - currentCharLevel,
  cap at 9
)
```

## Spell Casting Flow

**In Combat**:
1. Player selects character + spell
2. `CastSpellCommand.execute()`
3. Command validates:
   - Character has spell in spell book
   - Character has ≥1 point in spell's level
   - Spell can target selected target type
4. Command calls `SpellCastingService.cast()`
5. Service deducts 1 point from appropriate pool
6. Service applies spell effect
7. Returns new state + combat result

**In Dungeon**:
- Same flow via `CastUtilitySpellCommand`
- Only non-combat spells allowed (DUMAPIC, MILWA, MALOR, etc.)

## Spell Learning Flow

**On Level-Up**:
1. Character levels up (via `LevelUpCharacterCommand`)
2. For each spell level character can access:
   - Roll d100 for each unlearned spell
   - If roll ≤ (INT or PIE) / 30, learn spell
3. Update character's spell book
4. Recalculate spell point pools

**Example**:
- Mage (INT 15) levels to 3
- Can now learn Level 2 spells
- Learn chance = 15/30 = 50% per spell
- Rolls for DILTO (45, success), MELITO (67, fail), SOPIC (23, success)
- Learns DILTO and SOPIC
- Can retry MELITO on next level-up

## Spell Categories

**Mage Spells** (7 levels, ~35 spells):
- Offensive (HALITO, MAHALITO, TILTOWAIT)
- Utility (DUMAPIC, MALOR, HAMAN)
- Debuffs (KATINO, MORLIS)

**Priest Spells** (7 levels, ~30 spells):
- Healing (DIOS, DIAL)
- Buffs (KALKI, PORFIC, BAMATU)
- Offensive (BADIOS, BADIAL)
- Utility (MILWA, LATUMAPIC, LOKTOFEIT)
- Resurrection (DI, KADORTO)

See [Spell Reference](../research/spell-reference.md) for complete spell list.

## Spell Targeting

**Target Types**:
- Single ally
- All allies (party)
- Single enemy
- Enemy group
- All enemy groups
- Self only
- Location (MALOR)

**Validation**: `SpellCastingService.validateTarget()` checks spell can target selected target.

## Spell Failure

**Most spells never fail** (validated against Wizardry 1).

**Exceptions**:
- LOKTOFEIT (recall to town): Level × 2% success rate
- DI (resurrect): ~90% success, 10% → ashes
- KADORTO (raise ashes): ~50% success, 50% → lost forever

## Related Documentation

**Services**:
- [SpellService](../services/SpellService.md)
- [SpellCastingService](../services/SpellCastingService.md)
- [SpellLearningService](../services/SpellLearningService.md)

**Commands**:
- [CastSpellCommand](../commands/CastSpellCommand.md)
- [LearnSpellCommand](../commands/LearnSpellCommand.md)

**Game Design**:
- [Spells Game Design](../game-design/04-spells.md)

**Research**:
- [Spell Reference](../research/spell-reference.md) - All 65+ spells
- [Combat Formulas](../research/combat-formulas.md) - Spell learning formula
```

**Step 3: Verify system doc**

Run: `grep "^## " docs/systems/spell-system.md`
Expected: 9-10 sections listed

**Step 4: Commit system documentation**

```bash
git add docs/systems/README.md docs/systems/spell-system.md
git commit -m "docs(systems): add spell system deep-dive

- Document spell points architecture (not D&D slots)
- Add spell casting and learning flows
- Document spell point formula from research
- Week 9: System documentation (1/9)"
```

**Repeat for remaining 8 systems over Week 9**

---

## Task 88: Game Design Documentation (Week 10)

**Files:**
- Create: `docs/game-design/README.md`
- Create 12 game design docs (01-overview.md through 12-controls.md)

**Step 1: Create game design index**

Create `docs/game-design/README.md`:

```markdown
# Game Design Documentation

**Player-facing game mechanics and systems.**

## Game Design Docs

1. [Overview](./01-overview.md) - Game overview & victory condition
2. [Character Creation](./02-character-creation.md) - Races, stats, classes
3. [Party Formation](./03-party-formation.md) - Party composition
4. [Spells](./04-spells.md) - All spells & spell system
5. [Combat](./05-combat.md) - Combat mechanics
6. [Dungeon](./06-dungeon.md) - Dungeon structure & exploration
7. [Town](./07-town.md) - Town services
8. [Progression](./08-progression.md) - Leveling & class change
9. [Death & Recovery](./09-death-recovery.md) - Body recovery system
10. [Monsters](./10-monsters.md) - Monster reference
11. [Items & Equipment](./11-items-equipment.md) - Equipment reference
12. [Controls](./12-controls.md) - Keyboard/mouse controls

## Purpose

Game design docs are **player-focused**, describing what the game does (not how it's implemented).

**Use these docs to**:
- Understand game mechanics
- Design UI/UX
- Write player-facing help text
- Validate against original Wizardry 1
```

**Step 2: Create example game design doc**

Create `docs/game-design/02-character-creation.md`:

```markdown
# Character Creation

**How players create characters in Wizardry 1 remake.**

## Creation Flow

1. Enter character name
2. Select race (5 options)
3. Roll bonus points (7-29 range)
4. Allocate bonus points to stats
5. Select alignment (Good/Neutral/Evil)
6. Select class (based on stats + alignment)
7. Confirm character

## Races

### Human
**Base Stats**: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9
**Total**: 46
**Best For**: Balanced builds, any class
**Notes**: Most versatile race

### Elf
**Base Stats**: STR 7, INT 10, PIE 10, VIT 6, AGI 9, LUC 6
**Total**: 48
**Best For**: Mage, Priest, Bishop (spellcasters)
**Notes**: High mental stats, fragile (low VIT)

### Dwarf
**Base Stats**: STR 10, INT 7, PIE 10, VIT 10, AGI 5, LUC 6
**Total**: 48
**Best For**: Fighter, Priest, Lord (with good roll)
**Notes**: Toughest race (VIT 10), slowest (AGI 5)

### Gnome
**Base Stats**: STR 7, INT 7, PIE 10, VIT 8, AGI 10, LUC 7
**Total**: 49
**Best For**: Thief, Priest, balanced builds
**Notes**: Highest total stats, most balanced

### Hobbit
**Base Stats**: STR 5, INT 7, PIE 7, VIT 6, AGI 10, LUC 15
**Total**: 50
**Best For**: Thief, Lord (high LUC helps)
**Notes**: Luckiest race by far (LUC 15), weak (low STR/VIT)

## Bonus Point Roll

**Formula**: `1d4 + 6`, then 1/11 chance `+10`, then 1/11 chance `+10` if <20

**Distribution**:
- 7-10 points: 90.0% (most common)
- 17-20 points: 9.25% (lucky roll)
- 27-29 points: 0.75% (very rare)

**Can Reroll**: Yes, unlimited times (but each roll creates new character)

**Strategy**:
- Basic classes need 7-10 points
- Elite classes need 15-25 points
- Ninja needs 27-29 points (perfect roll)

## Stats

**Six Stats**:
- **STR** (Strength): Melee damage, carrying capacity
- **INT** (Intelligence): Mage spell learning, spell points
- **PIE** (Piety): Priest spell learning, spell points
- **VIT** (Vitality): HP, resurrection success
- **AGI** (Agility): Initiative, AC, thievery
- **LUC** (Luck): Fortune, saving throws

**Range**: 3-18 base, higher with bonuses

## Classes

### Basic Classes

**Fighter**: STR ≥ 11, any alignment
- All weapons/armor
- Most HP
- Multiple attacks at high level

**Mage**: INT ≥ 11, any alignment
- Mage spells (1-7)
- Dagger/staff only, no armor
- Low HP

**Priest**: PIE ≥ 11, not neutral (Good or Evil)
- Priest spells (1-7)
- Blunt weapons only, no helmets
- Healing & buffs

**Thief**: AGI ≥ 11, not good (Neutral or Evil)
- Disarm traps, open locks
- Daggers/short swords, leather armor
- Essential for dungeon safety

### Elite Classes

**Bishop**: INT ≥ 12, PIE ≥ 12, any alignment
- Both Mage AND Priest spells
- Identify items
- Learns spells slowly (tradeoff)

**Samurai**: STR ≥ 15, VIT ≥ 14, INT ≥ 11, PIE ≥ 10, AGI ≥ 10, not evil
- Fights like Fighter
- Casts Mage spells (1-6)
- All weapons/armor

**Lord**: STR ≥ 15, VIT ≥ 15, INT ≥ 12, PIE ≥ 12, AGI ≥ 14, LUC ≥ 15, good only
- Fights like Fighter
- Casts Priest spells (1-6)
- All weapons/armor
- Hardest to create (needs all stats high)

**Ninja**: STR ≥ 17, VIT ≥ 17, INT ≥ 17, PIE ≥ 17, AGI ≥ 17, LUC ≥ 17, evil only
- Best AC unarmored
- Decapitate (instant kill)
- 2 base attacks (most in game)
- Requires near-perfect roll (27-29 points)

## Alignment

**Good**: Can be Lord, cannot be Thief/Ninja
**Neutral**: Can be most classes, cannot be Priest/Lord/Ninja
**Evil**: Can be Priest/Ninja, cannot be Lord

**Restrictions**: Some items require specific alignments

## Starting Age

**Range**: 14-16 years

**Impact**: Younger = better stat gains on level-up (formula: 130 - age)

## Related

- [Race Stats Reference](../research/race-stats.md) - Detailed racial analysis
- [Class Reference](../research/class-reference.md) - All class details
- [Combat Formulas](../research/combat-formulas.md) - Bonus roll formula
```

**Step 3: Verify game design doc**

Run: `grep "^## " docs/game-design/02-character-creation.md`
Expected: 7-8 sections

**Step 4: Commit game design documentation**

```bash
git add docs/game-design/README.md docs/game-design/02-character-creation.md
git commit -m "docs(game-design): add character creation guide

- Document all 5 races with base stats
- Document all 8 classes with requirements
- Add bonus point roll distribution
- Week 10: Game design docs (1/12)"
```

**Repeat for remaining 11 game design docs**

---

## Task 89: Testing Strategy Documentation (Week 11)

**Files:**
- Create: `docs/testing-strategy.md`
- Create: `docs/ARCHITECTURAL_REVIEW.md`

**Step 1: Create testing strategy**

Create `docs/testing-strategy.md`:

```markdown
# Testing Strategy

**Comprehensive testing approach for Wizardry remake.**

## Testing Philosophy

**TDD (Test-Driven Development)**: Write tests first, then implementation

**No Mocks for Services**: Services are pure functions, test with real data

**Minimal Mocks for Commands**: Only mock external dependencies (IndexedDB, Canvas)

## Testing Layers

### Service Layer Testing

**Approach**: Pure function testing, no mocks needed

**Example**:
```typescript
describe('PartyService', () => {
  describe('addMember', () => {
    it('adds character to empty party', () => {
      const party = createEmptyParty()
      const character = createTestCharacter()

      const result = PartyService.addMember(party, character)

      expect(result.members).toHaveLength(1)
      expect(result.members[0]).toBe(character)
    })

    it('throws when party is full', () => {
      const party = createFullParty() // 6 members
      const character = createTestCharacter()

      expect(() => PartyService.addMember(party, character))
        .toThrow(PartyFullError)
    })
  })
})
```

**Key Practices**:
- Test happy path first
- Test error cases second
- Test edge cases (empty, full, boundary values)
- Use factory functions for test data

### Command Layer Testing

**Approach**: Test orchestration logic, mock only external I/O

**Example**:
```typescript
describe('RestAtInnCommand', () => {
  it('restores HP and spell points', () => {
    const state = createGameState({
      party: createPartyWithDamagedMembers()
    })
    const command = new RestAtInnCommand()

    const result = command.execute(state)

    expect(result.party.members.every(m => m.hp === m.maxHP)).toBe(true)
    expect(result.party.members.every(m => hasFullSpellPoints(m))).toBe(true)
  })

  it('ages characters', () => {
    const state = createGameState()
    const initialAge = state.party.members[0].age

    const result = new RestAtInnCommand().execute(state)

    expect(result.party.members[0].age).toBeGreaterThan(initialAge)
  })
})
```

### Integration Testing

**Approach**: Test multiple layers together

**Example**:
```typescript
describe('Combat Integration', () => {
  it('resolves complete combat round', () => {
    const state = createCombatState()

    // Input phase
    const withInput = new AttackCommand(0, 0).execute(state) // char 0 attacks group 0

    // Initiative phase (automatic)
    const initiative = CombatService.calculateInitiative(withInput)

    // Resolution phase
    const result = CombatService.resolveRound(initiative)

    expect(result.combatLog).toContainEntry('attack')
    expect(result.enemies[0].hp).toBeLessThan(initialHP)
  })
})
```

## Test Organization

```
tests/
├── services/
│   ├── PartyService.test.ts
│   ├── CombatService.test.ts
│   └── ... (one file per service)
├── commands/
│   ├── MoveForwardCommand.test.ts
│   └── ... (one file per command)
├── integration/
│   ├── combat-integration.test.ts
│   ├── spell-casting-integration.test.ts
│   └── ...
└── helpers/
    ├── test-factories.ts  # createTestCharacter(), etc.
    └── test-assertions.ts # custom matchers
```

## Test Data Factories

**Create factory functions for common test data**:

```typescript
// tests/helpers/test-factories.ts

export function createTestCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 'test-char-1',
    name: 'Test Fighter',
    race: 'Human',
    class: 'Fighter',
    stats: { str: 15, int: 10, pie: 10, vit: 12, agi: 10, luc: 10 },
    hp: 20,
    maxHP: 20,
    spellPoints: new Map(),
    ...overrides
  }
}

export function createEmptyParty(): Party {
  return {
    members: [],
    formation: { frontRow: [], backRow: [] },
    position: { x: 0, y: 0, level: 1 },
    facing: 'north',
    gold: 0
  }
}
```

## Coverage Goals

**Minimum Coverage**: 80% for all services and commands

**Critical Paths**: 100% coverage
- Combat resolution
- Spell casting
- Character death/resurrection
- Level-up stat changes
- Party movement

## Running Tests

```bash
# Run all tests
npm test

# Run specific service tests
npm test -- PartyService

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Testing Checklist

Before committing:
- [ ] All tests pass
- [ ] New code has tests (TDD)
- [ ] Coverage ≥80% for new code
- [ ] No console.log in tests
- [ ] Test names describe behavior
- [ ] Edge cases tested

## Related

- [Service Testing Guide](./services/testing-guide.md)
- [Command Testing Guide](./commands/testing-guide.md)
```

**Step 2: Verify testing strategy**

Run: `wc -l docs/testing-strategy.md`
Expected: 200+ lines

**Step 3: Commit testing documentation**

```bash
git add docs/testing-strategy.md
git commit -m "docs: add comprehensive testing strategy

- Document TDD approach (write tests first)
- Add service testing (pure functions, no mocks)
- Add command testing (orchestration logic)
- Document test organization and coverage goals
- Week 11: Testing strategy complete"
```

---

## Task 90: Data Format Specifications (Week 11)

**Files:**
- Create: `docs/data-format/README.md`
- Create: `docs/data-format/spells-json.md`
- Create: `docs/data-format/monsters-json.md`
- Create: `docs/data-format/maps-json.md`
- Create: `docs/data-format/items-json.md`
- Create: `docs/data-format/save-format.md`

**Step 1: Create data format index**

Create `docs/data-format/README.md`:

```markdown
# Data Format Specifications

**JSON data file formats for game data.**

## Data Files

1. [spells.json](./spells-json.md) - All spells (65+)
2. [monsters.json](./monsters-json.md) - All monsters (96)
3. [maps.json](./maps-json.md) - All dungeon maps (10 levels)
4. [items.json](./items-json.md) - All items (80+)
5. [save-format.json](./save-format.md) - IndexedDB save format

## Purpose

Data files separate game content from code.

**Benefits**:
- Easy to modify without code changes
- Can be loaded dynamically
- Supports modding
- Validated against source data
```

**Step 2: Create spells JSON spec**

Create `docs/data-format/spells-json.md`:

```markdown
# spells.json Format

**Spell data file specification.**

## File Location

`src/data/spells.json`

## Format

```json
{
  "mage": {
    "1": [
      {
        "id": "dumapic",
        "name": "DUMAPIC",
        "level": 1,
        "type": "utility",
        "target": "self",
        "effect": "show_coordinates",
        "description": "Shows current coordinates and facing direction",
        "castableIn": ["dungeon", "combat"]
      },
      {
        "id": "halito",
        "name": "HALITO",
        "level": 1,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "1d8",
        "damageType": "fire",
        "description": "1d8 fire damage to enemy group",
        "castableIn": ["combat"]
      }
    ],
    "2": [...],
    ...
    "7": [...]
  },
  "priest": {
    "1": [
      {
        "id": "dios",
        "name": "DIOS",
        "level": 1,
        "type": "healing",
        "target": "single_ally",
        "healing": "1d8",
        "description": "Restores 1d8 HP to target",
        "castableIn": ["combat", "dungeon", "town"]
      }
    ],
    ...
  }
}
```

## Field Definitions

**id**: Unique spell identifier (lowercase)
**name**: Display name (uppercase, traditional)
**level**: Spell level (1-7)
**type**: "offensive", "healing", "utility", "buff", "debuff"
**target**: "self", "single_ally", "party", "single_enemy", "enemy_group", "all_enemies", "location"
**damage** (optional): Damage dice (e.g. "1d8", "4d6")
**damageType** (optional): "fire", "cold", "holy", "magic"
**healing** (optional): Healing dice (e.g. "1d8")
**effect** (optional): Special effect identifier
**description**: Human-readable description
**castableIn**: Array of contexts ["combat", "dungeon", "town"]

## Validation

See [Spell Reference](../research/spell-reference.md) for validated spell data.

All spells cross-referenced against original Wizardry 1 sources.
```

**Step 3: Verify data format specs**

Run: `ls docs/data-format/`
Expected: README.md, spells-json.md (and others as created)

**Step 4: Commit data format documentation**

```bash
git add docs/data-format/
git commit -m "docs: add data format specifications

- Add spells.json format with complete field definitions
- Document all JSON data file formats
- Week 11: Data format specs complete"
```

---

## Task 91: Final Review & Quality Assurance (Week 12)

**Files:**
- Update: `docs/README.md` (verify all links work)
- Create: `docs/contributing.md`

**Step 1: Review all documentation links**

Run: `grep -r "\.md)" docs/ | grep -v ".git"`
Expected: List of all markdown links

**Step 2: Verify all links resolve**

For each link, verify file exists:
```bash
# Example check
test -f docs/services/PartyService.md && echo "EXISTS" || echo "MISSING"
```

**Step 3: Create contributing guide**

Create `docs/contributing.md`:

```markdown
# Contributing Guide

**Standards and patterns for Wizardry remake development.**

## Documentation Standards

**Format**: Markdown with Mermaid.js for diagrams

**Structure**:
- Use ## for major sections
- Use ### for subsections
- Include code examples
- Link to related docs

**Code Examples**:
```typescript
// Always use TypeScript syntax
// Include complete, runnable examples
function example(): ReturnType {
  return result
}
```

## Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Test additions/changes
- `refactor`: Code refactor
- `chore`: Tooling, dependencies

**Examples**:
```
docs(services): add PartyService documentation
feat(combat): implement initiative system
test(spells): add spell casting tests
```

## Pull Request Process

1. Create feature branch from `main`
2. Write documentation first (if new feature)
3. Write failing tests (TDD)
4. Implement minimal code to pass tests
5. Commit frequently (small commits)
6. Open PR with description
7. Request review

## Code Review Checklist

See [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) for detailed checklist.
```

**Step 4: Commit final documentation**

```bash
git add docs/contributing.md docs/README.md
git commit -m "docs: add contributing guide and final review

- Add contribution standards and patterns
- Add commit message format
- Add PR process
- Week 12: Documentation complete, ready for implementation"
```

---

## Handoff Prompt for New Context/Agent

**Save this prompt for starting fresh context:**

```markdown
# Wizardry 1 Remake - Context Handoff

## Project Overview

I'm building a faithful remake of Wizardry: Proving Grounds of the Mad Overlord (1981) with modernized UI.

**Goal**: Complete game matching original Wizardry 1 (all 10 levels, all mechanics)
**Technology**: TypeScript + Vite, web browser target, IndexedDB saves
**Architecture**: Party-first (not adapted from roguelike), 4-layer architecture
**Status**: Week 1 research COMPLETE (68% validated, 100% accuracy), Documentation phase ready to begin

## What's Been Completed

### Week 1: Research & Validation ✅
- **Validation Coverage**: 68% of design validated (71/105 items)
- **Accuracy**: 100% (0 errors, 3 design corrections applied)
- **Reference Docs**: 7 comprehensive documents (3,682 lines)
  - `/docs/research/race-stats.md` - 5 races, base stats
  - `/docs/research/class-reference.md` - 8 classes, requirements
  - `/docs/research/spell-reference.md` - 65+ spells, 14 levels
  - `/docs/research/monster-reference.md` - 96 monsters, 17 bosses
  - `/docs/research/combat-formulas.md` - All formulas validated
  - `/docs/research/equipment-reference.md` - 80+ items
  - `/docs/research/dungeon-maps-reference.md` - 10 levels (partial)

### Key Research Findings
1. **Spell Points**: Wizardry uses spell POINTS (not D&D slots)
2. **Hobbit LUC**: Base 15 (not 12), makes them Lord-optimal
3. **Ninja Requirements**: ALL 6 stats at 17 (not just 4)
4. **Combat Initiative**: `random(0-9) + AGI_modifier`
5. **Level-Up Stats**: `75% chance per stat, (130-age)% to increase`

## Current Task

**Begin Weeks 2-11: Documentation Phase**

Use the implementation plan at `/docs/plans/2025-10-25-documentation-implementation-plan.md` to create comprehensive documentation before any coding.

**Immediate Next Steps**:
1. Task 1: Documentation Hub Setup (Week 2, Day 1)
   - Create `docs/README.md` navigation hub
   - Create `docs/architecture.md` overview
   - Create `docs/getting-started.md` quick start

2. Task 2: Diagram Structure (Week 2, Day 1)
   - Create Mermaid.js diagrams for architecture

3. Continue with remaining tasks per plan

## Key Files to Reference

**Planning**:
- `/docs/plans/2025-10-25-wizardry-remake-design.md` - 93-page complete design (VALIDATED)
- `/docs/plans/2025-10-25-validation-and-documentation-plan.md` - 12-week plan
- `/docs/plans/2025-10-25-documentation-implementation-plan.md` - Bite-sized tasks

**Research**:
- `/docs/research/week1-research-summary.md` - Complete Week 1 report
- `/docs/research/source-materials.md` - 60 URLs, 15 used, 45 remaining
- `/docs/research/design-validation-matrix.md` - 71 validated items

## Architecture Principles

1. **Party-First**: Party is core entity (not individual characters)
2. **Event Sourcing**: All actions create events, state from replay
3. **Pure Services**: Service layer = pure functions, no side effects
4. **Modal States**: TOWN ↔ NAVIGATION ↔ COMBAT (explicit transitions)
5. **Immutable State**: All updates create new state (no mutations)

## Documentation Approach

**TDD for Documentation**: Write docs before code
**Bite-Sized Tasks**: Each step 2-5 minutes
**Frequent Commits**: Commit after each task completion
**Quality First**: Match or exceed existing roguelike docs quality

## How to Proceed

**Option 1: Use Executing-Plans Skill**
```
I have a detailed implementation plan ready. Use superpowers:executing-plans to execute it task-by-task with review checkpoints.
```

**Option 2: Continue Manual Execution**
```
Start with Task 1 in /docs/plans/2025-10-25-documentation-implementation-plan.md. I'll guide you through each step.
```

**Questions to Ask**:
- Have you reviewed the validation summary? (`/docs/research/week1-research-summary.md`)
- Have you read the complete design? (`/docs/plans/2025-10-25-wizardry-remake-design.md`)
- Are you ready to begin documentation (no coding yet)?

## Success Criteria

Before moving to implementation:
- ✅ 40+ service docs created
- ✅ 40+ command docs created
- ✅ 9 system deep-dives complete
- ✅ 12 game design docs complete
- ✅ 8 Mermaid diagrams created
- ✅ All links verified
- ✅ Documentation reviewed for quality

**Timeline**: Weeks 2-11 (10 weeks of documentation)
**Current Week**: Week 2 (just starting)

## Ready to Start?

Use the implementation plan and follow the bite-sized tasks. Ask if you need clarification on any aspect of the design or research.
```

---

## Completion

**Plan Status**: COMPLETE

**Total Tasks**: 91 comprehensive tasks covering 10 weeks of documentation work

**Output**: `docs/plans/2025-10-25-documentation-implementation-plan.md`

**Handoff Prompt**: Included above (save for new context/agent)

**Execution Options**:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration using superpowers:subagent-driven-development

2. **Parallel Session (separate)** - Open new session in current directory, paste handoff prompt, use superpowers:executing-plans for batch execution with checkpoints

**Which approach would you like?**
