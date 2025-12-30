/**
 * Shared test helpers for spell integration tests.
 * Call setupSpellTests() at file scope before describe blocks.
 */
import { SpellDataLoader as _SpellDataLoader } from './SpellDataLoader';
import { MonsterDataLoader as _MonsterDataLoader } from './MonsterDataLoader';
import { loadSpellsForTests, loadMonstersForTests } from '@testing/test-data-loader';

export { SpellDataLoader } from './SpellDataLoader';
export { SpellCastingService } from './SpellCastingService';
export { RandomService } from './RandomService';
export { createTestCharacter, createTestMonster } from '@testing/test-factories';
export { CharacterStatus } from '@models/CharacterStatus';

declare const beforeAll: (fn: () => Promise<void> | void) => void;
declare const afterAll: (fn: () => void) => void;

export function setupSpellTests(): void {
  beforeAll(async () => {
    await Promise.all([loadSpellsForTests(), loadMonstersForTests()]);
  });

  afterAll(() => {
    _SpellDataLoader.clearCache();
    _MonsterDataLoader.clearCache();
  });
}
