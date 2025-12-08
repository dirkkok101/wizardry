/**
 * Test Data Loader Helper
 *
 * Provides functions to load game data in tests that need it.
 * This is opt-in to avoid loading 314+ JSON files for tests that don't need them.
 *
 * Usage:
 * ```typescript
 * import { loadGameDataForTests, clearGameDataCaches } from '@testing/test-data-loader';
 *
 * beforeAll(async () => {
 *   await loadGameDataForTests();
 * });
 *
 * afterAll(() => {
 *   clearGameDataCaches();
 * });
 * ```
 */

import { SpellDataLoader } from '@services/SpellDataLoader';
import { MonsterDataLoader } from '@services/MonsterDataLoader';
import { ClassDataLoader } from '@services/ClassDataLoader';
import { ItemDataLoader } from '@services/ItemDataLoader';
import { TrapDataLoader } from '@services/TrapDataLoader';
import { RaceService } from '@services/RaceService';
import { StatModifierService } from '@services/StatModifierService';

/**
 * Load all game data for tests that need it.
 * Call this in beforeAll() of test files that require real game data.
 *
 * Loads:
 * - Classes (8 files)
 * - Spells (50 files)
 * - Monsters (101 files)
 * - Items (104 files)
 * - Traps (11 files)
 * - Races (5 files)
 * - Stat modifiers
 */
export async function loadGameDataForTests(): Promise<void> {
  await Promise.all([
    ClassDataLoader.loadAllClasses(),
    SpellDataLoader.loadAllSpells(),
    MonsterDataLoader.loadAllMonsters(),
    ItemDataLoader.loadAllItems(),
    TrapDataLoader.loadAllTraps(),
    RaceService.initialize(),
    StatModifierService.initialize()
  ]);
}

/**
 * Clear all game data caches.
 * Call this in afterAll() to clean up after tests.
 */
export function clearGameDataCaches(): void {
  ClassDataLoader.clearCache();
  SpellDataLoader.clearCache();
  MonsterDataLoader.clearCache();
  ItemDataLoader.clearCache();
  TrapDataLoader.clearCache();
}

// =============================================================================
// SELECTIVE DATA LOADERS
// Use these instead of loadGameDataForTests() to load only what your test needs
// =============================================================================

/**
 * Load only monster data (101 files).
 * Use for: combat tests, encounter tests, monster service tests
 */
export async function loadMonstersForTests(): Promise<void> {
  await MonsterDataLoader.loadAllMonsters();
}

/**
 * Load only item data (104 files).
 * Use for: shop tests, equipment tests, inventory tests
 */
export async function loadItemsForTests(): Promise<void> {
  await ItemDataLoader.loadAllItems();
}

/**
 * Load only spell data (50 files).
 * Use for: spell casting tests, spell learning tests
 */
export async function loadSpellsForTests(): Promise<void> {
  await SpellDataLoader.loadAllSpells();
}

/**
 * Load only class data (8 files).
 * Use for: class eligibility tests, class-specific logic
 */
export async function loadClassesForTests(): Promise<void> {
  await ClassDataLoader.loadAllClasses();
}

/**
 * Load only trap data (11 files).
 * Use for: trap detection tests, chest trap tests
 */
export async function loadTrapsForTests(): Promise<void> {
  await TrapDataLoader.loadAllTraps();
}

/**
 * Load character creation data (classes + races + stat modifiers).
 * Use for: character creation tests, character service tests
 *
 * Loads:
 * - Classes (8 files)
 * - Races (5 files)
 * - Stat modifiers (1 file)
 */
export async function loadCharacterCreationDataForTests(): Promise<void> {
  await Promise.all([
    ClassDataLoader.loadAllClasses(),
    RaceService.initialize(),
    StatModifierService.initialize()
  ]);
}

/**
 * Load combat-related data (monsters + items).
 * Use for: full combat flow tests that need equipment and monsters
 *
 * Loads:
 * - Monsters (101 files)
 * - Items (104 files)
 */
export async function loadCombatDataForTests(): Promise<void> {
  await Promise.all([
    MonsterDataLoader.loadAllMonsters(),
    ItemDataLoader.loadAllItems()
  ]);
}

/**
 * Load chest/treasure-related data.
 * Use for: chest tests, treasure tests, loot tests
 *
 * Loads:
 * - Items (104 files)
 * - Treasure rewards
 * - Numeric ID mapping
 *
 * Note: Import TreasureDataLoader and NumericIdMappingLoader where needed
 */
export async function loadChestDataForTests(): Promise<void> {
  // Dynamic import to avoid circular dependencies
  const { TreasureDataLoader } = await import('@services/TreasureDataLoader');
  const { NumericIdMappingLoader } = await import('@services/NumericIdMappingLoader');

  await Promise.all([
    ItemDataLoader.loadAllItems(),
    TreasureDataLoader.loadAllRewards(),
    NumericIdMappingLoader.loadMapping()
  ]);
}

/**
 * Load inn-related data for level-up and spell learning.
 * Use for: inn tests that involve resting, level-ups, and spell learning
 *
 * Loads:
 * - Classes (8 files) - for level-up
 * - Races (5 files) - for character data
 * - Stat modifiers (1 file) - for level-up stat changes
 * - Spells (50 files) - for spell learning on level-up
 */
export async function loadInnDataForTests(): Promise<void> {
  await Promise.all([
    ClassDataLoader.loadAllClasses(),
    RaceService.initialize(),
    StatModifierService.initialize(),
    SpellDataLoader.loadAllSpells()
  ]);
}

/**
 * Load trap-related data including resistance checks.
 * Use for: trap tests that involve resistance calculations
 *
 * Loads:
 * - Traps (11 files) - for trap effects
 * - Classes (8 files) - for class resistance calculations
 * - Races (5 files) - for race resistance calculations
 */
export async function loadTrapsWithResistanceForTests(): Promise<void> {
  await Promise.all([
    TrapDataLoader.loadAllTraps(),
    ClassDataLoader.loadAllClasses(),
    RaceService.initialize()
  ]);
}
