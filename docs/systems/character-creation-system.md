# Character Creation System

**Comprehensive overview of character creation flow, races, classes, and stat allocation.**

## Overview

Character creation is the **entry point** to Wizardry 1. Players create characters at the Training Grounds before forming parties.

**Key Concepts**:
- Roster supports up to 20 characters (shared across all parties)
- Race determines base stats (5 races)
- Bonus points rolled randomly (7-29 range)
- Player allocates bonus points to stats
- Alignment affects class eligibility
- Class determined by final stats + alignment
- Elite classes require exceptional rolls

## Architecture

### Services Involved

- **CharacterCreationService** - Creation flow orchestration
- **CharacterService** - Character stat validation, class requirements
- **RaceService** - Racial stat bonuses, racial abilities
- **ClassService** - Class requirements, class abilities
- **ValidationService** - Stat validation, name validation
- **RandomService** - Bonus point rolls, age rolls (seeded for testing)

### Commands Involved

- **CreateCharacterCommand** - Main creation flow
- **RollBonusPointsCommand** - Roll bonus points
- **AllocateStatsCommand** - Distribute bonus points
- **SelectClassCommand** - Choose class from eligible
- **SaveCharacterCommand** - Save to roster
- **DeleteCharacterCommand** - Delete from roster

### Data Structures

```typescript
interface Character {
  id: string                        // Unique ID
  name: string                      // 1-15 characters
  race: Race                        // Human, Elf, Dwarf, Gnome, Hobbit
  class: CharacterClass             // Fighter, Mage, Priest, Thief, Bishop, Samurai, Lord, Ninja
  alignment: Alignment              // Good, Neutral, Evil

  // Base stats (3-18 range)
  stats: {
    str: number                     // Strength
    int: number                     // Intelligence
    pie: number                     // Piety
    vit: number                     // Vitality
    agi: number                     // Agility
    luc: number                     // Luck
  }

  // Derived stats
  hp: number                        // Hit points
  maxHP: number                     // Maximum HP
  ac: number                        // Armor class (10 base)
  age: number                       // 14-16 starting
  level: number                     // 1 starting
  xp: number                        // 0 starting

  // Spell data (if applicable)
  mageSpellPoints: Map<number, number>
  priestSpellPoints: Map<number, number>
  mageSpellBook: Set<string>
  priestSpellBook: Set<string>

  // Equipment
  equipment: Equipment
  inventory: Item[]

  // Status
  status: StatusEffect[]
}

type Race = 'Human' | 'Elf' | 'Dwarf' | 'Gnome' | 'Hobbit'
type CharacterClass = 'Fighter' | 'Mage' | 'Priest' | 'Thief' | 'Bishop' | 'Samurai' | 'Lord' | 'Ninja'
type Alignment = 'Good' | 'Neutral' | 'Evil'
```

## Creation Flow

### Step-by-Step Process

**Step 1: Enter Name**
- Input: 1-15 characters
- Validation: No duplicates in roster, alphanumeric only
- Can cancel and return to training grounds

**Step 2: Select Race**
- Options: Human, Elf, Dwarf, Gnome, Hobbit
- Display base stats for each race
- Player selects one

**Step 3: Roll Bonus Points**
- System rolls 1d4 + 6 (7-10 base)
- 1/11 chance +10 (17-20)
- 1/11 chance +10 again if <20 (27-29)
- Player can reroll unlimited times
- Display: "You have X bonus points"

**Step 4: Allocate Bonus Points**
- Display race base stats
- Player distributes bonus points to 6 stats
- Validation: All points allocated, stats 3-18 range
- Can go back and reroll

**Step 5: Select Alignment**
- Options: Good, Neutral, Evil
- Affects class eligibility
- Cannot change later (except via altar)

**Step 6: Select Class**
- Display eligible classes based on stats + alignment
- Show class requirements
- Player selects from eligible list
- If no eligible classes, return to stat allocation

**Step 7: Confirm Character**
- Display final character sheet
- Confirm or cancel (returns to step 1)
- On confirm: Save to roster

### Flow Diagram

