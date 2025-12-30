# Data Model Diagram

**Visual representation of entity relationships.**

## Description

The data model uses immutable entities with clear ownership and relationships:

- **GameState**: Root entity containing all game data
- **Character Roster**: Map of all created characters (0-20)
- **Active Party**: Current adventuring party (1-6 characters)
- **Equipment & Inventory**: Character-owned items
- **Dungeon State**: Current level, position, exploration

All entities are immutable; updates create new instances.

## Entity Relationship Diagram

```mermaid
erDiagram
    GameState ||--|| GameMode : has
    GameState ||--|| CharacterRoster : contains
    GameState ||--|| Party : "has active"
    GameState ||--|| DungeonState : contains
    GameState ||--o{ Event : logs

    CharacterRoster ||--o{ Character : "stores 0-20"

    Party ||--o{ Character : "has 1-6 active"
    Party ||--|| Formation : organizes
    Party ||--|| Position : "located at"
    Party ||--|| Direction : facing

    Formation ||--o{ Character : "front row (0-3)"
    Formation ||--o{ Character : "back row (0-3)"

    Character ||--|| Race : has
    Character ||--|| Class : has
    Character ||--|| Stats : has
    Character ||--|| Equipment : wears
    Character ||--|| SpellBook : knows
    Character ||--o{ StatusEffect : "affected by"
    Character ||--|| Inventory : carries

    Equipment ||--o{ Item : "8 slots"
    SpellBook ||--o{ Spell : "learned spells"
    Inventory ||--o{ Item : "max 8 items"

    Stats ||--|| Attributes : "STR/INT/PIE/VIT/AGI/LUC"
    Stats ||--|| DerivedStats : "HP/AC/Level/XP"

    DungeonState ||--|| Level : "current floor"
    DungeonState ||--|| Automap : explored
    DungeonState ||--o{ Encounter : "active combat"

    Encounter ||--o{ MonsterGroup : "1-4 groups"
    MonsterGroup ||--o{ Monster : "1-N monsters"

    GameState {
        string mode "TOWN/NAVIGATION/COMBAT/etc"
        Map characterRoster "all characters"
        Party activeParty "current party"
        DungeonState dungeon "dungeon data"
        Event[] eventLog "action history"
        number timestamp "game time"
    }

    CharacterRoster {
        Map characters "id -> Character"
        number maxCharacters "20 max"
    }

    Party {
        Character[] members "1-6 characters"
        Formation formation "front/back rows"
        Position position "x, y, level"
        Direction facing "N/S/E/W"
        number gold "shared gold"
    }

    Formation {
        Character[] frontRow "0-3 characters"
        Character[] backRow "0-3 characters"
    }

    Character {
        string id "unique ID"
        string name "character name"
        Race race "race type"
        Class class "character class"
        Stats stats "attributes + derived"
        Equipment equipment "worn items"
        SpellBook spellBook "known spells"
        Inventory inventory "carried items"
        StatusEffect[] status "active effects"
        number age "current age"
        number vim "vitality"
    }

    Race {
        string name "Human/Elf/Dwarf/etc"
        Attributes modifiers "stat bonuses"
        Class[] allowedClasses "class restrictions"
    }

    Class {
        string name "Fighter/Mage/etc"
        number hitDice "HP per level"
        number xpModifier "XP requirements"
        boolean canCastMage "mage spells?"
        boolean canCastPriest "priest spells?"
        number attacksPerLevel "attacks formula"
    }

    Stats {
        number strength "3-18+"
        number intelligence "3-18+"
        number piety "3-18+"
        number vitality "3-18+"
        number agility "3-18+"
        number luck "3-18+"
        number hp "current HP"
        number maxHP "maximum HP"
        number level "character level"
        number xp "experience points"
        number ac "armor class"
    }

    Equipment {
        Item weapon "main hand"
        Item shield "off hand"
        Item armor "body"
        Item helmet "head"
        Item gauntlet "hands"
        Item boots "feet"
        Item cloak "back"
        Item accessory "special"
    }

    SpellBook {
        Map mageSpells "level -> Spell[]"
        Map priestSpells "level -> Spell[]"
        Map spellPoints "level -> current points"
        Map maxSpellPoints "level -> max points"
    }

    Inventory {
        Item[] items "max 8 items"
        number maxWeight "carrying capacity"
        number currentWeight "total weight"
    }

    StatusEffect {
        string type "POISON/PARALYZE/etc"
        number duration "rounds remaining"
        number intensity "effect strength"
    }

    DungeonState {
        number currentLevel "floor number 1-10"
        Position position "current x,y"
        Automap automap "explored tiles"
        Encounter activeEncounter "current combat"
        Body[] bodies "dead characters"
    }

    Encounter {
        MonsterGroup[] groups "1-4 groups"
        number round "current round"
        boolean canFlee "flee allowed?"
        number surpriseRound "who surprised?"
    }

    MonsterGroup {
        Monster[] monsters "group members"
        string groupId "A/B/C/D"
        boolean identified "stats known?"
    }

    Monster {
        string name "monster type"
        number hp "current HP"
        number ac "armor class"
        number[] attackDice "damage dice"
        string[] abilities "special abilities"
        number xpValue "XP reward"
    }

    Event {
        string type "event type"
        number timestamp "when occurred"
        object data "event payload"
    }
```

## Core Entity Details

### GameState (Root Entity)

**Purpose**: Root of all game data; single source of truth

**Relationships**:
- Has one GameMode (TOWN, NAVIGATION, COMBAT, etc.)
- Contains one CharacterRoster (all characters)
- Has one active Party (current adventuring party)
- Contains one DungeonState (dungeon data)
- Logs many Events (action history)

