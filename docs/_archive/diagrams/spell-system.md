# Spell System Diagram

**Visual representation of spell points and casting flow.**

## Description

Wizardry 1 uses a spell point system (not memorized slots like D&D):

- **Separate pools** for each spell level (1-7)
- **Mage spells**: 7 levels (powered by INT)
- **Priest spells**: 7 levels (powered by PIE)
- **Each spell costs 1 point** from its level pool
- **Spell learning**: Chance = (INT or PIE) / 30 on level-up

Characters restore all spell points when resting at the inn.

## Spell Point System Diagram

```mermaid
flowchart TD
    subgraph Character["Character (Mage/Priest/Bishop)"]
        direction TB
        INT_PIE["INT (Mages) or<br/>PIE (Priests)"]
        Level["Character Level"]
        Class["Character Class"]
    end

    Character --> SpellPoints

    subgraph SpellPoints["Spell Point Pools (Separate per Level)"]
        direction LR
        L1["Level 1: 0-9 points"]
        L2["Level 2: 0-9 points"]
        L3["Level 3: 0-9 points"]
        L4["Level 4: 0-9 points"]
        L5["Level 5: 0-9 points"]
        L6["Level 6: 0-9 points"]
        L7["Level 7: 0-9 points"]
    end

    SpellPoints --> Casting["Spell Casting"]

    subgraph Restore["Spell Point Restoration"]
        direction TB
        InnRest["Rest at Inn"]
        FullRestore["All Points Restored<br/>(All Levels)"]
        InnRest --> FullRestore
    end

    Restore -.-> SpellPoints

    style Character fill:#e1f5ff
    style SpellPoints fill:#f3e5f5
    style Restore fill:#c8e6c9
```

## Spell Casting Flow Diagram

```mermaid
flowchart TD
    Start([Player Selects Cast Spell]) --> CheckContext

    CheckContext{"Game Mode?"}
    CheckContext -->|Combat| SelectSpell
    CheckContext -->|Dungeon| SelectSpell
    CheckContext -->|Town| SelectSpell

    SelectSpell["Display Available Spells<br/>(Learned + Have Points)"]
    SelectSpell --> PlayerChoice["Player Chooses Spell"]

    PlayerChoice --> CheckPoints{"Has Spell Points<br/>for This Level?"}

    CheckPoints -->|No| Fizzle1([Spell Fizzles!<br/>No Effect])
    CheckPoints -->|Yes| DeductPoint["Deduct 1 Point from<br/>Spell Level Pool"]

    DeductPoint --> CheckType{"Spell Type?"}

    CheckType -->|Damage/Attack| SelectTarget1["Select Target<br/>(Enemy Group)"]
    CheckType -->|Healing/Buff| SelectTarget2["Select Target<br/>(Ally or Party)"]
    CheckType -->|Utility| SelectTarget3["Target: Party/Environment"]

    SelectTarget1 --> CastSpell
    SelectTarget2 --> CastSpell
    SelectTarget3 --> CastSpell

    CastSpell["Execute Spell Effect"]

    CastSpell --> CheckSpecial{"Special<br/>Spell?"}

    CheckSpecial -->|LOKTOFEIT| RecallCheck["Success = Level × 2%<br/>(Max 26% at L13)"]
    CheckSpecial -->|DI| ResurrectCheck["90% Success<br/>10% → Ashes"]
    CheckSpecial -->|KADORTO| RaiseCheck["50% Success<br/>50% → Lost Forever"]
    CheckSpecial -->|Regular Spell| ApplyEffect["Apply Spell Effect"]

    RecallCheck --> CheckSuccess1{"Success?"}
    CheckSuccess1 -->|Yes| Teleport["Teleport to Castle"]
    CheckSuccess1 -->|No| Failed1["Spell Failed"]

    ResurrectCheck --> CheckSuccess2{"Success?"}
    CheckSuccess2 -->|Yes| Revive["Character Revived (HP=1)"]
    CheckSuccess2 -->|No| ToAshes["Character → Ashes"]

    RaiseCheck --> CheckSuccess3{"Success?"}
    CheckSuccess3 -->|Yes| Revive2["Character Revived (HP=1)"]
    CheckSuccess3 -->|No| Lost["Character Lost Forever"]

    ApplyEffect --> Complete([Spell Complete])
    Teleport --> Complete
    Failed1 --> Complete
    Revive --> Complete
    ToAshes --> Complete
    Revive2 --> Complete
    Lost --> Complete

    style Start fill:#c8e6c9
    style Complete fill:#c8e6c9
    style Fizzle1 fill:#ef9a9a
    style Failed1 fill:#ffcc80
    style ToAshes fill:#ef9a9a
    style Lost fill:#b71c1c
    style Teleport fill:#a5d6a7
    style Revive fill:#a5d6a7
    style Revive2 fill:#a5d6a7
```

## Spell Learning Flow

