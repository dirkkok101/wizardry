# System Deep-Dives

**Comprehensive documentation of major game systems.**

## Available Systems

1. [Party System](./party-system.md) - Party management, formation, membership
2. [Spell System](./spell-system.md) - Spell points, casting, learning
3. [Combat System](./combat-system.md) - Initiative, resolution, damage
4. [Character Creation System](./character-creation-system.md) - Creation flow, races, classes
5. [First-Person Rendering](./first-person-rendering.md) - 3D view calculation
6. [Automap System](./automap-system.md) - Blueprint map rendering
7. [Town System](./town-system.md) - Services (inn, temple, shop, training)
8. [Event Sourcing](./event-sourcing.md) - Replay & persistence
9. [Dungeon System](./dungeon-system.md) - Maps, encounters, tiles

## What Are System Docs?

System docs provide **comprehensive overviews** of major game systems, connecting multiple services, commands, and game mechanics.

**Use system docs to**:
- Understand how components work together
- See the big picture of a game feature
- Learn design decisions and tradeoffs
- Find entry points for implementation

**Use service/command docs to**:
- Get API reference for specific functions
- See code examples
- Understand single-responsibility components

## Documentation Approach

Each system deep-dive follows this structure:

1. **Overview** - Key concepts and system purpose
2. **Architecture** - Services involved, commands involved, data structures
3. **Detailed Mechanics** - Formulas, calculations, rules
4. **Flow Diagrams** - Text-based or descriptions of process flows
5. **Related Documentation** - Links to services, commands, game design, research

## Reading Order Recommendations

**For Implementers**:
1. Start with [Party System](./party-system.md) - Core game abstraction
2. Read [Character Creation System](./character-creation-system.md) - Entry point
3. Read [Town System](./town-system.md) - Starting location
4. Read [Dungeon System](./dungeon-system.md) - Main gameplay
5. Read [Combat System](./combat-system.md) - Core challenge
6. Read [Spell System](./spell-system.md) - Major subsystem

**For Designers**:
1. Start with [Event Sourcing](./event-sourcing.md) - Unique architecture
2. Read [Combat System](./combat-system.md) - Core mechanics
3. Read [Spell System](./spell-system.md) - Major feature
4. Read [Party System](./party-system.md) - Core abstraction

**For UI/UX Developers**:
1. Start with [First-Person Rendering](./first-person-rendering.md) - Visual system
2. Read [Automap System](./automap-system.md) - Navigation UI
3. Read [Party System](./party-system.md) - UI layout requirements
4. Read [Town System](./town-system.md) - Service menus

## Related Documentation

- [Services Documentation](../services/README.md) - 40+ service APIs
- [Commands Documentation](../commands/README.md) - 40+ command patterns
- [Game Design Documentation](../game-design/README.md) - Player-facing mechanics
- [Architecture Overview](../architecture.md) - Technical architecture
- [Research Documentation](../research/week1-research-summary.md) - Source validation
