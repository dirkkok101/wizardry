# UseItemCommand

**Command for using consumable item in combat.**

## Responsibility

Uses consumable item (potion, scroll, etc.) during combat. Validates character has item in inventory, item is usable in combat, and target is valid. Applies item effect and removes item from inventory (if single-use).

## Command Flow

**Preconditions**:
- Game mode must be `COMBAT`
- Character must be alive (HP > 0)
- Character must not be paralyzed or asleep
- Character must have item in inventory
- Item must be usable in combat
- Target must be valid for item's effect

**Services Called**:
1. `InventoryService.hasItem()` - Check character has item
2. `ItemService.getItem()` - Get item data
3. `ItemService.validateCombatUse()` - Check combat usability
4. `ItemService.validateTarget()` - Check target valid
5. `ItemService.applyEffect()` - Apply item effect
6. `InventoryService.removeItem()` - Remove if single-use
7. `CombatService.queueAction()` - Add to action queue

**Events Created**:
- `ItemUsedEvent` - Item used in combat
- `HealingAppliedEvent` - If healing item
- `ItemRemovedEvent` - If single-use item consumed

**State Changes**:
- `combat.actionQueue` updated with item use action
- Item effect applied during resolution (heal HP, cure status, etc.)
- Item removed from inventory if single-use
- Combat log updated with item use

## API Reference

### constructor

Create use item command.

**Signature**:
```typescript
constructor(
  characterId: string,
  itemId: string,
  targetId?: string
)
```

**Parameters**:
- `characterId`: ID of character using item
- `itemId`: ID of item to use
- `targetId`: Optional target character ID (for healing items, etc.)

### execute

Execute use item command.

**Signature**:
```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state

**Returns**: New game state with item used

**Throws**:
- `InvalidGameModeError` if not in COMBAT mode
- `InvalidCharacterError` if character invalid/dead/paralyzed
- `ItemNotFoundError` if character doesn't have item
- `InvalidItemUseError` if item not usable in combat
- `InvalidTargetError` if target invalid for item

**Example**:
```typescript
// Use healing potion on self
const command = new UseItemCommand('char-1', 'healing-potion', 'char-1')
const newState = command.execute(state)

// Character healed, item removed from inventory
```

## Preconditions

1. **Game Mode Check**:
```typescript
if (state.mode !== 'COMBAT') {
  throw new InvalidGameModeError('Must be in combat to use item')
}
```

2. **Character Validation**:
```typescript
const character = state.party.members.find(m => m.id === characterId)

if (!character) {
  throw new InvalidCharacterError('Character not found')
}

if (character.hp <= 0) {
  throw new InvalidCharacterError('Character is dead')
}

if (character.status.includes('PARALYZED') || character.status.includes('ASLEEP')) {
  throw new InvalidCharacterError('Character cannot act')
}
```

3. **Inventory Check**:
```typescript
const hasItem = InventoryService.hasItem(character, itemId)

if (!hasItem) {
  throw new ItemNotFoundError(`Character does not have ${itemId}`)
}
```

4. **Combat Usability Check**:
```typescript
const item = ItemService.getItem(itemId)

