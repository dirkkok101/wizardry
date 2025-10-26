# Wizardry: Proving Grounds Remake - Documentation

**Welcome to the comprehensive documentation for the Wizardry 1 remake.**

## Quick Links

- [Architecture Overview](./architecture.md) - Technical architecture & layers
- [Getting Started](./getting-started.md) - Quick start guide
- [User Interface Documentation](./ui/README.md) - Complete UI flow documentation (14 scenes)
- [Game Design](./game-design/README.md) - Game mechanics & systems
- [Services](./services/README.md) - Service layer documentation (40+ services)
- [Commands](./commands/README.md) - Command layer documentation (40+ commands)
- [Systems](./systems/README.md) - System deep-dives (9 major systems)
- [Diagrams](./diagrams/README.md) - Visual architecture diagrams
- [Testing Strategy](./testing-strategy.md) - Testing approach & patterns

## Documentation Structure

```
docs/
├── README.md (you are here)
├── architecture.md
├── ui/ (14 UI scenes + 4 guides)
├── diagrams/ (8 Mermaid diagrams)
├── services/ (40+ service docs)
├── commands/ (40+ command docs)
├── systems/ (9 system deep-dives)
├── game-design/ (12 game design docs)
├── data-format/ (5 JSON specs)
└── research/ (source validation & reference)
```

## User Interface Documentation

Complete UI flow documentation covering all 14 scenes with navigation maps, state management, and input handling:

- **Scene Coverage**: 14/14 scenes (100% complete)
- **Documentation Lines**: 13,250+ lines
- **Navigation Map**: Full Mermaid state diagram showing all scene transitions
- **UI Patterns**: 7 reusable patterns documented with examples
- **Input Reference**: Complete keyboard shortcuts and input handling guide
- **State Management**: Application state structure and transition rules

**Key Features:**
- ASCII mockups for every scene
- TypeScript validation logic for all actions
- Test scenarios for happy path and edge cases
- Hub-and-spoke navigation design (Castle Menu as central hub)
- Safe zone vs dungeon zone state management

See [User Interface Documentation](./ui/README.md) for complete UI specifications.

## Research & Validation

All game mechanics validated against original Wizardry 1 sources:
- **Validation Coverage**: 68% (71/105 items validated)
- **Accuracy**: 100% (0 errors remaining)
- **Reference Docs**: 7 comprehensive documents (3,682 lines)

See [Research Documentation](./research/week1-research-summary.md) for full validation report.

## Implementation Status

- ✅ **Week 1**: Research & Validation (COMPLETE)
- 🔄 **Weeks 2-11**: Documentation (IN PROGRESS)
- ⬜ **Week 12**: Review & Quality Assurance
- ⬜ **Weeks 13+**: Implementation

## Contributing

See [Contributing Guide](./contributing.md) for documentation standards and patterns.
