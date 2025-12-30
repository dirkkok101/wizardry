# Data Format Specifications

**JSON data file formats for game data.**

## Data Files

1. [spells.json](./spells-json.md) - All spells (65+)
2. [monsters.json](./monsters-json.md) - All monsters (96)
3. [maps.json](./maps-json.md) - All dungeon maps (10 levels)
4. [items.json](./items-json.md) - All items (80+)
5. [save-format.json](./save-format.md) - IndexedDB save format

## Purpose

Data files separate game content from code.

**Benefits**:
- Easy to modify without code changes
- Can be loaded dynamically
- Supports modding
- Validated against source data

## Data Validation

All data formats validated against original Wizardry 1 sources:
- [Spell Reference](../research/spell-reference.md) - 65+ spells
- [Monster Reference](../research/monster-reference.md) - 96 monsters
- [Equipment Reference](../research/equipment-reference.md) - 80+ items
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - 10 levels

## Implementation Notes

**File Location**: All data files stored in `src/data/`

**Loading**: Data files loaded at initialization, cached for performance

**Validation**: TypeScript type definitions ensure data integrity

**Modding**: Custom data files can override default game data