**Immutability**: Every game action returns new GameState

### Character Roster

**Purpose**: Storage for all created characters

**Relationships**:
- Stores 0-20 characters in a Map (id → Character)
- Characters can be in/out of active party
- Dead characters remain in roster (until deleted)

**Key Operations**:
- Add character (character creation)
- Remove character (permanent death)
- Get character (by ID)

### Active Party

**Purpose**: Current adventuring party (1-6 characters)

**Relationships**:
- Has 1-6 Character references (from roster)
- Has one Formation (front/back rows)
- Has one Position (dungeon location)
- Has one Direction (facing N/S/E/W)
- Owns shared gold pool

**Constraints**:
- Min 1 character (can't have empty party)
- Max 6 characters
- All characters must exist in roster

### Formation

**Purpose**: Organize party into combat rows

**Relationships**:
- Front row: 0-3 characters
- Back row: 0-3 characters
- Total: 1-6 characters across both rows

**Combat Impact**:
- Front row: Can melee attack, takes melee hits
- Back row: Can't melee, protected from melee, can cast/ranged

### Character

**Purpose**: Individual character entity

**Relationships**:
- Has one Race (Human, Elf, Dwarf, etc.)
- Has one Class (Fighter, Mage, Priest, etc.)
- Has one Stats object (attributes + derived)
- Wears one Equipment set (8 slots)
- Knows one SpellBook (learned spells + points)
- Carries one Inventory (items)
- Has 0-N StatusEffects (poison, paralysis, etc.)

**Immutability**: Character updates return new Character instance

### Stats

**Attributes** (3-18+):
- STR (Strength): Melee damage, hit chance
- INT (Intelligence): Mage spell learning
- PIE (Piety): Priest spell learning
- VIT (Vitality): HP per level
- AGI (Agility): Initiative, AC
- LUC (Luck): Critical hits, chest outcomes

**Derived Stats**:
- HP: Current hit points
- Max HP: Maximum hit points
- Level: Character level (1-13+)
- XP: Experience points
- AC: Armor class (lower = better)

### Equipment

**8 Slots**:
1. Weapon (main hand)
2. Shield (off hand)
3. Armor (body)
4. Helmet (head)
5. Gauntlet (hands)
6. Boots (feet)
7. Cloak (back)
8. Accessory (special)

**Properties**:
- Each slot can be empty or hold one item
- Items have class/race/alignment restrictions
- Items provide AC bonus, stat bonuses, special abilities

### SpellBook

**Structure**:
- Mage spells: 7 levels, each with 0-N learned spells
- Priest spells: 7 levels, each with 0-N learned spells
- Spell points: Current points per level (0-9)
- Max spell points: Maximum points per level (0-9)

**Learning**:
- New spells learned on level-up (random chance)
- Bishop can learn both mage and priest spells

### Inventory

**Capacity**:
- Max 8 items
- Weight limit based on STR
- Items can be quest items, consumables, equipment

### Status Effects

**Common Effects**:
- POISON: Damage over time
- PARALYZE: Can't act
- SLEEP: Auto-hit by attacks
- PETRIFY: Turned to stone
- SILENCE: Can't cast spells
- LEVEL_DRAIN: Permanent level loss

**Properties**:
- Duration: Rounds remaining (-1 = permanent)
- Intensity: Effect strength
- Type: Effect identifier

### Dungeon State

**Components**:
- Current level (floor 1-10)
- Position (x, y coordinates)
- Automap (explored tiles)
- Active encounter (current combat)
- Bodies (dead characters to recover)

### Encounter

**Combat Data**:
- 1-4 monster groups (A, B, C, D)
- Round counter
- Flee allowed flag
- Surprise round indicator

### Monster Group

**Group Structure**:
- Group ID (A, B, C, D)
- 1-N monsters of same type
- Identified flag (stats revealed?)

### Monster

**Monster Stats**:
- Name (type)
- HP (current)
- AC (armor class)
- Attack dice (damage)
- Special abilities (breath, drain, etc.)
- XP value (reward)

## Data Flow Patterns

### Immutable Updates

All updates create new objects:
```typescript
// Update character HP
const updatedChar = {
  ...character,
  stats: {
    ...character.stats,
    hp: newHP
  }
}

// Update state with new character
const newState = {
  ...state,
  roster: new Map(state.roster).set(character.id, updatedChar)
}
```

### Event Sourcing

All actions create events:
```typescript
const event = {
  type: 'MOVE_FORWARD',
  timestamp: Date.now(),
  data: { from: oldPos, to: newPos }
}

const newState = {
  ...state,
  party: { ...state.party, position: newPos },
  eventLog: [...state.eventLog, event]
}
```

## Key Relationships

**1:1 Relationships**:
- GameState → Party (one active party)
- Party → Formation (one formation)
- Character → Stats (one stat block)
- Character → Equipment (one equipment set)

**1:N Relationships**:
- GameState → Events (many logged events)
- CharacterRoster → Character (0-20 characters)
- Party → Character (1-6 active characters)
- Equipment → Item (8 equipment slots)
- SpellBook → Spell (many learned spells)

**N:N Relationships**:
- None (simplified design)

## Storage Strategy

**In-Memory**:
- GameState (current game state)
- Character Roster (all characters)
- Active Party (current party)

**IndexedDB** (Persistence):
- Saved games (serialized GameState)
- Event log (replay data)
- Character archive (deleted characters)

**JSON Data Files** (Static):
- Spells (spell definitions)
- Monsters (monster stats)
- Items (item properties)
- Maps (dungeon layouts)
