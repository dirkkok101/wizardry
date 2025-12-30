# AttackService

**Pure function service for attack resolution and hit calculation.**

## Responsibility

Resolves physical attacks including hit probability calculation, critical hits, and special attack types (decapitation for Ninjas).

## API Reference

### resolveAttack

Resolve a single physical attack.

**Signature**:
```typescript
function resolveAttack(
  attacker: Combatant,
  defender: Combatant
): AttackResult
```

**Parameters**:
- `attacker`: Character or monster attacking
- `defender`: Target of attack

**Returns**: Attack result containing hit/miss, damage, critical status

**Example**:
```typescript
const fighter = createCharacter({ class: 'Fighter', level: 5 })
const orc = createMonster({ name: 'Orc', ac: 5 })

const result = AttackService.resolveAttack(fighter, orc)
// result = { hit: true, damage: 12, critical: false, decapitate: false }
```

### calculateHitChance

Calculate probability of attack hitting target.

**Signature**:
```typescript
function calculateHitChance(
  attacker: Combatant,
  defenderAC: number
): number
```

**Parameters**:
- `attacker`: Attacking combatant
- `defenderAC`: Defender's armor class (lower = harder to hit)

**Returns**: Hit chance percentage (0-95%, capped at 95%)

**Formula**:
```typescript
// Step 1: Calculate HPCALCMD (hit calculation modifier)
// Fighter, Priest, Samurai, Lord:
HPCALCMD = 2 + floor(Level / 3)

// Mage, Thief, Bishop, Ninja:
HPCALCMD = floor(Level / 5)

// Step 2: Calculate hit chance
HitChance% = (HPCALCMD + MonsterAC + 29) × 5%
// Capped at 95% (always 5% miss chance)
```

**Example**:
```typescript
const level5Fighter = createCharacter({ class: 'Fighter', level: 5 })
const hitChance = AttackService.calculateHitChance(level5Fighter, 5)
// HPCALCMD = 2 + floor(5/3) = 3
// HitChance = (3 + 5 + 29) × 5% = 185% → capped at 95%

const level5Mage = createCharacter({ class: 'Mage', level: 5 })
const mageHitChance = AttackService.calculateHitChance(level5Mage, 5)
// HPCALCMD = floor(5/5) = 1
// HitChance = (1 + 5 + 29) × 5% = 175% → capped at 95%
```

### calculateCriticalChance

Calculate critical hit chance based on attacker level.

**Signature**:
```typescript
function calculateCriticalChance(level: number): number
```

**Parameters**:
- `level`: Attacker's character level

**Returns**: Critical hit chance percentage (2-50%, capped at 50%)

**Formula**:
```typescript
CriticalChance% = (2 × Level)%
Maximum = 50%
```

**Example**:
```typescript
const critChance1 = AttackService.calculateCriticalChance(1)
// Result: 2%

const critChance10 = AttackService.calculateCriticalChance(10)
// Result: 20%

const critChance50 = AttackService.calculateCriticalChance(50)
// Result: 50% (capped)
```

### resolveDecapitation

Resolve decapitation attempt (instant kill) for Ninjas.

**Signature**:
```typescript
function resolveDecapitation(
  attacker: Combatant,
  defender: Combatant,
  isCritical: boolean
): boolean
```

**Parameters**:
- `attacker`: Ninja attempting decapitation
- `defender`: Target monster
- `isCritical`: Whether attack is critical hit

**Returns**: True if decapitation succeeds (instant kill)

**Example**:
```typescript
const ninja = createCharacter({ class: 'Ninja', level: 10 })
const dragon = createMonster({ name: 'Dragon', hp: 500 })

const result = AttackService.resolveAttack(ninja, dragon)
if (result.decapitate) {
  // Dragon dies instantly regardless of 500 HP
}
```

### getAttacksPerRound

Calculate number of attacks per round based on class and level.

**Signature**:
```typescript
function getAttacksPerRound(
  characterClass: Class,
  level: number
): number
```

**Parameters**:
- `characterClass`: Character's class
- `level`: Character's level

**Returns**: Number of attacks (1-10)

**Formula**:
```typescript
// Fighter, Samurai, Lord:
AttacksPerRound = 1 + floor(Level / 5)
Max = 10 attacks

// Ninja:
AttacksPerRound = 2 + floor(Level / 5)
Max = 10 attacks

// Others (Mage, Priest, Thief, Bishop):
AttacksPerRound = 1  // Fixed
```

**Example**:
```typescript
const attacks1 = AttackService.getAttacksPerRound('Fighter', 1)
// Result: 1

const attacks5 = AttackService.getAttacksPerRound('Fighter', 5)
// Result: 2

const ninjaAttacks1 = AttackService.getAttacksPerRound('Ninja', 1)
// Result: 2

const ninjaAttacks40 = AttackService.getAttacksPerRound('Ninja', 40)
// Result: 10 (capped)
```

### applyStrengthModifiers

Apply strength modifiers to hit chance and damage.

**Signature**:
```typescript
function applyStrengthModifiers(
  strength: number
): { hitBonus: number; damageBonus: number }
```

**Parameters**:
- `strength`: Attacker's strength stat (3-18+)

**Returns**: Hit bonus percentage and damage modifier

**Strength Table**:
- STR 3: -15% to-hit, -3 damage
- STR 4: -10% to-hit, -2 damage
- STR 5: -5% to-hit, -1 damage
- STR 6-15: 0% to-hit, 0 damage
- STR 16: +5% to-hit, +1 damage
- STR 17: +10% to-hit, +2 damage
- STR 18+: +15% to-hit, +3 damage

**Example**:
```typescript
const modifiers = AttackService.applyStrengthModifiers(18)
// Result: { hitBonus: 15, damageBonus: 3 }
```

## Dependencies

Uses:
- `DamageService` (calculate final damage)
- `RandomService` (hit/critical/decapitation rolls)

## Testing

See [AttackService.test.ts](../../tests/services/AttackService.test.ts)

**Key test cases**:
- Hit chance calculation for all classes
- Critical hit chance scaling with level
- Strength modifiers applied correctly
- Attacks per round for all classes
- Ninja decapitation on critical
- AC -5 vs AC 5 hit chance difference
- 95% hit cap enforcement
- 50% critical cap enforcement

## Related

- [Combat Formulas](../research/combat-formulas.md) - All attack formulas
- [DamageService](./DamageService.md) - Damage calculation
- [AttackCommand](../commands/AttackCommand.md) - Uses this service
- [Combat System](../systems/combat-system.md) - Combat overview
