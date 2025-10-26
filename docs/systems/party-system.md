# Party System

**Comprehensive overview of party management, formation, and membership.**

## Overview

The party is the **core abstraction** in Wizardry 1. Unlike single-character roguelikes, everything revolves around the party as a single entity.

**Key Concepts**:
- Party has position, facing, and formation (not individual characters)
- Characters belong to roster (max 20), subset active in party (1-6)
- Front row (max 3) and back row (max 3) formation
- Party moves as single unit
- Party shares gold and inventory
- Formation determines combat effectiveness

## Architecture

### Services Involved

- **PartyService** - Formation management, membership, validation
- **NavigationService** - Party movement, collision detection
- **FormationService** - Front/back row management
- **CharacterService** - Character stats, equipment (for party members)
- **InventoryService** - Shared party inventory
- **ValidationService** - Party composition validation

### Commands Involved

- **FormPartyCommand** - Create/modify party composition
- **AddToPartyCommand** - Add character from roster
- **RemoveFromPartyCommand** - Remove character to roster
- **ChangeFormationCommand** - Move characters between rows
- **MoveForwardCommand** - Move party forward
- **TurnLeftCommand** / **TurnRightCommand** - Rotate party
- **StrafeLeftCommand** / **StrafeRightCommand** - Strafe party

### Data Structures

```typescript
interface Party {
  members: Character[]           // 1-6 active characters
  formation: Formation          // Front/back row assignment
  position: Position            // Current dungeon location
  facing: Direction             // North, South, East, West
  gold: number                  // Shared party gold
  inventory: Item[]             // Shared party items
}

interface Formation {
  frontRow: Character[]         // Max 3 characters
  backRow: Character[]          // Max 3 characters
}

interface Position {
  x: number                     // X coordinate (0-19)
  y: number                     // Y coordinate (0-19)
  level: number                 // Dungeon level (1-10)
}

type Direction = 'north' | 'south' | 'east' | 'west'
```

## Formation Mechanics

### Row Assignment Rules

**Front Row**:
- Maximum 3 characters
- Takes all melee attacks from enemies
- Can perform melee attacks
- Recommended: Fighters, Lords, Samurai (high AC, high HP)

**Back Row**:
- Maximum 3 characters
- Protected from melee attacks (unless front row empty)
- Cannot perform melee attacks (ranged/magic only)
- Recommended: Mages, Priests, Bishops, Thieves

### Formation Strategies

**Balanced Party (6 members)**:
```
Front Row: Fighter, Lord, Samurai
Back Row: Mage, Priest, Thief
```

**Small Party (4 members)**:
```
Front Row: Fighter, Fighter
Back Row: Priest, Mage
```

**Minimal Party (1 member)**:
```
Front Row: Fighter (solo)
Back Row: (empty)
```

### Formation Changes

**When Allowed**:
- In town (between dungeon expeditions)
- At camp (during dungeon exploration)
- NOT during combat

**How to Change**:
1. Player selects character
2. Player selects target row (front/back)
3. System validates row not full (max 3)
4. Character moves to target row

## Party Membership

### Adding Characters

**Requirements**:
- Character must exist in roster
- Party size < 6
- Character not already in party
- Character alive (HP > 0)

**Process**:
1. Select character from roster
2. Validate requirements
3. Add to party members
4. Assign to row (default: back row)
5. Update party state

### Removing Characters

