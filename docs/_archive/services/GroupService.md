# GroupService

**Pure function service for monster group management and combat organization.**

## Responsibility

Manages monster groups during encounters including group formation, member tracking, group elimination, and reinforcement mechanics.

## API Reference

### createGroup

Create new monster group for encounter.

**Signature**:
```typescript
function createGroup(
  monsterId: string,
  count: number,
  groupIndex: number
): MonsterGroup
```

**Parameters**:
- `monsterId`: Monster type identifier (e.g. "orc", "dragon")
- `count`: Number of monsters in group (1-9)
- `groupIndex`: Group position in encounter (0-3)

**Returns**: New monster group with individual monsters

**Throws**:
- `InvalidCountError` if count < 1 or count > 9
- `InvalidGroupIndexError` if groupIndex not 0-3

**Example**:
```typescript
const group = GroupService.createGroup("orc", 5, 0)
// group = { index: 0, monsters: [orc1, orc2, orc3, orc4, orc5], alive: 5 }
```

### removeMonster

Remove defeated monster from group.

**Signature**:
```typescript
function removeMonster(
  group: MonsterGroup,
  monsterId: string
): MonsterGroup
```

**Parameters**:
- `group`: Current monster group
- `monsterId`: ID of monster to remove (killed)

**Returns**: New group with monster removed

**Throws**:
- `MonsterNotInGroupError` if monster ID not found in group

**Example**:
```typescript
const updatedGroup = GroupService.removeMonster(group, "orc-3")
// updatedGroup.alive === 4 (5 -> 4)
```

### isGroupEliminated

Check if all monsters in group are dead.

**Signature**:
```typescript
function isGroupEliminated(group: MonsterGroup): boolean
```

**Parameters**:
- `group`: Monster group to check

**Returns**: True if all monsters dead, false otherwise

**Example**:
```typescript
const eliminated = GroupService.isGroupEliminated(group)
// eliminated = false (still has 2 orcs alive)
```

### addReinforcements

Add reinforcement monsters to existing group.

**Signature**:
```typescript
function addReinforcements(
  group: MonsterGroup,
  monsterId: string,
  count: number
): MonsterGroup
```

**Parameters**:
- `group`: Existing monster group
- `monsterId`: Type of reinforcements
- `count`: Number of reinforcements (1-4)

**Returns**: New group with reinforcements added

**Throws**:
- `GroupFullError` if adding would exceed 9 monsters
- `InvalidReinforcementTypeError` if monster type doesn't match group

**Example**:
```typescript
const reinforced = GroupService.addReinforcements(demonGroup, "demon", 2)
// reinforced.monsters.length += 2 (demons call backup)
```

### getGroupStats

Calculate aggregate stats for monster group.

**Signature**:
```typescript
function getGroupStats(group: MonsterGroup): GroupStats
```

**Parameters**:
- `group`: Monster group

**Returns**: Aggregate stats (total HP, average AC, total XP)

**Example**:
```typescript
const stats = GroupService.getGroupStats(orcGroup)
// stats = { totalHP: 85, averageAC: 10, totalXP: 1175, alive: 5 }
```

### distributeGroupDamage

Distribute area damage across group members.

**Signature**:
```typescript
function distributeGroupDamage(
  group: MonsterGroup,
  totalDamage: number,
  damageType: DamageType
): MonsterGroup
```

**Parameters**:
- `group`: Monster group taking damage
- `totalDamage`: Total damage to distribute
- `damageType`: Type of damage ("fire", "cold", "magic", "physical")

**Returns**: New group with damage applied to all members

**Notes**: Damage split evenly, with remainder to first monster

**Example**:
```typescript
const damaged = GroupService.distributeGroupDamage(group, 20, "fire")
// 20 damage / 5 orcs = 4 damage each
```

### selectRandomMember

Select random living monster from group.

**Signature**:
```typescript
function selectRandomMember(group: MonsterGroup): Monster
```

**Parameters**:
- `group`: Monster group

**Returns**: Random living monster from group

**Throws**:
- `GroupEliminatedError` if no living monsters in group

**Example**:
```typescript
const target = GroupService.selectRandomMember(orcGroup)
// target = orc-2 (randomly selected)
```

### createEncounter

Create multi-group encounter.

**Signature**:
```typescript
function createEncounter(
  encounterTable: EncounterEntry[],
  level: number
): Encounter
```

**Parameters**:
- `encounterTable`: List of possible encounters for level
- `level`: Dungeon level (1-10)

**Returns**: Complete encounter with 1-4 monster groups

**Example**:
```typescript
const encounter = GroupService.createEncounter(level3Table, 3)
// encounter = {
//   groups: [
//     { type: "kobold", count: 5 },
//     { type: "orc", count: 3 }
//   ]
// }
```

## Group Formation Rules

### Group Size Limits
- Minimum: 1 monster per group
- Maximum: 9 monsters per group
- Encounter max: 4 groups total

### Group Composition
- All monsters in group must be same type
- Cannot mix monster types in single group
- Reinforcements must match group type

### Group Elimination
- Group eliminated when all monsters dead
- Dead group removed from encounter
- Encounter ends when all groups eliminated

## Dependencies

Uses:
- `MonsterService` (monster creation, stats)
- `RandomService` (group selection, random members)
- `EncounterService` (encounter table lookup)

## Testing

See [GroupService.test.ts](../../tests/services/GroupService.test.ts)

**Key test cases**:
- Creating group with 1-9 monsters
- Removing monster reduces alive count
- Group eliminated when last monster dies
- Reinforcements add to existing group
- Cannot exceed 9 monsters per group
- Damage distribution split evenly
- Random member selection only picks alive monsters

## Related

- [Monster Reference](../research/monster-reference.md) - All monster types
- [MonsterAIService](./MonsterAIService.md) - Monster behavior
- [CombatService](./CombatService.md) - Combat resolution
- [EncounterService](./EncounterService.md) - Encounter generation
- [Combat System](../systems/combat-system.md) - Combat overview
