# MonsterService

**Pure function service for monster data loading and stat management.**

## Responsibility

Loads monster definitions from data files, provides monster stats and abilities, manages monster types and resistances, and handles monster special abilities (breath weapons, regeneration, level drain).

## API Reference

### loadMonsterData

Load all monster definitions from data file.

**Signature**:
```typescript
function loadMonsterData(): MonsterData
```

**Returns**: Complete monster database (96 monsters)

**Example**:
```typescript
const monsterData = MonsterService.loadMonsterData()
// monsterData = {
//   "orc": { name: "Orc", hp: "1-4", ac: 10, ... },
//   "kobold": { name: "Kobold", hp: "3-7", ac: 8, ... },
//   ...
// }
```

### getMonster

Get monster definition by ID.

**Signature**:
```typescript
function getMonster(
  monsterData: MonsterData,
  monsterId: string
): Monster
```

**Parameters**:
- `monsterData`: Monster database
- `monsterId`: Monster ID (lowercase, e.g., "orc", "vampire_lord")

**Returns**: Monster definition

**Throws**:
- `MonsterNotFoundError` if monster ID doesn't exist

**Example**:
```typescript
const orc = MonsterService.getMonster(monsterData, "orc")
// orc = {
//   id: "orc",
//   name: "Orc",
//   hp: "1-4",
//   ac: 10,
//   damage: "1d8",
//   xp: 235,
//   resistances: ["fire"],
//   ...
// }
```

### generateMonsterHP

Generate random HP for monster based on HP range.

**Signature**:
```typescript
function generateMonsterHP(monster: Monster): number
```

**Parameters**:
- `monster`: Monster definition

**Returns**: Random HP value within monster's HP range

**Example**:
```typescript
const orc = MonsterService.getMonster(monsterData, "orc")
const hp = MonsterService.generateMonsterHP(orc)
// hp = 3 (random value between 1-4)
```

### getMonstersByLevel

Get all monsters that can appear on a specific dungeon level.

**Signature**:
```typescript
function getMonstersByLevel(
  monsterData: MonsterData,
  level: number
): Monster[]
```

**Parameters**:
- `monsterData`: Monster database
- `level`: Dungeon level (1-10)

**Returns**: Array of monsters for this level

**Example**:
```typescript
const level1Monsters = MonsterService.getMonstersByLevel(monsterData, 1)
// level1Monsters = [Orc, Kobold, Bubbly Slime, Zombie, ...]

const level10Monsters = MonsterService.getMonstersByLevel(monsterData, 10)
// level10Monsters = [Vampire, Greater Demon, Werdna, ...]
```

### hasResistance

Check if monster has specific resistance.

**Signature**:
```typescript
function hasResistance(
  monster: Monster,
  resistanceType: ResistanceType
): boolean
```

**Parameters**:
- `monster`: Monster definition
- `resistanceType`: "fire", "cold", "magic", "death"

**Returns**: `true` if monster has this resistance

**Example**:
```typescript
const orc = MonsterService.getMonster(monsterData, "orc")
const fireResist = MonsterService.hasResistance(orc, "fire")
// fireResist === true (orcs resist fire)

const coldResist = MonsterService.hasResistance(orc, "cold")
// coldResist === false (orcs don't resist cold)
```

### getMagicResistance

Get monster's magic resistance percentage.

**Signature**:
```typescript
function getMagicResistance(monster: Monster): number
```

**Parameters**:
- `monster`: Monster definition

**Returns**: Magic resistance percentage (0-95)

**Example**:
```typescript
const earthGiant = MonsterService.getMonster(monsterData, "earth_giant")
const resist = MonsterService.getMagicResistance(earthGiant)
// resist = 85 (85% magic resistance)

const orc = MonsterService.getMonster(monsterData, "orc")
const noResist = MonsterService.getMagicResistance(orc)
// noResist = 0 (no magic resistance)
```

### isUndead

Check if monster is undead type.