```mermaid
flowchart TD
    LevelUp([Character Levels Up]) --> CheckClass{"Class Can<br/>Learn Spells?"}

    CheckClass -->|Mage/Priest/Bishop/Samurai/Lord| CheckAvailable
    CheckClass -->|Fighter/Thief/Ninja| NoSpells([No Spell Learning])

    CheckAvailable["Check Available Spells<br/>for Current Level"]
    CheckAvailable --> ForEachSpell["For Each Unlearned Spell"]

    ForEachSpell --> RollChance["Roll Learning Chance"]
    RollChance --> CalcChance["Learn Chance = (INT or PIE) / 30"]

    CalcChance --> CheckRoll{"Roll Success?"}

    CheckRoll -->|Yes| LearnSpell["Add Spell to Spellbook"]
    CheckRoll -->|No| SkipSpell["Skip This Spell"]

    LearnSpell --> IncreasePoints["Increase Spell Points<br/>for This Level"]
    SkipSpell --> NextSpell{"More<br/>Spells?"}
    IncreasePoints --> NextSpell

    NextSpell -->|Yes| ForEachSpell
    NextSpell -->|No| Complete([Learning Complete])

    style LevelUp fill:#c8e6c9
    style Complete fill:#c8e6c9
    style NoSpells fill:#ffcc80
    style LearnSpell fill:#a5d6a7
```

## Spell Point Formulas

### Maximum Points Per Level
```
Points for spell level X = max(
  1 (if learned any spell this level),
  varies by class progression,
  cap at 9 maximum per level
)
```

**Notes**:
- Bishops learn spells slower (penalty applied)
- High INT/PIE characters get more points
- Formula complex; varies by when first spell learned

### Learning Probability

| INT/PIE | Learn Chance | Expected Levels to Learn |
|---------|--------------|-------------------------|
| 11 | 36.7% | ~3 levels |
| 12 | 40.0% | ~2.5 levels |
| 13 | 43.3% | ~2.3 levels |
| 14 | 46.7% | ~2.1 levels |
| 15 | 50.0% | ~2 levels |
| 16 | 53.3% | ~1.9 levels |
| 17 | 56.7% | ~1.8 levels |
| 18+ | 60.0% | ~1.7 levels |

## Spell Types by Category

### Mage Spell Categories

**Damage Spells**:
- Level 1: HALITO (1d8 fire)
- Level 2: MELITO (1d8 each)
- Level 3: MAHALITO (4d6 fire), MOLITO (3d6 each)
- Level 4: DALTO (6d6 cold), LAHALITO (6d6 fire)
- Level 5: MADALTO (party-wide), LAKANITO (vacuum)
- Level 6-7: TILTOWAIT (massive damage, all groups)

**Control Spells**:
- Level 1: KATINO (sleep)
- Level 2: DILTO (blind)
- Level 4: MORLIS (paralyze)
- Level 6-7: HAMAN/MAHAMAN (transform)

**Utility Spells**:
- Level 1: DUMAPIC (coordinates), MOGREF (-2 AC)
- Level 2: SOPIC (invisibility)
- Level 5: ZILWAN (dispel)
- Level 6: MALOR (teleport), LOMILWA (light)

### Priest Spell Categories

**Healing Spells**:
- Level 1: DIOS (1d8 HP)
- Level 3: DIAL (2d8 HP)
- Level 5: DIAL (full HP)
- Level 7: DI (resurrect from death)
- Level 5: KADORTO (resurrect from ashes)

**Defensive Spells**:
- Level 1: KALKI (-1 AC party), PORFIC (-4 AC single)
- Level 2: MATU (-2 AC party)
- Level 3: BAMATU (-4 AC party)
- Level 4: MAPORFIC (-4 AC party), KATU (massive AC party)

**Offensive Spells**:
- Level 1: BADIOS (1d8 vs undead)
- Level 3: BADIAL (2d8 all enemies)
- Level 4: BADIALMA (4d8 all undead), BAMORDI (3d8 single)
- Level 5: BADI (instant death), MABADI (death all)
- Level 6: LORTO (massive damage), MALIKTO (petrify)
- Level 7: MABADI (extinction all)

**Utility Spells**:
- Level 1: MILWA (light)
- Level 2: CALFO (identify trap), MANIFO (silence)
- Level 3: LATUMAPIC (identify foe), LOMILWA (more light)
- Level 4: KANDI (locate person), LATUMOFIS (identify enemy)
- Level 5: LOKTOFEIT (recall to castle)

## Key Points

1. **Separate Pools**: Each spell level has its own point pool (0-9 max)
2. **Fixed Cost**: All spells cost 1 point from their level pool
3. **No Fizzle**: Most spells cast successfully (exceptions: LOKTOFEIT, DI, KADORTO)
4. **Learning**: Random chance on level-up based on INT/PIE
5. **Restoration**: Only full rest at inn restores all points
6. **Multi-Class**: Bishops learn both mage and priest spells (slower rate)
