# Getting Started

**Quick start guide for understanding the Wizardry remake codebase.**

## For New Developers

### 1. Read This First

Start here to understand the system:
1. [Architecture Overview](./architecture.md) - Technical architecture
2. [Game Design Overview](./game-design/01-overview.md) - What we're building
3. [Research Summary](./research/week1-research-summary.md) - Validation & accuracy

### 2. Understanding the Code Structure

```
src/
├── commands/     # Command layer (user actions)
├── services/     # Service layer (business logic)
├── types/        # TypeScript type definitions
├── data/         # JSON data files (spells, monsters, maps)
└── ui/           # UI layer (Canvas rendering)

docs/
├── services/     # Service documentation
├── commands/     # Command documentation
├── game-design/  # Game mechanics
└── research/     # Source validation
```

### 3. Key Concepts

**Party-First**: Everything revolves around the party (not individual characters)

**Event Sourcing**: All actions create events, state derived from replay

**Modal States**: TOWN → NAVIGATION ↔ COMBAT (explicit transitions)

**Spell Points**: Not D&D slots; separate pools per level (1-7)

**Body Recovery**: Dead characters become items in dungeon, retrievable

### 4. Read These Docs Next

**If you're implementing services**:
- [Service Creation Guide](./services/creation-guide.md)
- [Service Testing Guide](./services/testing-guide.md)
- [Service Patterns](./services/patterns.md)

**If you're implementing commands**:
- [Command Creation Guide](./commands/creation-guide.md)
- [Command Testing Guide](./commands/testing-guide.md)
- [Command Patterns](./commands/patterns.md)

**If you're implementing game systems**:
- [Systems Overview](./systems/README.md)
- [Combat System](./systems/combat-system.md)
- [Spell System](./systems/spell-system.md)

### 5. Development Workflow

1. Read relevant documentation
2. Write failing test (TDD)
3. Implement minimal code to pass test
4. Refactor if needed
5. Commit frequently (small commits)

### 6. Common Questions

**Q: Why party-first instead of adapting roguelike?**
A: Wizardry's party mechanics are fundamentally different. Building party-first ensures correct design from day one.

**Q: Why spell points instead of slots?**
A: Validated against original Wizardry 1 sources. Original uses spell points, not D&D-style memorization.

**Q: Why modal states?**
A: Different game modes have different valid actions. Explicit states prevent bugs (can't attack in town, can't shop in dungeon).

**Q: What's the body recovery system?**
A: When character dies, body remains at death location. New party can retrieve body and resurrect at temple. Unique to Wizardry.

### 7. Need Help?

- Check [Service Docs](./services/README.md) for service API reference
- Check [Command Docs](./commands/README.md) for command reference
- Check [Game Design Docs](./game-design/README.md) for mechanics
- Check [Research Docs](./research/) for source validation

---

**Ready to start?** Pick a service or command to implement and read its documentation first.