**Signature**:
```typescript
function isUndead(monster: Monster): boolean
```

**Parameters**:
- `monster`: Monster definition

**Returns**: `true` if monster is undead

**Example**:
```typescript
const zombie = MonsterService.getMonster(monsterData, "zombie")
const undead = MonsterService.isUndead(zombie)
// undead === true (zombies are undead)

const orc = MonsterService.getMonster(monsterData, "orc")
const notUndead = MonsterService.isUndead(orc)
// notUndead === false (orcs are not undead)
```

### hasBreathWeapon

Check if monster has breath weapon.

**Signature**:
```typescript
function hasBreathWeapon(monster: Monster): boolean
```

**Parameters**:
- `monster`: Monster definition

**Returns**: `true` if monster has breath attack

**Example**:
```typescript
const fireDragon = MonsterService.getMonster(monsterData, "fire_dragon")
const hasBreath = MonsterService.hasBreathWeapon(fireDragon)
// hasBreath === true (fire breath)

const orc = MonsterService.getMonster(monsterData, "orc")
const noBreath = MonsterService.hasBreathWeapon(orc)
// noBreath === false
```

### getBreathWeaponType

Get monster's breath weapon type.

**Signature**:
```typescript
function getBreathWeaponType(monster: Monster): BreathType | null
```

**Parameters**:
- `monster`: Monster definition

**Returns**: Breath type ("fire", "cold", "poison", "petrify"), or `null` if no breath weapon

**Example**:
```typescript
const fireDragon = MonsterService.getMonster(monsterData, "fire_dragon")
const breathType = MonsterService.getBreathWeaponType(fireDragon)
// breathType = "fire"

const gorgon = MonsterService.getMonster(monsterData, "gorgon")
const petrifyBreath = MonsterService.getBreathWeaponType(gorgon)
// petrifyBreath = "petrify"
```

### getRegenerationRate

Get monster's HP regeneration per round.

**Signature**:
```typescript
function getRegenerationRate(monster: Monster): number
```

**Parameters**:
- `monster`: Monster definition

**Returns**: HP regenerated per combat round (0 if no regeneration)

**Example**:
```typescript
const troll = MonsterService.getMonster(monsterData, "troll")
const regen = MonsterService.getRegenerationRate(troll)
// regen = 3 (regenerates 3 HP per round)

const werdna = MonsterService.getMonster(monsterData, "werdna")
const fastRegen = MonsterService.getRegenerationRate(werdna)
// fastRegen = 5 (regenerates 5 HP per round)
```

### canDecapitate

Check if monster can decapitate (instant kill).

**Signature**:
```typescript
function canDecapitate(monster: Monster): boolean
```

**Parameters**:
- `monster`: Monster definition

**Returns**: `true` if monster can decapitate

**Example**:
```typescript
const ninja = MonsterService.getMonster(monsterData, "lvl_1_ninja")
const canDecap = MonsterService.canDecapitate(ninja)
// canDecap === true (ninjas can decapitate)

const vorpalBunny = MonsterService.getMonster(monsterData, "vorpal_bunny")
const bunnyDecap = MonsterService.canDecapitate(vorpalBunny)
// bunnyDecap === true (Monty Python reference)
```

### getLevelDrain

Get monster's level drain amount.

**Signature**:
```typescript
function getLevelDrain(monster: Monster): number
```

**Parameters**:
- `monster`: Monster definition

**Returns**: Number of levels drained per hit (0 if no drain)

**Example**:
```typescript
const shade = MonsterService.getMonster(monsterData, "shade")
const drain = MonsterService.getLevelDrain(shade)
// drain = 1 (drains 1 level per hit)

const vampireLord = MonsterService.getMonster(monsterData, "vampire_lord")
const bigDrain = MonsterService.getLevelDrain(vampireLord)
// bigDrain = 4 (drains 4 levels per hit!)
```

### getAttacksPerRound

Get number of attacks monster makes per round.