```
Start
  ↓
Enter Name → [Cancel] → Training Grounds
  ↓
Select Race
  ↓
Roll Bonus Points ←──┐
  ↓                   │
  [Reroll?] ─────────┘
  ↓
Allocate Stats ←──────┐
  ↓                   │
  [Valid?] ──No──────┘
  ↓ Yes
Select Alignment
  ↓
Select Class ←────────┐
  ↓                   │
  [Eligible?] ──No───┘ (return to stats)
  ↓ Yes
Confirm Character
  ↓
  [Confirm?] ──No─→ Return to Name
  ↓ Yes
Save to Roster
  ↓
Training Grounds
```

## Races

### Human

**Base Stats**: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9
**Total**: 46

**Strengths**:
- Balanced (no extreme weaknesses)
- Slight luck bonus (LUC 9)
- Can qualify for any class with good roll

**Weaknesses**:
- Low PIE (5) makes Priest classes harder
- No standout high stats

**Best Classes**: Fighter, Mage, Thief, Samurai
**Recommended Builds**: Generalist, any role

### Elf

**Base Stats**: STR 7, INT 10, PIE 10, VIT 6, AGI 9, LUC 6
**Total**: 48

**Strengths**:
- High mental stats (INT 10, PIE 10)
- Best for spellcasters (Mage, Priest, Bishop)
- +2 total stats vs. Human

**Weaknesses**:
- Fragile (VIT 6)
- Low luck (LUC 6)
- Weak physically (STR 7)

**Best Classes**: Mage, Priest, Bishop
**Recommended Builds**: Pure spellcaster, back row support

### Dwarf

**Base Stats**: STR 10, INT 7, PIE 10, VIT 10, AGI 5, LUC 6
**Total**: 48

**Strengths**:
- Toughest race (VIT 10)
- Strong (STR 10)
- High piety (PIE 10) for Priest/Lord

**Weaknesses**:
- Slowest (AGI 5) - poor initiative
- Low luck (LUC 6)
- Low intelligence (INT 7)

**Best Classes**: Fighter, Priest, Lord (with excellent roll)
**Recommended Builds**: Front-line tank, support caster

### Gnome

**Base Stats**: STR 7, INT 7, PIE 10, VIT 8, AGI 10, LUC 7
**Total**: 49

**Strengths**:
- Highest total base stats (49)
- Fast (AGI 10) - best initiative
- High piety (PIE 10)
- Most balanced overall

**Weaknesses**:
- No standout high stats
- Average strength/vitality

**Best Classes**: Thief, Priest, Bishop, balanced builds
**Recommended Builds**: Versatile support, Thief

### Hobbit

**Base Stats**: STR 5, INT 7, PIE 7, VIT 6, AGI 10, LUC 15
**Total**: 50

**Strengths**:
- Luckiest race by far (LUC 15)
- Fast (AGI 10)
- Optimal for Lord (LUC 15 requirement)

**Weaknesses**:
- Weakest (STR 5)
- Fragile (VIT 6)
- Low mental stats (INT/PIE 7)

**Best Classes**: Thief, Lord (with excellent roll)
**Recommended Builds**: Thief specialist, lucky Lord

See [Race Stats Reference](../research/race-stats.md) for detailed analysis.

## Bonus Point Roll

### Roll Formula

**Validated from Wizardry 1**:
```typescript
function rollBonusPoints(): number {
  let points = random(1, 4) + 6  // 7-10 base

  // First bonus chance
  if (points < 20 && random(1, 11) === 1) {
    points += 10
  }

  // Second bonus chance
  if (points < 20 && random(1, 11) === 1) {
    points += 10
  }

  return points
}
```

### Distribution

| Points | Probability | Description |
|--------|-------------|-------------|
| 7-10 | 90.0% | Normal roll (most common) |
| 17-20 | 9.25% | Lucky roll (first +10 bonus) |
| 27-29 | 0.75% | Exceptional roll (both +10 bonuses) |

**Maximum**: 29 points (1d4 = 4, +6 = 10, +10, +10 = 30, but capped at 29)

### Rerolling Strategy

**Basic Classes** (Fighter, Mage, Priest, Thief):
- 7-10 points sufficient
- Can create immediately

