# Command Layer Documentation

**Command pattern implementations for all user actions.**

Commands are organized by game scene to make them easier to find and understand in context.

## Command Catalog (46 Commands)

### Training Grounds (4 commands)
Character creation and roster management.

1. [CreateCharacterCommand](./training-grounds/CreateCharacterCommand.md) - Create new character
2. [DeleteCharacterCommand](./training-grounds/DeleteCharacterCommand.md) - Delete character
3. [ChangeClassCommand](./training-grounds/ChangeClassCommand.md) - Change character class
4. [InspectCharacterCommand](./training-grounds/InspectCharacterCommand.md) - View character sheet

### Gilgamesh's Tavern (4 commands)
Party formation and management.

5. [FormPartyCommand](./tavern/FormPartyCommand.md) - Create/modify party
6. [AddToPartyCommand](./tavern/AddToPartyCommand.md) - Add character to party
7. [RemoveFromPartyCommand](./tavern/RemoveFromPartyCommand.md) - Remove from party
8. [ChangeFormationCommand](./tavern/ChangeFormationCommand.md) - Move front/back

### Boltac's Trading Post (4 commands)
Equipment buying, selling, and identification.

9. [VisitShopCommand](./shop/VisitShopCommand.md) - Enter shop
10. [BuyItemCommand](./shop/BuyItemCommand.md) - Purchase item
11. [SellItemCommand](./shop/SellItemCommand.md) - Sell item
12. [IdentifyItemCommand](./shop/IdentifyItemCommand.md) - Identify unknown item

### Temple of Cant (2 commands)
Healing and resurrection services.

13. [VisitTempleCommand](./temple/VisitTempleCommand.md) - Enter temple
14. [ResurrectCharacterCommand](./temple/ResurrectCharacterCommand.md) - Temple resurrection

### Adventurer's Inn (2 commands)
Rest and level up.

15. [RestAtInnCommand](./inn/RestAtInnCommand.md) - Rest at inn
16. [LevelUpCharacterCommand](./inn/LevelUpCharacterCommand.md) - Level up at training

### Dungeon Exploration (12 commands)
Maze navigation and exploration.

17. [EnterDungeonCommand](./dungeon/EnterDungeonCommand.md) - Enter dungeon from town
18. [MoveForwardCommand](./dungeon/MoveForwardCommand.md) - Move party forward
19. [MoveBackwardCommand](./dungeon/MoveBackwardCommand.md) - Move party backward
20. [StrafeLeftCommand](./dungeon/StrafeLeftCommand.md) - Strafe left
21. [StrafeRightCommand](./dungeon/StrafeRightCommand.md) - Strafe right
22. [TurnLeftCommand](./dungeon/TurnLeftCommand.md) - Turn 90° left
23. [TurnRightCommand](./dungeon/TurnRightCommand.md) - Turn 90° right
24. [DescendStairsCommand](./dungeon/DescendStairsCommand.md) - Go down stairs
25. [AscendStairsCommand](./dungeon/AscendStairsCommand.md) - Go up stairs
26. [SearchCommand](./dungeon/SearchCommand.md) - Search for secret doors
27. [OpenDoorCommand](./dungeon/OpenDoorCommand.md) - Open door
28. [InspectCommand](./dungeon/InspectCommand.md) - Inspect tile

### Combat (6 commands)
Battle actions and tactics.

29. [AttackCommand](./combat/AttackCommand.md) - Physical attack
30. [CastSpellCommand](./combat/CastSpellCommand.md) - Cast spell in combat
31. [DispellCommand](./combat/DispellCommand.md) - Dispel undead (Priest/Bishop/Lord only)
32. [ParryCommand](./combat/ParryCommand.md) - Parry incoming attack
33. [FleeCommand](./combat/FleeCommand.md) - Attempt to flee combat
34. [UseItemCommand](./combat/UseItemCommand.md) - Use item in combat

### Chest & Traps (3 commands)
Treasure chest interaction.

35. [InspectChestCommand](./chest/InspectChestCommand.md) - Inspect chest for traps
36. [DisarmTrapCommand](./chest/DisarmTrapCommand.md) - Disarm identified trap
37. [OpenChestCommand](./chest/OpenChestCommand.md) - Open chest and collect treasure

### Character Management (5 commands)
Camp and inventory management.

38. [EquipItemCommand](./character/EquipItemCommand.md) - Equip weapon/armor
39. [UnequipItemCommand](./character/UnequipItemCommand.md) - Unequip item
40. [DropItemCommand](./character/DropItemCommand.md) - Drop item
41. [CastUtilitySpellCommand](./character/CastUtilitySpellCommand.md) - Non-combat spell
42. [LearnSpellCommand](./character/LearnSpellCommand.md) - Learn spell on level-up

### Meta & System (4 commands)
Game state and transitions.

43. [SaveGameCommand](./meta/SaveGameCommand.md) - Save game to IndexedDB
44. [LoadGameCommand](./meta/LoadGameCommand.md) - Load saved game
45. [ReplayCommand](./meta/ReplayCommand.md) - Replay event log
46. [EnterTownCommand](./meta/EnterTownCommand.md) - Enter town from dungeon

## Command Principles

**Orchestration**: Commands orchestrate service calls
**Validation**: Check preconditions before execution
**Events**: Create events for event log
**Immutable**: Return new state, never mutate

## Getting Started

1. Read [Creation Guide](./creation-guide.md) for command structure
2. Read [Patterns](./patterns.md) for common patterns
3. Check individual command docs for implementation details
