# Wizardry: Proving Grounds Remake - Documentation

**Comprehensive documentation for the Wizardry 1 faithful remake.**

> **Last Consolidated**: 2025-12-30
> **Active Docs**: 23 files (~170 archived)
> **Status**: Clean architecture with authoritative sources

---

## Documentation Structure

```
docs/
├── reference/           # SOURCE OF TRUTH - Game mechanics (7 files)
│   ├── characters.md    # Races, classes, leveling, creation
│   ├── combat-formulas.md # All combat calculations
│   ├── spells.md        # 50 spells with effects
│   ├── monsters.md      # 96 monsters
│   ├── items.md         # Equipment system
│   ├── traps.md         # Trap mechanics
│   └── treasure.md      # Loot distribution
│
├── architecture/        # Code organization (2 files)
│   ├── overview.md      # 4-layer clean architecture
│   └── webgl-renderer.md # 3D rendering system
│
├── systems/             # System deep-dives (10 files)
│   ├── combat-system.md
│   ├── spell-system.md
│   ├── party-system.md
│   ├── character-creation-system.md
│   ├── dungeon-system.md
│   ├── dungeon-navigation.md
│   ├── town-system.md
│   ├── first-person-rendering.md
│   └── event-sourcing.md
│
├── guides/              # How-to guides (3 files)
│   ├── getting-started.md
│   ├── contributing.md
│   └── testing-strategy.md
│
├── decisions/           # Architecture Decision Records (ADRs)
│   └── (future ADRs)
│
└── _archive/            # Historical docs (preserved for reference)
```

---

## Quick Start

| I want to...               | Read this                                                      |
| -------------------------- | -------------------------------------------------------------- |
| Understand combat formulas | [reference/combat-formulas.md](./reference/combat-formulas.md) |
| Learn the architecture     | [architecture/overview.md](./architecture/overview.md)         |
| Set up development         | [guides/getting-started.md](./guides/getting-started.md)       |
| Run tests                  | [guides/testing-strategy.md](./guides/testing-strategy.md)     |
| Understand a system        | [systems/README.md](./systems/README.md)                       |

---

## Source of Truth Hierarchy

1. **Code** (`src/`) - Ultimate authority for implementation behavior
2. **Data** (`data/`) - JSON files for game data (monsters, spells, items)
3. **Reference** (`docs/reference/`) - Authoritative game mechanics documentation
4. **Systems** (`docs/systems/`) - How systems work together
5. **Architecture** (`docs/architecture/`) - Code organization decisions

**When in conflict, higher-numbered sources override lower.**

---

## Reference Documentation

All reference docs are validated against Thomas William Ewers' reverse-engineered Apple II source code:

| Document                                             | Content                         | Lines |
| ---------------------------------------------------- | ------------------------------- | ----- |
| [characters.md](./reference/characters.md)           | Races, classes, stats, leveling | ~900  |
| [combat-formulas.md](./reference/combat-formulas.md) | All combat calculations         | ~1700 |
| [spells.md](./reference/spells.md)                   | 50 spells with full mechanics   | ~600  |
| [monsters.md](./reference/monsters.md)               | 96 monsters with stats          | ~900  |
| [items.md](./reference/items.md)                     | Equipment and shop system       | ~1200 |
| [traps.md](./reference/traps.md)                     | Trap mechanics and disarming    | ~700  |
| [treasure.md](./reference/treasure.md)               | Loot tables and distribution    | ~300  |

---

## Archived Documentation

Historical docs preserved in `_archive/` for reference:

- `services/` - Outdated service docs (architecture changed)
- `ui-scenes/` - Outdated UI mockups (redesigned)
- `game-design/` - Redundant with reference docs
- `commands/` - Outdated command patterns
- `research/` - Original research (promoted to reference/)
- `plans/` - Implementation plans (historical)

---

## Implementation Status

| Phase                        | Status         |
| ---------------------------- | -------------- |
| Phase 1-4: Angular migration | ✅ Complete    |
| Phase 5: Town services       | ✅ Complete    |
| Phase 6: Town completion     | ✅ Complete    |
| Phase 7: Combat & encounters | 🔄 In Progress |

See [CLAUDE.md](../CLAUDE.md) for full project context.
