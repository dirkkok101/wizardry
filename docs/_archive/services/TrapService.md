# TrapService

**Pure function service for trap inspection, disarming, and trap mechanics.**

## Responsibility

Calculates trap inspection success rates, disarm success rates, and validates trap-related actions. This service implements the Wizardry 1 trap mechanics including class-based inspection bonuses and level-based disarm abilities.

## API Reference

### calculateInspectChance

Calculate probability of successfully inspecting a chest for traps.

**Signature**:
```typescript
function calculateInspectChance(
  character: Character
): number
```

**Parameters**:
- `character`: Character attempting to inspect chest

**Returns**: Inspection success percentage (0-95)

**Formula**:
```typescript
// Class multiplier
Thief:  AGI × 6
Ninja:  AGI × 4
Others: AGI × 1

// Maximum 95% (always 5% failure chance)
InspectChance% = min(95, AGI × multiplier)
```

**Example**:
```typescript
// Thief with AGI 16
const thief = { class: 'Thief', agility: 16 }
const chance = TrapService.calculateInspectChance(thief)
// chance === 95 (16 × 6 = 96, capped at 95)

// Fighter with AGI 18
const fighter = { class: 'Fighter', agility: 18 }
const chance2 = TrapService.calculateInspectChance(fighter)
// chance2 === 18 (18 × 1 = 18)

// Ninja with AGI 24
const ninja = { class: 'Ninja', agility: 24 }
const chance3 = TrapService.calculateInspectChance(ninja)
// chance3 === 95 (24 × 4 = 96, capped at 95)
```

### attemptInspect

Attempt to inspect chest for traps using random roll.

**Signature**:
```typescript
function attemptInspect(
  character: Character,
  randomSeed: number
): InspectResult
```

**Parameters**:
- `character`: Character attempting inspection
- `randomSeed`: Random seed for deterministic testing

**Returns**: `InspectResult` object

```typescript
interface InspectResult {
  success: boolean           // True if inspection succeeded
  trapType: TrapType | null  // Identified trap (or null if none)
  triggered: boolean         // True if trap was triggered during inspect
}
```

**Example**:
```typescript
const thief = { class: 'Thief', agility: 16, level: 5 }
const chest = { trapped: true, trapType: 'POISON_NEEDLE' }

const result = TrapService.attemptInspect(thief, chest, 12345)

if (result.success) {
  console.log(`Trap detected: ${result.trapType}`)
} else if (result.triggered) {
  console.log('You triggered the trap while inspecting!')
} else {
  console.log('You could not identify the trap.')
}
```

### calculateDisarmChance

Calculate probability of successfully disarming a trap.

**Signature**:
```typescript
function calculateDisarmChance(
  character: Character,
  trapDifficulty: number
): number
```

**Parameters**:
- `character`: Character attempting to disarm
- `trapDifficulty`: Trap difficulty level (1-10)

**Returns**: Disarm success percentage (0-95)

**Formula**:
```typescript
// Effective level calculation
if (character.class === 'Thief' || character.class === 'Ninja') {
  effectiveLevel = character.level + 50
} else {
  effectiveLevel = character.level
}

// Success chance (formula simplified)
baseChance = (effectiveLevel - trapDifficulty) × 5
disarmChance% = max(5, min(95, baseChance))
```

**Example**:
```typescript
// Level 1 Thief vs difficulty 5 trap
const thief = { class: 'Thief', level: 1 }
const chance1 = TrapService.calculateDisarmChance(thief, 5)
// effectiveLevel = 1 + 50 = 51
// (51 - 5) × 5 = 230 → capped at 95%

// Level 10 Fighter vs difficulty 5 trap
const fighter = { class: 'Fighter', level: 10 }
const chance2 = TrapService.calculateDisarmChance(fighter, 5)
// effectiveLevel = 10
// (10 - 5) × 5 = 25%

// Level 51 Fighter vs difficulty 5 trap
const hiFighter = { class: 'Fighter', level: 51 }
const chance3 = TrapService.calculateDisarmChance(hiFighter, 5)
// effectiveLevel = 51
// (51 - 5) × 5 = 230 → capped at 95%
// Same as level 1 Thief!
```

### attemptDisarm

Attempt to disarm identified trap.

**Signature**:
```typescript
function attemptDisarm(
  character: Character,
  trapType: TrapType,
  actualTrapType: TrapType,
  trapDifficulty: number,
  randomSeed: number
): DisarmResult
```

**Parameters**:
- `character`: Character attempting disarm
- `trapType`: Trap type character is trying to disarm
- `actualTrapType`: Actual trap type on chest
- `trapDifficulty`: Trap difficulty (1-10)
- `randomSeed`: Random seed for deterministic testing

