# Dungeon

**Exploring the 10-level maze beneath the castle.**

## Dungeon Structure

### 10 Levels

**Level 1**: Tutorial area, weak enemies (Kobolds, Orcs, Rogues)
**Level 2**: Increased difficulty, undead appear
**Level 3**: Mid-tier enemies, multiple groups
**Level 4**: Dragons, traps become dangerous
**Level 5-6**: High-tier enemies, bosses appear
**Level 7-8**: Very dangerous, level-draining enemies
**Level 9**: Near-endgame difficulty
**Level 10**: Werdna's lair, final boss

### Map Size

**Each Level**: 20×20 grid (400 squares per level)
**Total**: 4,000 dungeon squares across all levels
**Mapping**: Required for successful navigation

## Navigation

### Movement

**First-Person View**: See dungeon from party's perspective
**Cardinal Directions**: North, South, East, West
**Actions**:
- Move Forward
- Move Backward
- Strafe Left
- Strafe Right
- Turn Left (90°)
- Turn Right (90°)

**Speed**: Instant movement (no animation delay)

### Automap

**Feature**: Automatically maps visited areas
**Display**: Blueprint-style grid showing:
- Visited squares (blue)
- Unvisited squares (dark)
- Walls and doors
- Your current position and facing

**Toggle**: Can turn on/off automap display

**Strategy**: Use automap to avoid getting lost

### Coordinates

**DUMAPIC Spell**: Shows current position and facing
- Format: (X, Y, Level, Facing)
- Example: (10, 15, 3, North)

**Manual Mapping**: Many players draw maps on graph paper

## Dungeon Features

### Walls

**Solid Walls**: Cannot pass through
**Rendering**: Visible in first-person view
**Automap**: Shows as thick lines

### Doors

**Normal Doors**: Can be opened
**Locked Doors**: Require keys or thief to pick
**Secret Doors**: Hidden, revealed by searching

**Strategy**: Search suspicious dead-ends for secrets

### Stairs

**Down Stairs**: Descend to next level
**Up Stairs**: Ascend to previous level
**Forced**: Automatically use stairs when stepping on them (no prompt)

**Location**: Fixed positions per level

### Teleporters

**Effect**: Instantly transport party to different location
**Warning**: Often no indication before teleporting
**Types**:
- Same-level teleport
- Cross-level teleport
- One-way teleports

**Strategy**: Map teleporter destinations carefully

### Spinners

**Effect**: Rotate party facing (90°, 180°, or 270°)
**Warning**: No indication when stepped on
**Result**: Become disoriented, lose sense of direction

**Strategy**: Use DUMAPIC to re-orient after spinner

### Anti-Magic Zones

**Effect**: Cannot cast spells
**Duration**: While in the zone
**Indication**: Spell casting fails with message

**Strategy**: Avoid combat in anti-magic zones if possible

### Darkness

**Effect**: Cannot see dungeon clearly
**Solution**: Cast MILWA (level 1 Priest) or LOMILWA (level 6 Mage/Priest)
**Duration**: Limited, must recast periodically

**Some Areas**: Immune to light spells (always dark)

### Pits & Chutes

**Effect**: Fall to lower level
**Damage**: May take fall damage
**One-Way**: Cannot climb back up

**Strategy**: Avoid stepping on known pit locations

## Encounters

### Random Encounters

**Frequency**: Varies by level (deeper = more frequent)
**Trigger**: Each step has chance to trigger encounter
**Enemies**: Appropriate to current dungeon level

**Cannot Avoid**: Must fight or flee

### Fixed Encounters

**Boss Fights**: Specific locations, guaranteed encounters
**Guardians**: Block key areas
**Quest Enemies**: Required for progression

**Examples**:
- Murphy's Ghost (Level 1 boss)
- Werdna (Level 10 final boss)

### Encounter Surprise

**Surprise**: Enemy attacks before you can act
**Back Attack**: Enemies attack from behind (formation reversed!)

**Chance**: Random, reduced by high-level party

