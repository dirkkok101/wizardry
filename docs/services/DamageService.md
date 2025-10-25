# DamageService

**Pure function service for damage calculation and application.**

## Responsibility

Calculates damage from physical attacks and spell effects, applies damage to combatants, and handles damage reduction (armor, resistances).

## API Reference

### calculateWeaponDamage

Calculate damage from weapon attack.

**Signature**:
```typescript
function calculateWeaponDamage(
  weapon: Weapon,
  strength: number
): number
```

**Parameters**:
- `weapon`: Equipped weapon with damage dice
- `strength`: Attacker's strength stat

**Returns**: Total damage after rolling weapon dice and applying strength modifier

**Formula**:
```typescript
Damage = WeaponDice + STR_Modifier

// STR Modifiers:
// STR 3: -3
// STR 4: -2
// STR 5: -1
// STR 6-15: 0
// STR 16: +1
// STR 17: +2
// STR 18+: +3
```

**Example**:
```typescript
const longSword = { name: 'Long Sword', damage: '1d8' }
const damage = DamageService.calculateWeaponDamage(longSword, 18)
// Roll 1d8 (yields 1-8) + 3 STR bonus = 4-11 damage

const dagger = { name: 'Dagger', damage: '1d4' }
const lowDamage = DamageService.calculateWeaponDamage(dagger, 3)
// Roll 1d4 (yields 1-4) - 3 STR penalty = -2 to 1 damage (min 1)
```

### calculateNinjaUnarmedDamage

Calculate damage for Ninja unarmed attacks.

**Signature**:
```typescript
function calculateNinjaUnarmedDamage(strength: number): number
```

**Parameters**:
- `strength`: Ninja's strength stat

**Returns**: Unarmed damage

**Formula**:
```typescript
UnarmedDamage = (1d4 + 1d4) + STR_Modifier
// Average: ~5 + STR before level bonuses
```

**Example**:
```typescript
const damage = DamageService.calculateNinjaUnarmedDamage(18)
// Roll 1d4 + 1d4 (yields 2-8) + 3 STR = 5-11 damage
```

### calculateSpellDamage

Calculate damage from spell effect.

**Signature**:
```typescript
function calculateSpellDamage(spell: Spell): number
```

**Parameters**:
- `spell`: Spell with damage dice specification

**Returns**: Damage rolled from spell dice

**Example**:
```typescript
const halito = { name: 'HALITO', damage: '1d8', damageType: 'fire' }
const damage = DamageService.calculateSpellDamage(halito)
// Roll 1d8 = 1-8 fire damage

const mahalito = { name: 'MAHALITO', damage: '4d6', damageType: 'fire' }
const bigDamage = DamageService.calculateSpellDamage(mahalito)
// Roll 4d6 = 4-24 fire damage
```

### applyDamage

Apply damage to combatant, reducing HP.

**Signature**:
```typescript
function applyDamage(
  combatant: Combatant,
  damage: number
): Combatant
```

**Parameters**:
- `combatant`: Target taking damage
- `damage`: Amount of damage to apply

**Returns**: New combatant with reduced HP (immutable)

**Example**:
```typescript
const fighter = createCharacter({ hp: 50, maxHP: 50 })
const damaged = DamageService.applyDamage(fighter, 20)
// damaged.hp = 30

const dead = DamageService.applyDamage(fighter, 60)
// dead.hp = 0 (capped at 0, character dies)
```

### distributeGroupDamage

Distribute damage across monster group.

**Signature**:
```typescript
function distributeGroupDamage(
  group: Monster[],
  totalDamage: number
): Monster[]
```

**Parameters**:
- `group`: Array of monsters in target group
- `totalDamage`: Total damage to distribute

**Returns**: New array of monsters with damage applied

**Notes**: Damage distributed evenly or randomly across group members

**Example**:
```typescript
const orcs = [
  createMonster({ name: 'Orc', hp: 20 }),
  createMonster({ name: 'Orc', hp: 20 }),
  createMonster({ name: 'Orc', hp: 20 })
]

const damaged = DamageService.distributeGroupDamage(orcs, 30)
// Each orc takes ~10 damage (30 / 3)
// damaged[0].hp = 10, damaged[1].hp = 10, damaged[2].hp = 10
```

### calculateCriticalDamage

Calculate critical hit damage multiplier.

**Signature**:
```typescript
function calculateCriticalDamage(baseDamage: number): number
```

**Parameters**:
- `baseDamage`: Base damage before critical

**Returns**: Damage after critical multiplier

**Notes**: Formula needs research; may be 2x or special calculation

**Example**:
```typescript
const damage = DamageService.calculateCriticalDamage(15)
// Result: 30 (if 2x multiplier)
```

### applyResistances

Apply damage resistances and vulnerabilities.

**Signature**:
```typescript
function applyResistances(
  damage: number,
  damageType: DamageType,
  resistances: Resistance[]
): number
```

**Parameters**:
- `damage`: Base damage amount
- `damageType`: Type of damage (fire, cold, holy, magic, physical)
- `resistances`: Target's resistances/vulnerabilities

**Returns**: Damage after resistance modifiers

**Example**:
```typescript
const fireDamage = DamageService.applyResistances(
  20,
  'fire',
  [{ type: 'fire', modifier: 0.5 }]  // 50% fire resistance
)
// Result: 10 (halved)

const coldDamage = DamageService.applyResistances(
  20,
  'cold',
  [{ type: 'cold', modifier: 2.0 }]  // 2x cold vulnerability
)
// Result: 40 (doubled)
```

## Dependencies

Uses:
- `RandomService` (roll damage dice)

## Testing

See [DamageService.test.ts](../../tests/services/DamageService.test.ts)

**Key test cases**:
- Weapon damage with STR modifiers
- Ninja unarmed damage calculation
- Spell damage dice rolling
- Damage application reduces HP
- HP capped at 0 (no negative HP)
- Group damage distribution
- Resistance/vulnerability modifiers
- Critical damage multiplier

## Related

- [Combat Formulas](../research/combat-formulas.md) - Damage formulas
- [AttackService](./AttackService.md) - Uses damage calculation
- [SpellCastingService](./SpellCastingService.md) - Uses spell damage
- [Equipment Reference](../research/equipment-reference.md) - Weapon damage dice