**Returns**: `DisarmResult` object

```typescript
interface DisarmResult {
  success: boolean     // True if trap disarmed
  triggered: boolean   // True if trap triggered
  wrongType: boolean   // True if wrong trap type selected
}
```

**Logic**:
```typescript
// Wrong trap type selected
if (trapType !== actualTrapType) {
  // High chance to trigger wrong trap
  return { success: false, triggered: rollTrigger(), wrongType: true }
}

// Correct trap type
const chance = calculateDisarmChance(character, trapDifficulty)
const roll = random(1, 100)

if (roll <= chance) {
  return { success: true, triggered: false, wrongType: false }
} else if (roll > 90) {
  // Critical failure - trigger trap
  return { success: false, triggered: true, wrongType: false }
} else {
  // Normal failure - can retry
  return { success: false, triggered: false, wrongType: false }
}
```

**Example**:
```typescript
const thief = { class: 'Thief', level: 5 }
const chest = { trapType: 'POISON_NEEDLE', difficulty: 3 }

// Correct trap type
const result1 = TrapService.attemptDisarm(
  thief,
  'POISON_NEEDLE',
  chest.trapType,
  chest.difficulty,
  12345
)
// success: true (probably), triggered: false

// Wrong trap type
const result2 = TrapService.attemptDisarm(
  thief,
  'GAS_BOMB',
  chest.trapType,
  chest.difficulty,
  12345
)
// success: false, triggered: true (likely), wrongType: true
```

### getTrapTypes

Get list of all trap types in Wizardry 1.

**Signature**:
```typescript
function getTrapTypes(): TrapType[]
```

**Returns**: Array of trap type identifiers

**Example**:
```typescript
const trapTypes = TrapService.getTrapTypes()
// [
//   'POISON_NEEDLE',
//   'GAS_BOMB',
//   'CROSSBOW_BOLT',
//   'EXPLODING_BOX',
//   'STUNNER',
//   'TELEPORTER',
//   'MAGE_BLASTER',
//   'PRIEST_BLASTER',
//   'ALARM'
// ]
```

### getTrapInfo

Get detailed information about specific trap type.

**Signature**:
```typescript
function getTrapInfo(trapType: TrapType): TrapInfo
```

**Parameters**:
- `trapType`: Trap type identifier

**Returns**: `TrapInfo` object

```typescript
interface TrapInfo {
  name: string              // Display name
  description: string       // Effect description
  damageType: DamageType    // Type of damage
  targetType: TargetType    // Who it affects
  severity: number          // Danger level (1-10)
}
```

**Example**:
```typescript
const info = TrapService.getTrapInfo('POISON_NEEDLE')
// {
//   name: 'Poison Needle',
//   description: 'A poisoned needle pricks the opener',
//   damageType: 'POISON',
//   targetType: 'SINGLE',
//   severity: 3
// }

const info2 = TrapService.getTrapInfo('TELEPORTER')
// {
//   name: 'Teleporter',
//   description: 'Teleports party to random location',
//   damageType: 'NONE',
//   targetType: 'PARTY',
//   severity: 9
// }
```

### calculateTrapDamage

Calculate damage dealt by triggered trap.

**Signature**:
```typescript
function calculateTrapDamage(
  trapType: TrapType,
  character: Character,
  randomSeed: number
): number
```

**Parameters**:
- `trapType`: Type of trap triggered
- `character`: Character affected by trap
- `randomSeed`: Random seed for damage roll

**Returns**: Damage amount (HP)

**Damage by Trap Type**:
```typescript
POISON_NEEDLE:   1d6 damage + poison status
GAS_BOMB:        2d6 damage to party + poison status
CROSSBOW_BOLT:   2d8 damage
EXPLODING_BOX:   3d6 damage to party
STUNNER:         1d4 damage + paralysis
TELEPORTER:      No damage (teleports party)
MAGE_BLASTER:    4d6 damage (Mages/Bishops only)
PRIEST_BLASTER:  4d6 damage (Priests/Bishops/Lords only)
ALARM:           No damage (triggers encounter)
```

**Example**:
```typescript
const character = { class: 'Thief', hp: 20, level: 5 }

const damage1 = TrapService.calculateTrapDamage(
  'POISON_NEEDLE',
  character,
  12345
)
// damage1 = 4 (rolled 1d6)

const damage2 = TrapService.calculateTrapDamage(
  'CROSSBOW_BOLT',
  character,
  12345
)
// damage2 = 10 (rolled 2d8)
```

### isClassVulnerable

Check if character class is vulnerable to specific trap.

**Signature**:
```typescript
function isClassVulnerable(
  trapType: TrapType,
  characterClass: CharacterClass
): boolean
```