if (!item.usableIn.includes('combat')) {
  throw new InvalidItemUseError(`${itemId} cannot be used in combat`)
}
```

5. **Target Validation**:
```typescript
if (item.requiresTarget) {
  if (!targetId) {
    throw new InvalidTargetError('Item requires target')
  }

  ItemService.validateTarget(state.party, targetId, item.targetType)
}
```

## Services Used

**InventoryService**:
- `hasItem()` - Check character has item
- `removeItem()` - Remove item if consumed

**ItemService**:
- `getItem()` - Get item data
- `validateCombatUse()` - Check combat usability
- `validateTarget()` - Check target valid
- `applyEffect()` - Apply item effect

**CombatService**:
- `queueAction()` - Add to action queue

**EventService**:
- `createItemUsedEvent()` - Log item use
- `createItemRemovedEvent()` - Log item consumed

## Implementation Example

```typescript
class UseItemCommand implements Command {
  constructor(
    private characterId: string,
    private itemId: string,
    private targetId?: string
  ) {}

  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'COMBAT') {
      throw new InvalidGameModeError('Must be in combat to use item')
    }

    // Precondition: Validate user
    const character = state.party.members.find(m => m.id === this.characterId)

    if (!character) {
      throw new InvalidCharacterError('Character not found')
    }

    if (character.hp <= 0) {
      throw new InvalidCharacterError('Character is dead')
    }

    // Precondition: Check inventory
    if (!InventoryService.hasItem(character, this.itemId)) {
      throw new ItemNotFoundError(`Character does not have ${this.itemId}`)
    }

    // Get item data
    const item = ItemService.getItem(this.itemId)

    // Precondition: Check combat usability
    if (!item.usableIn.includes('combat')) {
      throw new InvalidItemUseError(`${this.itemId} cannot be used in combat`)
    }

    // Precondition: Validate target
    if (item.requiresTarget) {
      if (!this.targetId) {
        throw new InvalidTargetError('Item requires target')
      }

      ItemService.validateTarget(state.party, this.targetId, item.targetType)
    }

    // Create item use action
    const itemAction: CombatAction = {
      type: 'USE_ITEM',
      actorId: this.characterId,
      itemId: this.itemId,
      targetId: this.targetId
    }

    // Queue action
    let newState = CombatService.queueAction(state, itemAction)

    // Add event
    newState = EventService.addEvent(
      newState,
      EventService.createItemUsedEvent(this.characterId, this.itemId)
    )

    // Check if all actions queued → start resolution
    if (CombatService.allActionsQueued(newState.combat)) {
      newState = CombatService.resolveRound(newState)
    }

    return newState
  }
}
```

## Combat-Usable Items

**Healing Potions**:
- **Lesser Healing Potion**: Restore 1d8 HP
- **Healing Potion**: Restore 2d8 HP
- **Greater Healing Potion**: Restore 4d8 HP
- **Full Healing Potion**: Restore all HP

**Cure Potions**:
- **Antidote**: Cure poison
- **Cure Paralysis**: Remove paralysis
- **Awakening**: Wake from sleep

**Combat Scrolls**:
- **Scroll of HALITO**: Cast HALITO (fire) spell
- **Scroll of BADIOS**: Cast BADIOS (holy) spell
- **Scroll of MAHALITO**: Cast MAHALITO (fire) spell

**Buff Items**:
- **Potion of Defense**: +2 AC for battle
- **Potion of Strength**: +2 damage for battle

**Throwable Items**:
- **Holy Water**: Damage to undead group
- **Firebomb**: Fire damage to enemy group

## Item Resolution

**Resolution happens in initiative order**:

1. **Healing Items**: Apply immediately
   ```typescript
   target.hp = Math.min(target.hp + healAmount, target.maxHP)
   ```

2. **Cure Items**: Remove status effect
   ```typescript
   target.status = target.status.filter(s => s !== curedStatus)
   ```

3. **Scroll Items**: Cast spell effect
   ```typescript
   SpellCastingService.resolveSpell(spell, target)
   ```

4. **Remove Item**: If single-use
   ```typescript
   newState = InventoryService.removeItem(character, itemId)
   ```

## Strategic Use

**When to Use Items**:
- Priest dead/silenced (can't heal with spells)
- Out of spell points (items don't use points)
- Need instant healing (faster than spell in some cases)
- Emergency cure (antidote, paralysis)

**When NOT to Use Items**:
- Have spell points and priest available (save items)
- Items expensive/rare (conserve resources)
- Not in danger (save for emergencies)

## Testing

See [UseItemCommand.test.ts](../../tests/commands/UseItemCommand.test.ts)

**Key test cases**:
- Use healing potion on self (success)
- Use healing potion on ally (success)
- Use without having item (throws error)
- Use non-combat item in combat (throws error)
- Dead character cannot use item (throws error)
- Paralyzed character cannot use item (throws error)
- Single-use item removed after use
- Reusable item not removed
- Item effect applied correctly
- Use outside combat mode (throws error)

## Related

**Services**:
- [ItemService](../services/ItemService.md)
- [InventoryService](../services/InventoryService.md)
- [CombatService](../services/CombatService.md)

**Commands**:
- [AttackCommand](./AttackCommand.md)
- [CastSpellCommand](./CastSpellCommand.md)
- [EquipItemCommand](./EquipItemCommand.md) - Equipment management

**Game Design**:
- [Items & Equipment](../game-design/11-items-equipment.md)
- [Combat](../game-design/05-combat.md)

**Research**:
- [Equipment Reference](../research/equipment-reference.md)
