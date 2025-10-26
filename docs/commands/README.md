# Command Layer Documentation

**Command pattern implementations for all user actions.**

## Command Catalog (40+ Commands)

### Navigation Commands
1. [MoveForwardCommand](./MoveForwardCommand.md) - Move party forward
2. [MoveBackwardCommand](./MoveBackwardCommand.md) - Move party backward
3. [StrafeLeftCommand](./StrafeLeftCommand.md) - Strafe left
4. [StrafeRightCommand](./StrafeRightCommand.md) - Strafe right
5. [TurnLeftCommand](./TurnLeftCommand.md) - Turn 90° left
6. [TurnRightCommand](./TurnRightCommand.md) - Turn 90° right

### Combat Commands
7. [AttackCommand](./AttackCommand.md) - Physical attack
8. [CastSpellCommand](./CastSpellCommand.md) - Cast spell in combat
9. [DefendCommand](./DefendCommand.md) - Defensive stance
10. [ParryCommand](./ParryCommand.md) - Parry incoming attack
11. [FleeCommand](./FleeCommand.md) - Attempt to flee combat
12. [UseItemCommand](./UseItemCommand.md) - Use item in combat

### Character Management
13. [CreateCharacterCommand](./CreateCharacterCommand.md) - Create new character
14. [DeleteCharacterCommand](./DeleteCharacterCommand.md) - Delete character
15. [InspectCharacterCommand](./InspectCharacterCommand.md) - View character sheet
16. [LevelUpCharacterCommand](./LevelUpCharacterCommand.md) - Level up at training
17. [ChangeClassCommand](./ChangeClassCommand.md) - Change character class

### Party Management
18. [FormPartyCommand](./FormPartyCommand.md) - Create/modify party
19. [AddToPartyCommand](./AddToPartyCommand.md) - Add character to party
20. [RemoveFromPartyCommand](./RemoveFromPartyCommand.md) - Remove from party
21. [ChangeFormationCommand](./ChangeFormationCommand.md) - Move front/back

### Town Commands
22. [EnterTownCommand](./EnterTownCommand.md) - Enter town from dungeon
23. [RestAtInnCommand](./RestAtInnCommand.md) - Rest at inn
24. [VisitTempleCommand](./VisitTempleCommand.md) - Enter temple
25. [ResurrectCharacterCommand](./ResurrectCharacterCommand.md) - Temple resurrection
26. [VisitShopCommand](./VisitShopCommand.md) - Enter shop
27. [BuyItemCommand](./BuyItemCommand.md) - Purchase item
28. [SellItemCommand](./SellItemCommand.md) - Sell item

### Dungeon Commands
29. [EnterDungeonCommand](./EnterDungeonCommand.md) - Enter dungeon from town
30. [DescendStairsCommand](./DescendStairsCommand.md) - Go down stairs
31. [AscendStairsCommand](./AscendStairsCommand.md) - Go up stairs
32. [SearchCommand](./SearchCommand.md) - Search for secret doors
33. [OpenDoorCommand](./OpenDoorCommand.md) - Open door
34. [InspectCommand](./InspectCommand.md) - Inspect tile

### Inventory Commands
35. [EquipItemCommand](./EquipItemCommand.md) - Equip weapon/armor
36. [UnequipItemCommand](./UnequipItemCommand.md) - Unequip item
37. [DropItemCommand](./DropItemCommand.md) - Drop item
38. [IdentifyItemCommand](./IdentifyItemCommand.md) - Identify unknown item

### Spell Commands
39. [CastUtilitySpellCommand](./CastUtilitySpellCommand.md) - Non-combat spell
40. [LearnSpellCommand](./LearnSpellCommand.md) - Learn spell on level-up

### Meta Commands
41. [SaveGameCommand](./SaveGameCommand.md) - Save game to IndexedDB
42. [LoadGameCommand](./LoadGameCommand.md) - Load saved game
43. [ReplayCommand](./ReplayCommand.md) - Replay event log

## Command Principles

**Orchestration**: Commands orchestrate service calls
**Validation**: Check preconditions before execution
**Events**: Create events for event log
**Immutable**: Return new state, never mutate

## Getting Started

1. Read [Creation Guide](./creation-guide.md) for command structure
2. Read [Patterns](./patterns.md) for common patterns
3. Check individual command docs for implementation details