**Parameters**:
- `trapType`: Trap type
- `characterClass`: Character's class

**Returns**: `true` if class is vulnerable, `false` otherwise

**Vulnerability Rules**:
```typescript
MAGE_BLASTER:    Mage, Bishop (only)
PRIEST_BLASTER:  Priest, Bishop, Lord (only)
Others:          All classes
```

**Example**:
```typescript
const vulnerable1 = TrapService.isClassVulnerable('MAGE_BLASTER', 'Mage')
// true

const vulnerable2 = TrapService.isClassVulnerable('MAGE_BLASTER', 'Fighter')
// false (immune to Mage Blaster)

const vulnerable3 = TrapService.isClassVulnerable('POISON_NEEDLE', 'Fighter')
// true (all classes vulnerable to poison needle)
```

## Implementation Details

### Trap Type Constants

```typescript
export const TRAP_TYPES = [
  'POISON_NEEDLE',
  'GAS_BOMB',
  'CROSSBOW_BOLT',
  'EXPLODING_BOX',
  'STUNNER',
  'TELEPORTER',
  'MAGE_BLASTER',
  'PRIEST_BLASTER',
  'ALARM'
] as const

export type TrapType = typeof TRAP_TYPES[number]
```

### Inspect Chance Calculation

```typescript
export function calculateInspectChance(character: Character): number {
  const agi = character.agility

  let multiplier: number
  switch (character.class) {
    case 'Thief':
      multiplier = 6
      break
    case 'Ninja':
      multiplier = 4
      break
    default:
      multiplier = 1
  }

  const chance = agi * multiplier
  return Math.min(95, chance)
}
```

### Disarm Chance Calculation

```typescript
export function calculateDisarmChance(
  character: Character,
  trapDifficulty: number
): number {
  // Calculate effective level
  let effectiveLevel = character.level

  if (character.class === 'Thief' || character.class === 'Ninja') {
    effectiveLevel += 50
  }

  // Base chance from level vs difficulty
  const baseChance = (effectiveLevel - trapDifficulty) * 5

  // Clamp to 5-95% range
  return Math.max(5, Math.min(95, baseChance))
}
```

### Inspect Trigger Chance

Small chance to trigger trap during inspection:

```typescript
export function calculateInspectTriggerChance(character: Character): number {
  // Base 2% trigger chance
  const baseTrigger = 2

  // Thieves/Ninjas have lower trigger chance
  if (character.class === 'Thief' || character.class === 'Ninja') {
    return 1  // 1% for specialists
  }

  return baseTrigger  // 2% for others
}
```

### Trap Damage Tables

```typescript
export const TRAP_DAMAGE: Record<TrapType, string> = {
  POISON_NEEDLE: '1d6',
  GAS_BOMB: '2d6',
  CROSSBOW_BOLT: '2d8',
  EXPLODING_BOX: '3d6',
  STUNNER: '1d4',
  TELEPORTER: '0',
  MAGE_BLASTER: '4d6',
  PRIEST_BLASTER: '4d6',
  ALARM: '0'
}
```

## Trap Type Reference

### POISON_NEEDLE
**Severity**: 3/10 (Low-Medium)
**Effect**: Poisons character opening chest
**Damage**: 1d6 HP
**Status**: Poison (continues after combat)
**Target**: Single (opener)
**Strategy**: Low threat, easily cured with LATUMOFIS

### GAS_BOMB
**Severity**: 5/10 (Medium)
**Effect**: Poison gas cloud damages entire party
**Damage**: 2d6 HP to each party member
**Status**: Poison (all party members)
**Target**: Party
**Strategy**: Moderate threat, can weaken entire party

### CROSSBOW_BOLT
**Severity**: 4/10 (Medium)
**Effect**: Crossbow fires at opener
**Damage**: 2d8 HP
**Status**: None
**Target**: Single (opener)
**Strategy**: Straightforward damage, no lasting effects

### EXPLODING_BOX
**Severity**: 6/10 (Medium-High)
**Effect**: Explosion damages entire party
**Damage**: 3d6 HP to each party member
**Status**: None
**Target**: Party
**Strategy**: High AoE damage, dangerous for low-level parties

### STUNNER
**Severity**: 5/10 (Medium)
**Effect**: Stuns/paralyzes opener
**Damage**: 1d4 HP
**Status**: Paralysis
**Target**: Single (opener)
**Strategy**: Can disable key party member, cured with LATUMOFIS

### TELEPORTER
**Severity**: 9/10 (Critical)
**Effect**: Teleports entire party to random dungeon location
**Damage**: None
**Status**: None
**Target**: Party
**Risk**: Can teleport into walls (instant party death) or dangerous areas
**Strategy**: Most dangerous trap, avoid triggering at all costs