**Signature**:
```typescript
function getAttacksPerRound(monster: Monster): number
```

**Parameters**:
- `monster`: Monster definition

**Returns**: Number of attacks per combat round

**Example**:
```typescript
const orc = MonsterService.getMonster(monsterData, "orc")
const attacks = MonsterService.getAttacksPerRound(orc)
// attacks = 1 (1 attack per round)

const chimera = MonsterService.getMonster(monsterData, "chimera")
const multiAttack = MonsterService.getAttacksPerRound(chimera)
// multiAttack = 6 (6 attacks per round!)
```

### canCastSpells

Check if monster can cast spells.

**Signature**:
```typescript
function canCastSpells(monster: Monster): boolean
```

**Parameters**:
- `monster`: Monster definition

**Returns**: `true` if monster is a spellcaster

**Example**:
```typescript
const lvl1Mage = MonsterService.getMonster(monsterData, "lvl_1_mage")
const canCast = MonsterService.canCastSpells(lvl1Mage)
// canCast === true

const highWizard = MonsterService.getMonster(monsterData, "high_wizard")
const powerfulCaster = MonsterService.canCastSpells(highWizard)
// powerfulCaster === true (casts level 6 spells)
```

### getSpellLevel

Get maximum spell level monster can cast.

**Signature**:
```typescript
function getSpellLevel(monster: Monster): number
```

**Parameters**:
- `monster`: Monster definition

**Returns**: Maximum spell level (0 if cannot cast spells)

**Example**:
```typescript
const lvl1Mage = MonsterService.getMonster(monsterData, "lvl_1_mage")
const spellLevel = MonsterService.getSpellLevel(lvl1Mage)
// spellLevel = 1 (casts level 1 mage spells)

const werdna = MonsterService.getMonster(monsterData, "werdna")
const werdnaSpellLevel = MonsterService.getSpellLevel(werdna)
// werdnaSpellLevel = 7 (casts level 7 mage spells - all spells)
```

### isBoss

Check if monster is a boss encounter.

**Signature**:
```typescript
function isBoss(monster: Monster): boolean
```

**Parameters**:
- `monster`: Monster definition

**Returns**: `true` if monster is a boss

**Example**:
```typescript
const murphysGhost = MonsterService.getMonster(monsterData, "murphys_ghost")
const isBoss = MonsterService.isBoss(murphysGhost)
// isBoss === true (Level 1 boss)

const werdna = MonsterService.getMonster(monsterData, "werdna")
const finalBoss = MonsterService.isBoss(werdna)
// finalBoss === true (final boss)
```

## Dependencies

Uses:
- `ValidationService` (validate monster IDs)
- `RandomService` (generate monster HP)

## Testing

See [MonsterService.test.ts](../../tests/services/MonsterService.test.ts)

**Key test cases**:
- Load monster data (96 monsters)
- Get monster by ID
- Get invalid monster ID (throws error)
- Generate monster HP (within range)
- Get monsters by level (Level 1, Level 10)
- Check resistance (fire, cold, magic)
- Get magic resistance percentage (0-95%)
- Check if undead (zombie yes, orc no)
- Check breath weapon (dragon yes, orc no)
- Get breath weapon type (fire, cold, poison, petrify)
- Get regeneration rate (0-5 HP per round)
- Check if can decapitate (ninja yes, orc no)
- Get level drain (0-4 levels)
- Get attacks per round (1-6 attacks)
- Check if can cast spells (mage yes, fighter no)
- Get spell level (0-7)
- Check if boss (Murphy's Ghost, Werdna)

## Related

- [EncounterService](./EncounterService.md) - Generates encounters using monster data
- [CombatService](./CombatService.md) - Uses monster stats for combat
- [MonsterAIService](./MonsterAIService.md) - Monster behavior logic
- [Monster Reference](../research/monster-reference.md) - Complete monster database
- [Combat System](../systems/combat-system.md) - Monster combat mechanics
