// src/services/__tests__/VictoryService.spec.ts
import { VictoryService } from '../VictoryService';
import { createTestMonster, createTestCharacter } from '@testing/test-factories';
import { Item } from '@models/Item';
import { ItemType, ItemSlot } from '@models/ItemType';
import { ItemDataLoader } from '../ItemDataLoader';

// Helper function to create test items
const createItem = (id: string, name: string, overrides: Partial<Item> = {}): Item => ({
  id,
  name,
  type: ItemType.WEAPON,
  slot: ItemSlot.WEAPON,
  price: 100,
  damage: 5,
  cursed: false,
  identified: true,
  equipped: false,
  ...overrides,
});

describe('VictoryService', () => {
  beforeEach(() => {
    // Mock ItemDataLoader.getItem to return test items
    jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((itemId: string) => {
      return createItem(itemId, itemId.replace(/_/g, ' '));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('calculateVictoryRewards', () => {
    it('calculates total XP from all monsters', () => {
      const monsters = [
        createTestMonster({ xp: 50 }),
        createTestMonster({ xp: 50 }),
        createTestMonster({ xp: 50 }),
      ];
      const roster = new Map([
        ['c1', createTestCharacter({ id: 'c1' })],
        ['c2', createTestCharacter({ id: 'c2' })],
        ['c3', createTestCharacter({ id: 'c3' })],
        ['c4', createTestCharacter({ id: 'c4' })],
        ['c5', createTestCharacter({ id: 'c5' })],
        ['c6', createTestCharacter({ id: 'c6' })],
      ]);
      const partyMembers = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

      const result = VictoryService.calculateVictoryRewards(monsters, roster, partyMembers);

      expect(result.totalXP).toBe(150);
      expect(result.xpPerCharacter).toBe(25); // 150 / 6
      expect(result.livingCharacterCount).toBe(6);
    });

    it('returns zero gold (authentic - gold comes from treasure chests)', () => {
      const monsters = [
        createTestMonster({ gold: 10 }),
        createTestMonster({ gold: 20 }),
        createTestMonster({ gold: 30 }),
      ];
      const roster = new Map([
        ['c1', createTestCharacter({ id: 'c1' })],
        ['c2', createTestCharacter({ id: 'c2' })],
        ['c3', createTestCharacter({ id: 'c3' })],
        ['c4', createTestCharacter({ id: 'c4' })],
        ['c5', createTestCharacter({ id: 'c5' })],
        ['c6', createTestCharacter({ id: 'c6' })],
      ]);
      const partyMembers = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

      const result = VictoryService.calculateVictoryRewards(monsters, roster, partyMembers);

      expect(result.totalGold).toBe(0);
    });

    it('returns zero gold regardless of monster gold values', () => {
      const monsters = [
        createTestMonster({ gold: undefined }),
        createTestMonster({ gold: 0 }),
        createTestMonster({ gold: 10 }),
      ];
      const roster = new Map([
        ['c1', createTestCharacter({ id: 'c1' })],
        ['c2', createTestCharacter({ id: 'c2' })],
        ['c3', createTestCharacter({ id: 'c3' })],
      ]);
      const partyMembers = ['c1', 'c2', 'c3'];

      const result = VictoryService.calculateVictoryRewards(monsters, roster, partyMembers);

      expect(result.totalGold).toBe(0);
    });

    it('divides XP evenly rounded down', () => {
      const monsters = [createTestMonster({ xp: 100 })];
      const roster = new Map([
        ['c1', createTestCharacter({ id: 'c1' })],
        ['c2', createTestCharacter({ id: 'c2' })],
        ['c3', createTestCharacter({ id: 'c3' })],
      ]);
      const partyMembers = ['c1', 'c2', 'c3'];

      const result = VictoryService.calculateVictoryRewards(monsters, roster, partyMembers);

      expect(result.xpPerCharacter).toBe(33); // floor(100/3)
    });

    it('handles empty monster array', () => {
      const roster = new Map([['c1', createTestCharacter({ id: 'c1' })]]);
      const partyMembers = ['c1'];

      const result = VictoryService.calculateVictoryRewards([], roster, partyMembers);

      expect(result.totalXP).toBe(0);
      expect(result.xpPerCharacter).toBe(0);
      expect(result.totalGold).toBe(0);
      expect(result.livingCharacterCount).toBe(1);
      expect(result.items).toEqual([]);
    });

    it('generates items array in rewards', () => {
      const monsters = [createTestMonster({ xp: 50, level: 1 })];
      const roster = new Map([['c1', createTestCharacter({ id: 'c1' })]]);
      const partyMembers = ['c1'];

      const result = VictoryService.calculateVictoryRewards(monsters, roster, partyMembers);

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('item drops have required properties', () => {
      // Create many monsters to increase chance of getting at least one item
      const monsters = Array(50)
        .fill(null)
        .map((_, i) => createTestMonster({ xp: 50, level: 6, id: `m${i}` }));
      const roster = new Map([['c1', createTestCharacter({ id: 'c1' })]]);
      const partyMembers = ['c1'];

      const result = VictoryService.calculateVictoryRewards(monsters, roster, partyMembers);

      // With 50 level-6 monsters, we should get at least one item (15% chance per level group)
      if (result.items.length > 0) {
        const item = result.items[0];
        expect(item.itemId).toBeDefined();
        expect(item.itemName).toBeDefined();
        expect(typeof item.identified).toBe('boolean');
      }
    });
  });

  describe('distributeRewards', () => {
    it('adds XP to all party members', () => {
      const char1 = createTestCharacter({ id: 'c1', experience: 100 });
      const char2 = createTestCharacter({ id: 'c2', experience: 200 });
      const roster = new Map([
        ['c1', char1],
        ['c2', char2],
      ]);
      const partyMembers = ['c1', 'c2'];

      const newRoster = VictoryService.distributeRewards(roster, partyMembers, 50);

      expect(newRoster.get('c1')!.experience).toBe(150);
      expect(newRoster.get('c2')!.experience).toBe(250);
    });

    it('returns new Map instance (immutable)', () => {
      const roster = new Map([['c1', createTestCharacter()]]);
      const partyMembers = ['c1'];

      const newRoster = VictoryService.distributeRewards(roster, partyMembers, 10);

      expect(newRoster).not.toBe(roster);
    });

    it('skips party members not in roster', () => {
      const char1 = createTestCharacter({ id: 'c1', experience: 100 });
      const roster = new Map([['c1', char1]]);
      const partyMembers = ['c1', 'c2', 'c3']; // c2, c3 don't exist

      const newRoster = VictoryService.distributeRewards(roster, partyMembers, 10);

      expect(newRoster.size).toBe(1); // Only c1 updated
      expect(newRoster.has('c2')).toBe(false);
      expect(newRoster.get('c1')!.experience).toBe(110); // c1 got XP
    });
  });

  describe('distributeItems', () => {
    it('distributes items to party members with space', () => {
      const char1 = createTestCharacter({ id: 'c1', inventory: [] });
      const char2 = createTestCharacter({ id: 'c2', inventory: [] });
      const roster = new Map([
        ['c1', char1],
        ['c2', char2],
      ]);
      const partyMembers = ['c1', 'c2'];
      const items = [
        { itemId: 'dagger', itemName: 'Dagger', identified: true },
        { itemId: 'short_sword', itemName: 'Short Sword', identified: true },
      ];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      expect(result.roster.get('c1')!.inventory.length).toBe(1);
      expect(result.roster.get('c1')!.inventory.find((i) => i.id === 'dagger')).toBeDefined();
      expect(result.roster.get('c2')!.inventory.length).toBe(1);
      expect(result.roster.get('c2')!.inventory.find((i) => i.id === 'short_sword')).toBeDefined();
    });

    it('returns new Map instance (immutable)', () => {
      const roster = new Map([['c1', createTestCharacter({ inventory: [] })]]);
      const partyMembers = ['c1'];
      const items = [{ itemId: 'dagger', itemName: 'Dagger', identified: true }];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      expect(result.roster).not.toBe(roster);
    });

    it('distributes to first character with space', () => {
      const fullInventory = Array(8)
        .fill(null)
        .map((_, i) => createItem(`item${i}`, `Item ${i}`));
      const char1 = createTestCharacter({ id: 'c1', inventory: fullInventory }); // Full
      const char2 = createTestCharacter({ id: 'c2', inventory: [] }); // Empty
      const roster = new Map([
        ['c1', char1],
        ['c2', char2],
      ]);
      const partyMembers = ['c1', 'c2'];
      const items = [{ itemId: 'dagger', itemName: 'Dagger', identified: true }];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      expect(result.roster.get('c1')!.inventory.length).toBe(8); // Still full
      expect(result.roster.get('c2')!.inventory.length).toBe(1); // Got item
      expect(result.roster.get('c2')!.inventory.find((i) => i.id === 'dagger')).toBeDefined();
    });

    it('tracks which items were added to which characters', () => {
      const char1 = createTestCharacter({ id: 'c1', inventory: [] });
      const char2 = createTestCharacter({ id: 'c2', inventory: [] });
      const roster = new Map([
        ['c1', char1],
        ['c2', char2],
      ]);
      const partyMembers = ['c1', 'c2'];
      const items = [
        { itemId: 'dagger', itemName: 'Dagger', identified: true },
        { itemId: 'short_sword', itemName: 'Short Sword', identified: true },
      ];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      expect(result.itemsAdded.get('c1')).toEqual(['dagger']);
      expect(result.itemsAdded.get('c2')).toEqual(['short_sword']);
    });

    it('handles multiple items to same character', () => {
      const char1 = createTestCharacter({ id: 'c1', inventory: [] });
      const roster = new Map([['c1', char1]]);
      const partyMembers = ['c1'];
      const items = [
        { itemId: 'dagger', itemName: 'Dagger', identified: true },
        { itemId: 'short_sword', itemName: 'Short Sword', identified: true },
        { itemId: 'staff', itemName: 'Staff', identified: true },
      ];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      expect(result.roster.get('c1')!.inventory.length).toBe(3);
      expect(result.roster.get('c1')!.inventory.find((i) => i.id === 'dagger')).toBeDefined();
      expect(result.roster.get('c1')!.inventory.find((i) => i.id === 'short_sword')).toBeDefined();
      expect(result.roster.get('c1')!.inventory.find((i) => i.id === 'staff')).toBeDefined();
      expect(result.itemsAdded.get('c1')).toEqual(['dagger', 'short_sword', 'staff']);
    });

    it('handles empty items array', () => {
      const roster = new Map([['c1', createTestCharacter({ inventory: [] })]]);
      const partyMembers = ['c1'];
      const items: any[] = [];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      expect(result.roster.get('c1')!.inventory.length).toBe(0);
      expect(result.itemsAdded.size).toBe(0);
    });

    it('only distributes to living characters', () => {
      const char1 = createTestCharacter({ id: 'c1', inventory: [], hp: 0, status: 'DEAD' as any });
      const char2 = createTestCharacter({ id: 'c2', inventory: [], hp: 10 });
      const roster = new Map([
        ['c1', char1],
        ['c2', char2],
      ]);
      const partyMembers = ['c1', 'c2'];
      const items = [{ itemId: 'dagger', itemName: 'Dagger', identified: true }];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      expect(result.roster.get('c1')!.inventory.length).toBe(0); // Dead, no items
      expect(result.roster.get('c2')!.inventory.length).toBe(1); // Living, got item
      expect(result.itemsAdded.get('c2')).toEqual(['dagger']);
    });

    it('loses items when all inventories are full', () => {
      const fullInventory = Array(8)
        .fill(null)
        .map((_, i) => createItem(`item${i}`, `Item ${i}`));
      const char1 = createTestCharacter({ id: 'c1', inventory: fullInventory });
      const char2 = createTestCharacter({ id: 'c2', inventory: fullInventory });
      const roster = new Map([
        ['c1', char1],
        ['c2', char2],
      ]);
      const partyMembers = ['c1', 'c2'];
      const items = [{ itemId: 'dagger', itemName: 'Dagger', identified: true }];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      // Both characters still have exactly 8 items, item is lost
      expect(result.roster.get('c1')!.inventory.length).toBe(8);
      expect(result.roster.get('c2')!.inventory.length).toBe(8);
      expect(result.itemsAdded.size).toBe(0);
    });

    it('respects 8-item inventory limit', () => {
      const sevenItems = Array(7)
        .fill(null)
        .map((_, i) => createItem(`existing_item${i}`, `Existing Item ${i}`));
      const char1 = createTestCharacter({ id: 'c1', inventory: sevenItems }); // 7 items
      const roster = new Map([['c1', char1]]);
      const partyMembers = ['c1'];
      const items = [
        { itemId: 'new_item1', itemName: 'New Item 1', identified: true },
        { itemId: 'new_item2', itemName: 'New Item 2', identified: true },
      ];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      // Can only add 1 item to reach limit of 8
      expect(result.roster.get('c1')!.inventory.length).toBe(8);
      expect(result.roster.get('c1')!.inventory.find((i) => i.id === 'new_item1')).toBeDefined();
      expect(result.roster.get('c1')!.inventory.find((i) => i.id === 'new_item2')).toBeUndefined(); // Lost
    });

    it('handles all dead party members gracefully', () => {
      const char1 = createTestCharacter({ id: 'c1', inventory: [], hp: 0, status: 'DEAD' as any });
      const char2 = createTestCharacter({ id: 'c2', inventory: [], hp: 0, status: 'DEAD' as any });
      const roster = new Map([
        ['c1', char1],
        ['c2', char2],
      ]);
      const partyMembers = ['c1', 'c2'];
      const items = [
        { itemId: 'dagger', itemName: 'Dagger', identified: true },
        { itemId: 'sword', itemName: 'Sword', identified: true },
      ];

      const result = VictoryService.distributeItems(roster, partyMembers, items);

      // No items distributed to dead characters
      expect(result.roster.get('c1')!.inventory.length).toBe(0);
      expect(result.roster.get('c2')!.inventory.length).toBe(0);
      expect(result.itemsAdded.size).toBe(0);
    });
  });
});