### MAGE_BLASTER (Anti-Mage)
**Severity**: 7/10 (High)
**Effect**: Magic blast targets arcane casters
**Damage**: 4d6 HP
**Status**: None
**Target**: Mages and Bishops only
**Strategy**: Can kill low-level mages outright, non-mages immune

### PRIEST_BLASTER (Anti-Priest)
**Severity**: 7/10 (High)
**Effect**: Divine blast targets divine casters
**Damage**: 4d6 HP
**Status**: None
**Target**: Priests, Bishops, Lords only
**Strategy**: Can kill low-level priests outright, non-divine classes immune

### ALARM
**Severity**: 6/10 (Medium-High)
**Effect**: Triggers immediate monster encounter
**Damage**: None
**Status**: None
**Target**: Party (combat state)
**Strategy**: Forces combat when party may be unprepared

## Strategic Considerations

### Inspection Priority

**Always Inspect If**:
- Thief with AGI 16+ (95% success)
- Ninja with AGI 24 (95% success)
- Party has spell points for CALFO

**Never Inspect If**:
- Non-Thief with low AGI (<10)
- Better to use CALFO spell instead

### Disarm vs. Risk

**Always Disarm If**:
- TELEPORTER detected (too dangerous to trigger)
- MAGE_BLASTER or PRIEST_BLASTER (can kill casters)
- Party is low HP (any damage is dangerous)

**Consider Opening Without Disarm If**:
- POISON_NEEDLE (low damage, easy cure)
- CROSSBOW_BOLT (moderate damage, no status)
- High-level party (can tank the damage)

**Always Leave Chest If**:
- TELEPORTER and disarm keeps failing
- Party critically low on HP/spells
- Boss fight imminent

### Class Synergy

**Best Trap Handler**: Thief with AGI 16+
- 95% inspect chance
- +50 disarm bonus
- Low trigger chance (1%)

**Second Best**: High-level Fighter (51+)
- Poor inspect (AGI × 1)
- Same disarm as Level 1 Thief
- But can use CALFO for inspection

**Spell Support**: Priest with CALFO
- 95% trap identification
- No trigger risk
- Backup to Thief inspection

## Dependencies

Uses:
- `RandomService` (for inspect/disarm rolls, damage rolls)
- `StatusEffectService` (for poison, paralysis application)

No dependencies on combat or dungeon services.

## Testing

**Test File**: `tests/services/TrapService.test.ts`

**Key Test Cases**:

1. **Inspect chance calculation**
   ```typescript
   test('Thief AGI 16 has 95% inspect', () => {
     const thief = { class: 'Thief', agility: 16 }
     expect(TrapService.calculateInspectChance(thief)).toBe(95)
   })

   test('Fighter AGI 18 has 18% inspect', () => {
     const fighter = { class: 'Fighter', agility: 18 }
     expect(TrapService.calculateInspectChance(fighter)).toBe(18)
   })
   ```

2. **Disarm chance calculation**
   ```typescript
   test('Level 1 Thief has +50 bonus', () => {
     const thief = { class: 'Thief', level: 1 }
     const chance = TrapService.calculateDisarmChance(thief, 5)
     expect(chance).toBe(95) // (51 - 5) × 5 = 230 → capped
   })

   test('Level 51 Fighter equals Level 1 Thief', () => {
     const fighter = { class: 'Fighter', level: 51 }
     const thief = { class: 'Thief', level: 1 }
     expect(
       TrapService.calculateDisarmChance(fighter, 5)
     ).toBe(
       TrapService.calculateDisarmChance(thief, 5)
     )
   })
   ```

3. **Class vulnerability**
   ```typescript
   test('Mage vulnerable to MAGE_BLASTER', () => {
     expect(TrapService.isClassVulnerable('MAGE_BLASTER', 'Mage')).toBe(true)
   })

   test('Fighter immune to MAGE_BLASTER', () => {
     expect(TrapService.isClassVulnerable('MAGE_BLASTER', 'Fighter')).toBe(false)
   })
   ```

## Related

**Commands**:
- [InspectChestCommand](../commands/InspectChestCommand.md) - Uses this service
- [DisarmTrapCommand](../commands/DisarmTrapCommand.md) - Uses this service

**Services**:
- [ChestService](./ChestService.md) - Chest generation
- [SearchService](./SearchService.md) - Secret door/chest discovery

**Research**:
- [Trap Mechanics Validation](../research/trap-mechanics-validation.md) - Validated mechanics

**Game Design**:
- [Traps & Chests](../game-design/08-traps-chests.md) - Player guide