**Elite Classes** (Bishop, Samurai):
- Need 15-20 points
- Reroll until lucky roll (9.25% chance)

**Lord**:
- Need 25-35 points (race dependent)
- Hobbit best (only needs ~25 points due to LUC 15)
- Expect 100-500 rerolls

**Ninja**:
- Need ALL stats at 17 (6 × 17 = 102 total)
- Hobbit optimal (base 50, need 52 bonus)
- Impossible with <27 points
- Expect 100-1000+ rerolls

## Stat Allocation

### Stat Ranges

**Minimum**: 3 (cannot go below, even with 0 bonus)
**Maximum**: 18 (hard cap, cannot exceed)

**Formula**:
```
FinalStat = BaseStat + AllocatedBonus
Clamped to [3, 18] range
```

### Allocation Strategy

**For Basic Classes**:
- Maximize primary stat (STR for Fighter, INT for Mage, etc.)
- Secondary stats as needed for survival (VIT for HP)
- Dump stats OK (leave low stats low)

**For Elite Classes**:
- Meet minimum requirements first
- Distribute remaining points for optimization
- All stats matter (can't dump)

**Example** (Human Fighter, 10 bonus points):
```
Base: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9
Allocate: +7 STR, +3 VIT
Final: STR 15, INT 8, PIE 5, VIT 11, AGI 8, LUC 9
```

**Example** (Hobbit Lord, 28 bonus points):
```
Base: STR 5, INT 7, PIE 7, VIT 6, AGI 10, LUC 15
Need: STR 15, INT 12, PIE 12, VIT 15, AGI 14, LUC 15
Allocate: +10 STR, +5 INT, +5 PIE, +9 VIT, +4 AGI, +0 LUC
Final: STR 15, INT 12, PIE 12, VIT 15, AGI 14, LUC 15
(Total allocated: 33, but have 28 → CANNOT MAKE LORD, reroll)
```

## Classes

### Basic Classes

**Fighter**
- **Requirements**: STR ≥ 11
- **Alignment**: Any
- **Role**: Front-line tank
- **HP**: d10 per level (highest)
- **Equipment**: All weapons, all armor
- **Special**: Multiple attacks (1 + level/5)

**Mage**
- **Requirements**: INT ≥ 11
- **Alignment**: Any
- **Role**: Offensive spellcaster
- **HP**: d4 per level (lowest)
- **Equipment**: Dagger/staff only, no armor
- **Spells**: Mage spells 1-7
- **Special**: Highest spell damage

**Priest**
- **Requirements**: PIE ≥ 11, NOT Neutral
- **Alignment**: Good or Evil only
- **Role**: Healer, support caster
- **HP**: d8 per level
- **Equipment**: Blunt weapons, no helmets, all armor
- **Spells**: Priest spells 1-7
- **Special**: Healing, resurrection

**Thief**
- **Requirements**: AGI ≥ 11, NOT Good
- **Alignment**: Neutral or Evil only
- **Role**: Trap disarming, scouting
- **HP**: d6 per level
- **Equipment**: Daggers/short swords, leather armor
- **Special**: Disarm traps, open locks, identify items

### Elite Classes

**Bishop**
- **Requirements**: INT ≥ 12, PIE ≥ 12
- **Alignment**: Any
- **Role**: Dual spellcaster
- **HP**: d6 per level
- **Equipment**: Blunt weapons, no helmets, all armor
- **Spells**: BOTH Mage 1-7 AND Priest 1-7
- **Special**: Identify items, learns spells slower

**Samurai**
- **Requirements**: STR ≥ 15, VIT ≥ 14, INT ≥ 11, PIE ≥ 10, AGI ≥ 10
- **Alignment**: Good or Neutral only
- **Role**: Fighter with magic
- **HP**: d10 per level
- **Equipment**: All weapons, all armor
- **Spells**: Mage spells 1-6 only
- **Special**: Fights like Fighter + bonus spells

**Lord**
- **Requirements**: STR ≥ 15, VIT ≥ 15, INT ≥ 12, PIE ≥ 12, AGI ≥ 14, LUC ≥ 15
- **Alignment**: Good only
- **Role**: Fighter with divine magic
- **HP**: d10 per level
- **Equipment**: All weapons, all armor
- **Spells**: Priest spells 1-6 only
- **Special**: Fights like Fighter + healing

**Ninja**
- **Requirements**: STR ≥ 17, INT ≥ 17, PIE ≥ 17, VIT ≥ 17, AGI ≥ 17, LUC ≥ 17
- **Alignment**: Evil only
- **Role**: Unarmored assassin
- **HP**: d8 per level
- **Equipment**: All weapons, NO armor (better AC unarmored)
- **Special**: 2 base attacks, critical hits (decapitation), best AC unarmored

See [Class Reference](../research/class-reference.md) for detailed class data.

## Alignment

### Alignment Restrictions

**Good**:
- Can be: Fighter, Mage, Priest, Bishop, Samurai, Lord
- Cannot be: Thief, Ninja

**Neutral**:
- Can be: Fighter, Mage, Thief, Bishop, Samurai
- Cannot be: Priest, Lord, Ninja

**Evil**:
- Can be: Fighter, Mage, Priest, Thief, Bishop, Ninja
- Cannot be: Lord, Samurai

### Alignment Effects

**Item Restrictions**:
- Some items require specific alignment
- Holy weapons: Good only
- Cursed weapons: Evil only
- Neutral items: Any alignment

**Class Change**:
- Can change alignment at altar (rare)
- Allows switching to previously ineligible classes
- Expensive and risky

## Initial Stats

### Starting Age

**Formula**: 14 + random(0-2) = 14-16 years

**Impact on Leveling**:
```
StatGainChance = (130 - Age) / 100

Examples:
- Age 14: 116% base chance (best)
- Age 15: 115% base chance
- Age 16: 114% base chance

// Younger characters gain stats faster on level-up
```

### Starting HP

**Formula**: Class Hit Die + VIT Modifier

**VIT Modifiers**:
- VIT 3-5: -2 HP
- VIT 6-10: -1 HP
- VIT 11-14: +0 HP
- VIT 15-17: +1 HP
- VIT 18+: +2 HP

**Minimum**: 1 HP (cannot start with 0 or negative)

**Example** (Fighter with VIT 12):
```
Fighter HD = d10
Roll: 7
VIT modifier (12): +0
Starting HP = 7
```

### Starting Spell Points

**Mage/Priest/Bishop**:
- Level 1 spells: 1-2 points
- No higher level spells yet (level 1)

**Samurai/Lord**:
- Level 1 spells: 1 point
- Secondary casters (fewer points)

## Roster Management

### Roster Limit

**Maximum**: 20 characters
**Shared**: All characters available for any party
**Persistent**: Characters remain in roster until deleted

### Character Deletion

**Can Delete If**:
- Character not in active party
- Character not in dungeon
- Player confirms deletion

**Cannot Delete If**:
- Character currently in party in dungeon
- Character body in dungeon (must retrieve first)

**Deletion Process**:
1. Select character from roster
2. Confirm deletion (irreversible)
3. Character removed from roster
4. Slot freed for new character

## Related Documentation

**Services**:
- [CharacterCreationService](../services/CharacterCreationService.md) - Creation flow
- [CharacterService](../services/CharacterService.md) - Stat validation
- [RaceService](../services/RaceService.md) - Racial bonuses
- [ClassService](../services/ClassService.md) - Class requirements

**Commands**:
- [CreateCharacterCommand](../commands/CreateCharacterCommand.md) - Creation orchestration
- [DeleteCharacterCommand](../commands/DeleteCharacterCommand.md) - Roster management

**Game Design**:
- [Character Creation Guide](../game-design/02-character-creation.md) - Player-facing guide
- [Classes Overview](../game-design/03-party-formation.md) - Class strategies

**Research**:
- [Race Stats](../research/race-stats.md) - Validated racial stats
- [Class Reference](../research/class-reference.md) - Validated class requirements
- [Combat Formulas](../research/combat-formulas.md) - Bonus roll formula

**Diagrams**:
- [Character Creation Flow](../diagrams/character-creation-flow.md) - Flow diagram
