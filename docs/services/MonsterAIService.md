# MonsterAIService

**Pure function service for monster behavior and decision-making.**

## Responsibility

Implements monster AI logic including action selection, targeting, spell usage, and special ability activation during combat.

## API Reference

### selectAction

Determine next action for a monster based on AI type and combat state.

**Signature**:
```typescript
function selectAction(
  monster: Monster,
  combatState: CombatState,
  aiProfile: AIProfile
): MonsterAction
```

**Parameters**:
- `monster`: Monster making the decision
- `combatState`: Current combat state with party and monster groups
- `aiProfile`: AI behavior profile (aggressive, defensive, spellcaster, etc.)

**Returns**: Action object (attack, cast spell, flee, special ability)

**Throws**:
- `InvalidMonsterError` if monster is dead or invalid
- `InvalidCombatStateError` if combat state is malformed

**Example**:
```typescript
const monster = createMonster({ name: "Lvl 5 Mage", aiType: "spellcaster" })
const combatState = createCombatState()
const aiProfile = getAIProfile("spellcaster")

const action = MonsterAIService.selectAction(monster, combatState, aiProfile)
// action = { type: "cast_spell", spell: "MAHALITO", target: partyGroup }
```

### selectTarget

Choose target for monster attack or spell.

**Signature**:
```typescript
function selectTarget(
  monster: Monster,
  combatState: CombatState,
  targetType: TargetType
): Target
```

**Parameters**:
- `monster`: Monster selecting target
- `combatState`: Current combat state
- `targetType`: "single_character", "character_group", "party"

**Returns**: Selected target (character ID or group)

**Throws**:
- `NoValidTargetsError` if no valid targets available

**Example**:
```typescript
const target = MonsterAIService.selectTarget(
  monster,
  combatState,
  "single_character"
)
// target = { type: "character", id: "char-1" } // Front-row fighter
```

### shouldCastSpell

Determine if monster should cast spell this round.

**Signature**:
```typescript
function shouldCastSpell(
  monster: Monster,
  combatState: CombatState,
  aiProfile: AIProfile
): boolean
```

**Parameters**:
- `monster`: Monster with spellcasting ability
- `combatState`: Current combat state
- `aiProfile`: AI behavior profile

**Returns**: True if monster should cast spell, false if should melee attack

**Example**:
```typescript
const shouldCast = MonsterAIService.shouldCastSpell(
  monster,
  combatState,
  aiProfile
)
// shouldCast = true (low HP party members, healing needed)
```

### selectSpell

Choose which spell monster should cast.

**Signature**:
```typescript
function selectSpell(
  monster: Monster,
  combatState: CombatState,
  availableSpells: Spell[]
): Spell
```

**Parameters**:
- `monster`: Spellcasting monster
- `combatState`: Current combat state
- `availableSpells`: List of spells monster can cast

**Returns**: Selected spell to cast

**Throws**:
- `NoSpellsAvailableError` if spell list is empty

**Example**:
```typescript
const spell = MonsterAIService.selectSpell(
  monster,
  combatState,
  mageSpells
)
// spell = "MAHALITO" (4d6 fire damage to group)
```

### shouldFlee

Determine if monster/group should attempt to flee.

**Signature**:
```typescript
function shouldFlee(
  monsterGroup: MonsterGroup,
  combatState: CombatState
): boolean
```

**Parameters**:
- `monsterGroup`: Group of monsters
- `combatState`: Current combat state

**Returns**: True if group should attempt to flee

**Notes**: Only certain monster types can flee (Rogues, Thieves, Coyotes, etc.)

**Example**:
```typescript
const shouldRun = MonsterAIService.shouldFlee(rogueGroup, combatState)
// shouldRun = true (rogues at <25% HP)
```

### selectSpecialAbility

Choose which special ability to use (breath weapon, decapitate, etc.).

**Signature**:
```typescript
function selectSpecialAbility(
  monster: Monster,
  combatState: CombatState
): SpecialAbility | null
```

**Parameters**:
- `monster`: Monster with special abilities
- `combatState`: Current combat state

**Returns**: Selected ability or null if none appropriate

**Example**:
```typescript
const ability = MonsterAIService.selectSpecialAbility(dragon, combatState)
// ability = { type: "breath_weapon", damageType: "fire", dice: "10d6" }
```

## AI Profiles

### Aggressive
- Always attacks, never flees
- Targets front-row fighters
- Uses breath weapons frequently

### Defensive
- Targets weakest party members
- Flees at low HP
- Uses healing/buff spells

### Spellcaster
- Prefers spells over melee (80% of time)
- Targets casters with silence/sleep
- Uses area damage when multiple targets clustered

### Boss
- Never flees
- Uses special abilities strategically
- Calls reinforcements when HP < 50%
- Targets biggest threats first

### Random
- Random action selection
- Random targeting
- No strategic behavior

## Dependencies

Uses:
- `MonsterService` (monster stats, abilities)
- `CombatService` (combat state queries)
- `SpellService` (spell validation)
- `RandomService` (weighted random selection)

## Testing

See [MonsterAIService.test.ts](../../tests/services/MonsterAIService.test.ts)

**Key test cases**:
- Aggressive AI targets front row
- Defensive AI flees at low HP
- Spellcaster prefers spells to melee
- Boss never flees even at 1 HP
- Special abilities selected appropriately
- Target selection prioritizes threats

## Related

- [Monster Reference](../research/monster-reference.md) - All monster AI types
- [CombatService](./CombatService.md) - Combat resolution
- [MonsterService](./MonsterService.md) - Monster stats
- [Combat System](../systems/combat-system.md) - Combat overview
