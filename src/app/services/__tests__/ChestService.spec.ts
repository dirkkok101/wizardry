/**
 * ChestService Tests
 *
 * Tests for chest generation, treasure distribution, and inventory management.
 *
 * Note: Trap data is loaded from real JSON files via setup-jest.ts
 * Note: Treasure data is loaded via loadChestDataForTests() helper
 */

import { ChestService } from '../ChestService';
import { RandomService } from '../RandomService';
import { createTestCharacter, createTestGameState } from '@testing/test-factories';
import { loadChestDataForTests } from '@testing/test-data-loader';
import { TrapId } from '@models/Trap';
import { RewardTier, TreasureDistributionResult } from '@models/Chest';
import { Position } from '@models/Dungeon';
import { CharacterStatus } from '@models/CharacterStatus';
import { Item } from '@models/Item';

// Helper to create test position
function createTestPosition(): Position {
  return { x: 5, y: 5, facing: 'NORTH' };
}

// Authentic gold ranges from Item_System_Reference.md Section 4.3
// These are the dice-based ranges, not the simplified GOLD_RANGE_BY_TIER
const AUTHENTIC_GOLD_RANGES: Record<RewardTier, { min: number; max: number }> = {
  10: { min: 20, max: 100 }, // 2d5×10
  11: { min: 40, max: 200 }, // 4d5×10
  12: { min: 60, max: 300 }, // 6d5×10
  13: { min: 60, max: 300 }, // 6d5×10 (same as 12)
  14: { min: 100, max: 500 }, // 10d5×10
  15: { min: 120, max: 600 }, // 12d5×10
  16: { min: 100, max: 1000 }, // 10d10×10
  17: { min: 100, max: 2000 }, // 10d10×d2×10
  18: { min: 100, max: 4000 }, // 10d10×d4×10
  19: { min: 100, max: 8000 }, // 10d10×d8×10
};