## Treasure Chests

### Finding Chests

**Random**: Appear after combat victories
**Fixed**: Some locations have guaranteed chests

### Chest Contents

**Gold**: Always some amount
**Items**: Equipment, consumables, or special items
**Empty**: Sometimes nothing but gold

### Traps

**All Chests Are Trapped!**

**Trap Types**:
- Poison gas (damage party)
- Explosion (heavy damage)
- Teleporter (random location)
- Summoner (spawns monsters)
- Mage fire (fire damage)
- Crossbow bolts (physical damage)

### Disarming Traps

**CALFO Spell** (Priest level 2): Identify trap type

**Thief Skill**: Attempt to disarm
- **Success**: Chest opens safely
- **Failure**: Trap triggers, chest destroyed

**Thief-less Option**: Just open chest, accept trap damage

**Strategy**: Always have a Thief, always use CALFO first

## Special Locations

### Castle Entrance

**Level 1 Start**: Where you enter dungeon
**Return Point**: LOKTOFEIT spell returns here
**Safe Exit**: Leave dungeon to return to town

### Werdna's Lair

**Level 10**: Final area
**Boss Fight**: Werdna himself
**Amulet**: Must retrieve after defeating Werdna

### Key Areas

**Bronze Key Room**: Level 2
**Silver Key Room**: Level 2
**Blue Ribbon Elevator**: Level 4 (express to deeper levels)

## Dungeon Survival

### Resources Management

**HP**: Damage accumulates, must heal or rest
**Spell Points**: Finite per dungeon trip, must rest at inn to restore
**Age**: Resting at inn increases age (affects stat growth)

**Strategy**: Balance dungeon time vs. trips to town

### Resting in Dungeon

**Camp**: Can rest in dungeon to restore HP/spells
**Risk**: Vulnerable to encounters while camping
**Age**: Still increases age like inn rest

**When to Camp**: Deep in dungeon, can't make it back to town

### Emergency Escapes

**LOKTOFEIT** (Priest level 5):
- Teleport to castle entrance
- Success rate: Level × 2%
- Low chance, but worth trying in emergency

**MALOR** (Mage level 6):
- Teleport to any coordinates
- DANGEROUS: Wrong coordinates = instant party death
- Only use if you know exact safe coordinates

**Walk Back**: Safest but time-consuming

## Exploration Strategy

### First Trips

1. **Explore Level 1**: Map thoroughly
2. **Find Stairs Down**: Locate level 2 entrance
3. **Return Often**: Don't push too deep too soon
4. **Build Map**: Track visited areas

### Efficient Exploration

1. **Move Systematically**: Cover areas methodically
2. **Search Regularly**: Find secret doors
3. **Mark Teleporters**: Note destinations on map
4. **Identify Spinners**: Mark spinner squares

### Danger Signs

**Multiple Groups**: Harder encounters
**High-Level Enemies**: Dragons, Demons, Vampires
**Level Drain**: Retreat immediately if detected
**Low HP/Spells**: Turn back before critical

## Death & Party Wipes

**If Entire Party Dies**:
1. Game over screen
2. Bodies remain at death location
3. Must create new party
4. New party can attempt to recover bodies

**See**: [Death & Recovery](./09-death-recovery.md) for details

## Dungeon Tips

1. **Always Map**: Use automap or draw maps
2. **Search Walls**: Many secret doors
3. **Bring Thief**: Traps are deadly
4. **Save Often**: Before dangerous areas
5. **Know Exit Routes**: Plan retreat paths
6. **Stock Spell Points**: Don't waste on weak enemies
7. **Mark Dangers**: Note spinner/teleporter locations
8. **Return Regularly**: Don't get greedy

## Related

- [Combat](./05-combat.md) - Dungeon encounters
- [Spells](./04-spells.md) - Navigation spells (DUMAPIC, MALOR, LOKTOFEIT)
- [Death & Recovery](./09-death-recovery.md) - Body recovery
- [Monsters](./10-monsters.md) - Enemy reference by level