**Requirements**:
- Character currently in party
- Party size > 1 (can't remove last member in dungeon)

**Process**:
1. Select character in party
2. Validate requirements
3. Remove from formation (front or back row)
4. Remove from party members
5. Return to roster
6. Character keeps equipped items

### Death in Party

**When Character Dies**:
- Character remains in party (becomes corpse)
- Cannot act in combat
- Reduces party effectiveness
- Body can be retrieved if party wipes

**Options**:
1. **Resurrect at temple** - Return to town, pay for resurrection
2. **Leave body** - Remove from party, body stays at death location
3. **Carry body** - Keep in party, retrieve later

## Movement Mechanics

### Party Movement

**Movement Commands**:
- **Forward**: Move 1 tile in facing direction
- **Backward**: Move 1 tile opposite facing direction
- **Strafe Left**: Move 1 tile left (no rotation)
- **Strafe Right**: Move 1 tile right (no rotation)
- **Turn Left**: Rotate 90° left (no movement)
- **Turn Right**: Rotate 90° right (no movement)

**Movement Validation**:
```typescript
function canMove(party: Party, direction: Direction): boolean {
  const targetTile = calculateTargetTile(party.position, direction)

  // Check boundaries (0-19 range)
  if (targetTile.x < 0 || targetTile.x > 19) return false
  if (targetTile.y < 0 || targetTile.y > 19) return false

  // Check tile type
  const tile = DungeonService.getTile(party.position.level, targetTile)
  if (tile.type === 'rock') return false
  if (tile.type === 'door' && !tile.open) return false

  return true
}
```

### Position Tracking

**Coordinates**:
- X: 0-19 (west to east)
- Y: 0-19 (north to south)
- Level: 1-10 (dungeon depth)

**Facing**:
- North: Y decreases
- South: Y increases
- East: X increases
- West: X decreases

### Special Tiles

**Stairs**:
- Descend: Level increases (1 → 2 → 3...)
- Ascend: Level decreases (3 → 2 → 1)
- Stairs at level 1 → exit to town

**Teleporters**:
- Instant transport to fixed location
- May change level
- May change facing

**Spinners**:
- Rotate party 90°, 180°, or 270°
- Player loses orientation
- DUMAPIC spell reveals location

**Darkness**:
- Cannot see walls/doors
- MILWA spell provides light
- Movement still allowed

## Party Validation

### Valid Party Composition

**Minimum Requirements**:
- At least 1 character
- At least 1 character alive (HP > 0)
- All characters from roster

**Recommended Composition**:
- 6 characters (maximum)
- 3 front row (tanks)
- 3 back row (support)
- At least 1 healer (Priest, Bishop, Lord)
- At least 1 thief (trap disarming)

### Invalid States

**Cannot Enter Dungeon If**:
- Party empty (0 members)
- All party members dead
- Party has equipment conflicts

**Cannot Rest If**:
- All party members dead
- In combat state

## Party State Transitions

### State Flow

```
TOWN → Form Party → NAVIGATION
NAVIGATION → Encounter → COMBAT
COMBAT → Victory → NAVIGATION
COMBAT → Flee → NAVIGATION (if successful)
COMBAT → Party Wipe → GAME_OVER
NAVIGATION → Enter Town → TOWN
```

### State-Based Actions

**In TOWN**:
- Can form party
- Can add/remove members
- Can change formation
- Cannot move in dungeon

**In NAVIGATION**:
- Can move party
- Can search for traps
- Can rest (camp)
- Can cast utility spells

**In COMBAT**:
- Cannot move on map
- Cannot change formation
- Cannot rest
- Can attack/cast/flee

## Party Resources

### Shared Resources

**Gold**:
- All gold belongs to party (not individuals)
- Earned from combat loot
- Spent at shops (any member can buy)
- Divided equally when party disbanded (non-canon, implementation detail)

**Inventory**:
- Shared item pool (20+ slots)
- Any member can equip from inventory
- Items stay with party when member removed
- Bodies are items when character dies

### Individual Resources

**HP (Hit Points)**:
- Each character has own HP
- Damaged in combat individually
- Healed individually (DIOS, DIAL)
- Death at 0 HP

**Spell Points**:
- Each character has own pools (7 mage + 7 priest)
- Restored at inn (entire party rests)
- Cannot transfer between characters

**Equipment**:
- Each character has own equipped items
- Weapons, armor, shields, helmets, gauntlets
- Equipment stays with character when removed from party

## Formation Combat Effects

### Front Row in Combat

**Advantages**:
- Can perform melee attacks
- Protects back row from melee
- First to receive beneficial spells (KALKI, MOGREF)

**Disadvantages**:
- Takes all enemy melee attacks
- Takes first hits from breath attacks
- More likely to be targeted

### Back Row in Combat

**Advantages**:
- Protected from melee (unless front row empty)
- Safe casting position
- Less likely targeted

**Disadvantages**:
- Cannot melee attack
- If front row dies, becomes front row
- Vulnerable if front row falls

### Row Transitions in Combat

**Cannot Move Between Rows During Combat**

**Exception**:
- If front row character dies, back row character may auto-advance
- Implementation detail: may keep back row back, or auto-advance
- Original Wizardry: back row stays back (even if front empty)

## Related Documentation

**Services**:
- [PartyService](../services/PartyService.md) - Party management API
- [FormationService](../services/FormationService.md) - Row management
- [NavigationService](../services/NavigationService.md) - Movement logic

**Commands**:
- [FormPartyCommand](../commands/FormPartyCommand.md) - Party creation
- [MoveForwardCommand](../commands/MoveForwardCommand.md) - Movement
- [ChangeFormationCommand](../commands/ChangeFormationCommand.md) - Row changes

**Game Design**:
- [Party Formation](../game-design/03-party-formation.md) - Player guide
- [Dungeon Navigation](../game-design/06-dungeon.md) - Movement mechanics

**Research**:
- [Combat Formulas](../research/combat-formulas.md) - Formation effects on combat

**Diagrams**:
- [Party Structure](../diagrams/party-structure.md) - Entity relationships
- [Game State Machine](../diagrams/game-state-machine.md) - State transitions