describe('ChestService', () => {
  // Trap data is pre-loaded by setup-jest.ts from real JSON files
  // Treasure data is loaded via helper (cached for all tests in this file)

  beforeAll(async () => {
    await loadChestDataForTests();
  });

  describe('generateChest', () => {
    it('should generate a chest with correct properties', async () => {
      RandomService.setSeed(12345);

      const chest = await ChestService.generateChest(14, 5, createTestPosition(), 'combat_victory');

      expect(chest.id).toContain('chest_');
      expect(chest.rewardTier).toBe(14);
      expect(chest.mazeLevel).toBe(5);
      expect(chest.source).toBe('combat_victory');
      expect(chest.trapIdentified).toBe(false);
      expect(chest.trapDisarmed).toBe(false);
      expect(chest.contents.gold).toBeGreaterThan(0);
    });

    it('should generate items when random values are favorable', async () => {
      // Tier 19 (reward-19.json) has 2 tiers: 100% chance, 50% chance
      // Use seeded random for consistent results
      RandomService.setSeed(12345);

      const chest = await ChestService.generateChest(19, 10, createTestPosition(), 'boss');

      // Should have at least 1 item (tier 1 is 100% guaranteed)
      expect(chest.contents.items.length).toBeGreaterThanOrEqual(1);
      expect(chest.contents.items.length).toBeLessThanOrEqual(2);

      // Each item should be a valid item with name
      for (const item of chest.contents.items) {
        expect(item.name).toBeDefined();
        expect(item.name.length).toBeGreaterThan(0);
      }
    });

    it('should respect trap probability by tier', async () => {
      const position = createTestPosition();

      // Note: TreasureService consumes random values for gold/item generation
      // before the trap probability check. Use setSeed for deterministic testing
      // and verify trap probability behavior over multiple samples.
      RandomService.setSeed(12345);

      // Test tier 10 (50% trap chance) - run multiple samples
      let tier10TrappedCount = 0;
      const tier10Samples = 20;
      for (let i = 0; i < tier10Samples; i++) {
        const chest = await ChestService.generateChest(10, 1, position, 'combat_victory');
        if (chest.trapped) tier10TrappedCount++;
      }
      // With 50% trap chance, expect roughly half to be trapped (allow some variance)
      expect(tier10TrappedCount).toBeGreaterThan(2); // At least some trapped
      expect(tier10TrappedCount).toBeLessThan(18); // At least some not trapped

      // Test tier 19 (95% trap chance) - should be mostly trapped
      RandomService.setSeed(54321);
      let tier19TrappedCount = 0;
      const tier19Samples = 20;
      for (let i = 0; i < tier19Samples; i++) {
        const chest = await ChestService.generateChest(19, 10, position, 'combat_victory');
        if (chest.trapped) tier19TrappedCount++;
      }
      // With 95% trap chance, expect most to be trapped
      expect(tier19TrappedCount).toBeGreaterThan(15); // Most should be trapped
    });

    it('should generate gold within authentic tier range', async () => {
      RandomService.setSeed(12345);
      const position = createTestPosition();

      // Tier 10: 2d5×10 = 20-100 gold
      const tier10Chest = await ChestService.generateChest(10, 1, position, 'combat_victory');
      const tier10Range = AUTHENTIC_GOLD_RANGES[10];
      expect(tier10Chest.contents.gold).toBeGreaterThanOrEqual(tier10Range.min);
      expect(tier10Chest.contents.gold).toBeLessThanOrEqual(tier10Range.max);

      // Tier 19: 10d10×d8×10 = 100-8000 gold
      const tier19Chest = await ChestService.generateChest(19, 10, position, 'boss');
      const tier19Range = AUTHENTIC_GOLD_RANGES[19];
      expect(tier19Chest.contents.gold).toBeGreaterThanOrEqual(tier19Range.min);
      expect(tier19Chest.contents.gold).toBeLessThanOrEqual(tier19Range.max);
    });
  });

  describe('generateCombatChest', () => {
    it('should map monster level to reward tier', async () => {
      const position = createTestPosition();

      // Monster level 1-2 → tier 10
      RandomService.setSeed(100);
      const lowTier = await ChestService.generateCombatChest(2, 1, position);
      expect(lowTier.rewardTier).toBe(10);

      // Monster level 9 → tier 14 (formula: 10 + floor((9-1)/2) = 10 + 4 = 14)
      // Using level 9 because levels 10-19 overlap with Reward 2 range and are treated as direct values
      RandomService.setSeed(100);
      const midTier = await ChestService.generateCombatChest(9, 5, position);
      expect(midTier.rewardTier).toBe(14);

      // Monster level 20+ → tier 19 (capped at max)
      RandomService.setSeed(100);
      const highTier = await ChestService.generateCombatChest(25, 10, position);
      expect(highTier.rewardTier).toBe(19);
    });

    it('should accept Reward 2 values directly', async () => {
      const position = createTestPosition();

      // Pass Reward 2 value directly (10-19 range)
      RandomService.setSeed(100);
      const directTier = await ChestService.generateCombatChest(15, 5, position);
      expect(directTier.rewardTier).toBe(15);
    });

    it('should set source as combat_victory', async () => {
      RandomService.setSeed(100);
      const chest = await ChestService.generateCombatChest(5, 3, createTestPosition());
      expect(chest.source).toBe('combat_victory');
    });
  });

  describe('generateBossChest', () => {
    it('should always be trapped', async () => {
      // Even if random would say no trap, boss chests force trapped
      RandomService.queueNextValues([0.99]); // Would normally be > 95% = no trap
      const chest = await ChestService.generateBossChest(10, createTestPosition());
      expect(chest.trapped).toBe(true);
      expect(chest.trapId).not.toBeNull();
    });

    it('should set source as boss', async () => {
      RandomService.setSeed(100);
      const chest = await ChestService.generateBossChest(10, createTestPosition());
      expect(chest.source).toBe('boss');
    });

    it('should be tier 19 (highest in Reward 2 system)', async () => {
      RandomService.setSeed(100);
      const chest = await ChestService.generateBossChest(10, createTestPosition());
      expect(chest.rewardTier).toBe(19);
    });
  });

  describe('checkInventorySpace', () => {
    it('should return null when opener has enough space', () => {
      const opener = createTestCharacter({ inventory: [] });
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [{ id: 'item1', name: 'Sword' } as any] },
        null,
        1,
        createTestPosition(),
      );

      const warning = ChestService.checkInventorySpace(opener, chest);
      expect(warning).toBeNull();
    });

    it('should return warning when inventory is full', () => {
      const fullInventory = Array(8)
        .fill(null)
        .map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }));
      const opener = createTestCharacter({ inventory: fullInventory as any });
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [{ id: 'new1', name: 'New Item' } as any] },
        null,
        1,
        createTestPosition(),
      );

      const warning = ChestService.checkInventorySpace(opener, chest);

      expect(warning).not.toBeNull();
      expect(warning!.freeSlots).toBe(0);
      expect(warning!.itemsAtRisk).toBe(1);
      expect(warning!.warning).toContain('LOST FOREVER');
    });

    it('should calculate partial risk correctly', () => {
      const inventory = Array(6)
        .fill(null)
        .map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }));
      const opener = createTestCharacter({ inventory: inventory as any });
      const chest = ChestService.createChestWithContents(
        {
          gold: 100,
          items: [
            { id: 'new1', name: 'Item 1' },
            { id: 'new2', name: 'Item 2' },
            { id: 'new3', name: 'Item 3' },
          ] as any,
        },
        null,
        1,
        createTestPosition(),
      );

      const warning = ChestService.checkInventorySpace(opener, chest);

      expect(warning).not.toBeNull();
      expect(warning!.freeSlots).toBe(2);
      expect(warning!.itemCount).toBe(3);
      expect(warning!.itemsAtRisk).toBe(1); // 3 items - 2 slots = 1 at risk
    });
  });

  describe('selectRecipient', () => {
    it('should select a random living party member', () => {
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter' });
      const member2 = createTestCharacter({ id: 'char2', name: 'Thief' });
      const member3 = createTestCharacter({ id: 'char3', name: 'Mage' });

      // Queue random to select member2 (index 1 out of 3)
      RandomService.queueNextValues([0.5]); // 0.5 * 3 = 1.5 → floor → 1

      const recipient = ChestService.selectRecipient([member1, member2, member3]);

      expect(recipient).not.toBeNull();
      expect(recipient!.id).toBe('char2');
    });

    it('should skip dead members', () => {
      const deadMember = createTestCharacter({
        id: 'dead1',
        name: 'DeadGuy',
        status: CharacterStatus.DEAD,
      });
      const livingMember = createTestCharacter({
        id: 'alive1',
        name: 'AliveGuy',
      });

      const recipient = ChestService.selectRecipient([deadMember, livingMember]);

      expect(recipient).not.toBeNull();
      expect(recipient!.id).toBe('alive1');
    });

    it('should return null when all members are dead', () => {
      const deadMember1 = createTestCharacter({
        id: 'dead1',
        status: CharacterStatus.DEAD,
      });
      const deadMember2 = createTestCharacter({
        id: 'dead2',
        status: CharacterStatus.ASHES,
      });

      const recipient = ChestService.selectRecipient([deadMember1, deadMember2]);

      expect(recipient).toBeNull();
    });
  });

  describe('distributeTreasure', () => {
    it('should add gold to result', () => {
      const member = createTestCharacter({ inventory: [] });
      const chest = ChestService.createChestWithContents(
        { gold: 500, items: [] },
        null,
        1,
        createTestPosition(),
      );

      const result = ChestService.distributeTreasure(chest, [member]);

      expect(result.goldAdded).toBe(500);
    });

    it('should select random living party member as recipient', () => {
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter', inventory: [] });
      const member2 = createTestCharacter({ id: 'char2', name: 'Thief', inventory: [] });
      const member3 = createTestCharacter({ id: 'char3', name: 'Mage', inventory: [] });
      const item = { id: 'sword', name: 'Sword +1' } as any;
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition(),
      );

      // Queue random to select member2 (index 1 out of 3)
      // pickRandom uses Math.floor(nextRandom() * length), so 0.5 * 3 = 1.5 → floor → 1
      RandomService.queueNextValues([0.5]);

      const result = ChestService.distributeTreasure(chest, [member1, member2, member3]);

      expect(result.recipientId).toBe('char2');
      expect(result.recipientName).toBe('Thief');
    });

    it('should skip dead members when selecting recipient', () => {
      const deadMember = createTestCharacter({
        id: 'dead1',
        name: 'DeadGuy',
        status: CharacterStatus.DEAD,
        inventory: [],
      });
      const livingMember = createTestCharacter({
        id: 'alive1',
        name: 'AliveGuy',
        inventory: [],
      });
      const item = { id: 'sword', name: 'Sword +1' } as any;
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition(),
      );

      const result = ChestService.distributeTreasure(chest, [deadMember, livingMember]);

      // Only living member should receive items
      expect(result.recipientId).toBe('alive1');
      expect(result.recipientName).toBe('AliveGuy');
      expect(result.itemsReceived).toHaveLength(1);
    });

    it('should lose all items when all party members are dead', () => {
      const deadMember1 = createTestCharacter({
        id: 'dead1',
        status: CharacterStatus.DEAD,
        inventory: [],
      });
      const deadMember2 = createTestCharacter({
        id: 'dead2',
        status: CharacterStatus.ASHES,
        inventory: [],
      });
      const item = { id: 'rare', name: 'Rare Item' } as any;
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition(),
      );

      const result = ChestService.distributeTreasure(chest, [deadMember1, deadMember2]);

      expect(result.recipientId).toBe('');
      expect(result.recipientName).toBe('No one');
      expect(result.itemsReceived).toHaveLength(0);
      expect(result.itemsLost).toHaveLength(1);
      expect(result.itemsLost).toContain(item);
      // Gold still goes to party pool even if all dead
      expect(result.goldAdded).toBe(100);
    });

    it('should add items to received list when space available', () => {
      const member = createTestCharacter({ inventory: [] });
      const item1 = { id: 'sword', name: 'Sword +1' } as any;
      const item2 = { id: 'shield', name: 'Shield' } as any;
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item1, item2] },
        null,
        1,
        createTestPosition(),
      );

      const result = ChestService.distributeTreasure(chest, [member]);

      expect(result.itemsReceived).toHaveLength(2);
      expect(result.itemsReceived).toContain(item1);
      expect(result.itemsReceived).toContain(item2);
      expect(result.itemsLost).toHaveLength(0);
    });

    it('should lose items when recipient inventory is full', () => {
      const fullInventory = Array(8)
        .fill(null)
        .map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }));
      const member = createTestCharacter({ inventory: fullInventory as any });
      const lostItem = { id: 'rare', name: 'Rare Sword +5' } as any;
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [lostItem] },
        null,
        1,
        createTestPosition(),
      );

      const result = ChestService.distributeTreasure(chest, [member]);

      expect(result.itemsReceived).toHaveLength(0);
      expect(result.itemsLost).toHaveLength(1);
      expect(result.itemsLost).toContain(lostItem);
    });

    it('should partially fill inventory and lose overflow', () => {
      const inventory = Array(7)
        .fill(null)
        .map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }));
      const member = createTestCharacter({ inventory: inventory as any });
      const item1 = { id: 'item7', name: 'Fits' } as any;
      const item2 = { id: 'item8', name: 'Lost' } as any;
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item1, item2] },
        null,
        1,
        createTestPosition(),
      );

      const result = ChestService.distributeTreasure(chest, [member]);

      expect(result.itemsReceived).toHaveLength(1);
      expect(result.itemsReceived).toContain(item1);
      expect(result.itemsLost).toHaveLength(1);
      expect(result.itemsLost).toContain(item2);
    });

    it('should use pre-selected recipient when provided', () => {
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter', inventory: [] });
      const member2 = createTestCharacter({ id: 'char2', name: 'Thief', inventory: [] });
      const item = { id: 'sword', name: 'Sword +1' } as any;
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition(),
      );

      // Pre-select member1 - should use it regardless of random
      const result = ChestService.distributeTreasure(chest, [member1, member2], member1);

      expect(result.recipientId).toBe('char1');
      expect(result.recipientName).toBe('Fighter');
    });

    it('should ensure pre-selected recipient matches inventory warning', () => {
      // This test verifies the fix for the inventory warning bug:
      // Warning should show the SAME character who will receive items
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter', inventory: [] });
      const fullMember = createTestCharacter({
        id: 'char2',
        name: 'FullGuy',
        inventory: Array(8)
          .fill(null)
          .map((_, i) => ({ id: `item${i}`, name: `Item ${i}` })) as any,
      });
      const item = { id: 'sword', name: 'Sword +1' } as any;
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition(),
      );

      // Step 1: Pre-select recipient (simulating what component does)
      RandomService.queueNextValues([0.8]); // Would select index 1 (fullMember)
      const recipient = ChestService.selectRecipient([member1, fullMember]);
      expect(recipient).toBe(fullMember);

      // Step 2: Check inventory (with the ACTUAL recipient)
      const warning = ChestService.checkInventorySpace(recipient!, chest);
      expect(warning).not.toBeNull();
      expect(warning!.warning).toContain('FullGuy'); // Warning shows recipient name

      // Step 3: Distribute treasure (using pre-selected recipient)
      const result = ChestService.distributeTreasure(chest, [member1, fullMember], recipient!);

      // The recipient in warning MATCHES the recipient in distribution
      expect(result.recipientId).toBe('char2');
      expect(result.recipientName).toBe('FullGuy');
      expect(result.itemsLost).toHaveLength(1); // Item lost because fullMember is full
    });
  });

  describe('getDistributionMessage', () => {
    it('should format gold message', () => {
      const result = {
        goldAdded: 500,
        itemsReceived: [],
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Fighter',
      };

      const message = ChestService.getDistributionMessage(result);
      expect(message).toContain('500 gold');
    });

    it('should format items received message', () => {
      const result = {
        goldAdded: 0,
        itemsReceived: [{ id: 'sword', name: 'Sword +1', identified: true }] as any,
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Fighter',
      };

      const message = ChestService.getDistributionMessage(result);
      expect(message).toContain('Sword +1');
    });

    it('should format items lost message', () => {
      const result = {
        goldAdded: 0,
        itemsReceived: [],
        itemsLost: [{ id: 'rare', name: 'Rare Item', identified: true }] as any,
        recipientId: 'char1',
        recipientName: 'Fighter',
      };

      const message = ChestService.getDistributionMessage(result);
      expect(message).toContain('LOST');
      expect(message).toContain('Rare Item');
    });
  });

  describe('createEmptyChest', () => {
    it('should create untrapped chest with no contents', () => {
      const chest = ChestService.createEmptyChest(1, createTestPosition());

      expect(chest.trapped).toBe(false);
      expect(chest.trapId).toBeNull();
      expect(chest.trapIdentified).toBe(true);
      expect(chest.contents.gold).toBe(0);
      expect(chest.contents.items).toHaveLength(0);
      expect(chest.rewardTier).toBe(10); // Lowest tier in Reward 2 system
    });
  });

  describe('createChestWithContents', () => {
    it('should create chest with specified contents and trap', () => {
      const contents = { gold: 1000, items: [{ id: 'item', name: 'Special' }] as any };
      const chest = ChestService.createChestWithContents(
        contents,
        'TELEPORTER',
        5,
        createTestPosition(),
      );

      expect(chest.trapped).toBe(true);
      expect(chest.trapId).toBe('TELEPORTER');
      expect(chest.contents.gold).toBe(1000);
      expect(chest.contents.items).toHaveLength(1);
      expect(chest.mazeLevel).toBe(5);
      expect(chest.rewardTier).toBe(14); // Default mid-tier in Reward 2 system
    });

    it('should create untrapped chest when trapId is null', () => {
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [] },
        null,
        1,
        createTestPosition(),
      );

      expect(chest.trapped).toBe(false);
      expect(chest.trapId).toBeNull();
    });
  });

  describe('selectTrapId (authentic Wizardry 1 distribution)', () => {
    // Base traps from authentic distribution
    const BASE_TRAPS = ['POISON_NEEDLE', 'GAS_BOMB'];
    const TYPE3_TRAPS = ['CROSSBOW_BOLT', 'EXPLODING_BOX', 'SPLINTERS', 'BLADES', 'STUNNER'];
    const HIGH_TIER_TRAPS = ['ALARM', 'TELEPORTER', 'MAGE_BLASTER', 'PRIEST_BLASTER'];
    const ALL_BASE_TRAPS = [...BASE_TRAPS, ...TYPE3_TRAPS];

    it('should select from base distribution at low tiers', async () => {
      // At tier 10, high-tier chance is 0%, so we always get base traps
      RandomService.setSeed(12345);

      // Generate multiple traps to verify distribution
      const traps: TrapId[] = [];
      for (let i = 0; i < 50; i++) {
        traps.push(await ChestService.selectTrapId(10));
      }

      // All should be base traps (no high-tier at tier 10)
      for (const trap of traps) {
        expect(ALL_BASE_TRAPS).toContain(trap);
      }
    });

    it('should include Type3 traps (Crossbow, Exploding, Splinters, Blades, Stunner)', async () => {
      RandomService.setSeed(12345);
      const traps: TrapId[] = [];

      // Generate many traps to see Type3 variety
      for (let i = 0; i < 200; i++) {
        traps.push(await ChestService.selectTrapId(10));
      }

      // Should see at least one Type3 trap
      const hasType3 = traps.some((t) => TYPE3_TRAPS.includes(t));
      expect(hasType3).toBe(true);
    });

    it('should include high-tier traps at tier 19 (45% chance)', async () => {
      RandomService.setSeed(12345);
      const traps: TrapId[] = [];

      // Generate many traps at tier 19
      for (let i = 0; i < 200; i++) {
        traps.push(await ChestService.selectTrapId(19));
      }

      // Should see at least one high-tier trap (45% chance per roll)
      const hasHighTier = traps.some((t) => HIGH_TIER_TRAPS.includes(t));
      expect(hasHighTier).toBe(true);
    });

    it('should have variety in trap selection', async () => {
      RandomService.setSeed(12345);
      const traps: TrapId[] = [];

      // Generate many traps at tier 14 (mid-tier, 20% high-tier chance)
      for (let i = 0; i < 100; i++) {
        traps.push(await ChestService.selectTrapId(14));
      }

      // Should have variety
      const uniqueTraps = new Set(traps);
      expect(uniqueTraps.size).toBeGreaterThan(3); // At least 4 different trap types
    });
  });

  describe('applyDistributionToState', () => {
    it('should add gold to party', () => {
      const char = createTestCharacter({ id: 'char1', inventory: [] });
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 100 },
      });

      const result: TreasureDistributionResult = {
        goldAdded: 500,
        itemsReceived: [],
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Test Character',
      };

      const newState = ChestService.applyDistributionToState(state, result);

      expect(newState.party.gold).toBe(600); // 100 + 500
    });

    it('should add items to recipient inventory', () => {
      const char = createTestCharacter({ id: 'char1', inventory: [] });
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 },
      });

      const item1: Item = { id: 'sword', name: 'Sword +1', identified: true } as Item;
      const item2: Item = { id: 'shield', name: 'Shield', identified: true } as Item;

      const result: TreasureDistributionResult = {
        goldAdded: 0,
        itemsReceived: [item1, item2],
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Test Character',
      };

      const newState = ChestService.applyDistributionToState(state, result);

      const updatedChar = newState.roster.get('char1');
      expect(updatedChar?.inventory).toHaveLength(2);
      expect(updatedChar?.inventory).toContain(item1);
      expect(updatedChar?.inventory).toContain(item2);
    });

    it('should clear pendingChest', () => {
      const char = createTestCharacter({ id: 'char1', inventory: [] });
      const chest = ChestService.createEmptyChest(1, createTestPosition());
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 },
        pendingChest: chest,
      });

      const result: TreasureDistributionResult = {
        goldAdded: 100,
        itemsReceived: [],
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Test Character',
      };

      const newState = ChestService.applyDistributionToState(state, result);

      expect(newState.pendingChest).toBeUndefined();
    });

    it('should not modify roster when no items received', () => {
      const existingItem: Item = { id: 'existing', name: 'Old Item', identified: true } as Item;
      const char = createTestCharacter({ id: 'char1', inventory: [existingItem] });
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 },
      });

      const result: TreasureDistributionResult = {
        goldAdded: 100,
        itemsReceived: [], // No items received
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Test Character',
      };

      const newState = ChestService.applyDistributionToState(state, result);

      // Inventory should be unchanged
      const updatedChar = newState.roster.get('char1');
      expect(updatedChar?.inventory).toHaveLength(1);
      expect(updatedChar?.inventory).toContain(existingItem);
    });

    it('should handle empty recipientId gracefully', () => {
      const char = createTestCharacter({ id: 'char1', inventory: [] });
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 50 },
      });

      // When all party dead, recipientId is empty
      const result: TreasureDistributionResult = {
        goldAdded: 200,
        itemsReceived: [], // All items lost
        itemsLost: [{ id: 'lost', name: 'Lost Item', identified: true } as Item],
        recipientId: '',
        recipientName: 'No one',
      };

      const newState = ChestService.applyDistributionToState(state, result);

      // Gold should still be added
      expect(newState.party.gold).toBe(250);
      // Roster unchanged
      expect(newState.roster.get('char1')?.inventory).toHaveLength(0);
    });

    it('should return immutable state (not mutate original)', () => {
      const char = createTestCharacter({ id: 'char1', inventory: [] });
      const originalState = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 100 },
      });

      const result: TreasureDistributionResult = {
        goldAdded: 500,
        itemsReceived: [{ id: 'new', name: 'New Item', identified: true } as Item],
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Test Character',
      };

      const newState = ChestService.applyDistributionToState(originalState, result);

      // Original state unchanged
      expect(originalState.party.gold).toBe(100);
      expect(originalState.roster.get('char1')?.inventory).toHaveLength(0);

      // New state has updates
      expect(newState.party.gold).toBe(600);
      expect(newState.roster.get('char1')?.inventory).toHaveLength(1);

      // Different references
      expect(newState).not.toBe(originalState);
      expect(newState.roster).not.toBe(originalState.roster);
      expect(newState.party).not.toBe(originalState.party);
    });
  });
});
