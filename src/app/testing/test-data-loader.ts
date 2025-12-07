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
