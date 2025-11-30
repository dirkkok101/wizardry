/**
 * ChestService Tests
 *
 * Tests for chest generation, treasure distribution, and inventory management.
 *
 * Note: Trap data is loaded from real JSON files via setup-jest.ts
 */

import { ChestService } from '../ChestService'
import { RandomService } from '../RandomService'
import { TrapDataLoader } from '../TrapDataLoader'
import { createTestCharacter } from '@testing/test-factories'
import { TrapId } from '@models/Trap'
import { RewardTier, GOLD_RANGE_BY_TIER } from '@models/Chest'
import { Position } from '@models/Dungeon'
import { CharacterStatus } from '@models/CharacterStatus'

// Helper to create test position
function createTestPosition(): Position {
  return { x: 5, y: 5, facing: 'NORTH' }
}

describe('ChestService', () => {
  // Trap data is pre-loaded by setup-jest.ts from real JSON files

  describe('generateChest', () => {
    it('should generate a chest with correct properties', async () => {
      RandomService.setSeed(12345)

      const chest = await ChestService.generateChest(14, 5, createTestPosition(), 'combat_victory')

      expect(chest.id).toContain('chest_')
      expect(chest.rewardTier).toBe(14)
      expect(chest.mazeLevel).toBe(5)
      expect(chest.source).toBe('combat_victory')
      expect(chest.trapIdentified).toBe(false)
      expect(chest.trapDisarmed).toBe(false)
      expect(chest.contents.gold).toBeGreaterThan(0)
    })

    it('should respect trap probability by tier', async () => {
      const position = createTestPosition()

      // Test tier 10 (50% trap chance)
      RandomService.queueNextValues([0.6])  // > 50% = no trap
      const tier10NoTrap = await ChestService.generateChest(10, 1, position, 'combat_victory')
      expect(tier10NoTrap.trapped).toBe(false)

      RandomService.queueNextValues([0.4])  // < 50% = trapped
      const tier10Trapped = await ChestService.generateChest(10, 1, position, 'combat_victory')
      expect(tier10Trapped.trapped).toBe(true)

      // Test tier 19 (95% trap chance)
      RandomService.queueNextValues([0.99])  // > 95% = no trap
      const tier19NoTrap = await ChestService.generateChest(19, 10, position, 'combat_victory')
      expect(tier19NoTrap.trapped).toBe(false)

      RandomService.queueNextValues([0.90])  // < 95% = trapped
      const tier19Trapped = await ChestService.generateChest(19, 10, position, 'combat_victory')
      expect(tier19Trapped.trapped).toBe(true)
    })

    it('should generate gold within tier range', async () => {
      RandomService.setSeed(12345)
      const position = createTestPosition()

      const tier10Chest = await ChestService.generateChest(10, 1, position, 'combat_victory')
      const tier10Range = GOLD_RANGE_BY_TIER[10]
      expect(tier10Chest.contents.gold).toBeGreaterThanOrEqual(tier10Range.min)
      expect(tier10Chest.contents.gold).toBeLessThanOrEqual(tier10Range.max)

      const tier19Chest = await ChestService.generateChest(19, 10, position, 'boss')
      const tier19Range = GOLD_RANGE_BY_TIER[19]
      expect(tier19Chest.contents.gold).toBeGreaterThanOrEqual(tier19Range.min)
      expect(tier19Chest.contents.gold).toBeLessThanOrEqual(tier19Range.max)
    })
  })

  describe('generateCombatChest', () => {
    it('should map monster level to reward tier', async () => {
      const position = createTestPosition()

      // Monster level 1-2 → tier 10
      RandomService.setSeed(100)
      const lowTier = await ChestService.generateCombatChest(2, 1, position)
      expect(lowTier.rewardTier).toBe(10)

      // Monster level 9 → tier 14 (formula: 10 + floor((9-1)/2) = 10 + 4 = 14)
      // Using level 9 because levels 10-19 overlap with Reward 2 range and are treated as direct values
      RandomService.setSeed(100)
      const midTier = await ChestService.generateCombatChest(9, 5, position)
      expect(midTier.rewardTier).toBe(14)

      // Monster level 20+ → tier 19 (capped at max)
      RandomService.setSeed(100)
      const highTier = await ChestService.generateCombatChest(25, 10, position)
      expect(highTier.rewardTier).toBe(19)
    })

    it('should accept Reward 2 values directly', async () => {
      const position = createTestPosition()

      // Pass Reward 2 value directly (10-19 range)
      RandomService.setSeed(100)
      const directTier = await ChestService.generateCombatChest(15, 5, position)
      expect(directTier.rewardTier).toBe(15)
    })

    it('should set source as combat_victory', async () => {
      RandomService.setSeed(100)
      const chest = await ChestService.generateCombatChest(5, 3, createTestPosition())
      expect(chest.source).toBe('combat_victory')
    })
  })

  describe('generateBossChest', () => {
    it('should always be trapped', async () => {
      // Even if random would say no trap, boss chests force trapped
      RandomService.queueNextValues([0.99])  // Would normally be > 95% = no trap
      const chest = await ChestService.generateBossChest(10, createTestPosition())
      expect(chest.trapped).toBe(true)
      expect(chest.trapId).not.toBeNull()
    })

    it('should set source as boss', async () => {
      RandomService.setSeed(100)
      const chest = await ChestService.generateBossChest(10, createTestPosition())
      expect(chest.source).toBe('boss')
    })

    it('should be tier 19 (highest in Reward 2 system)', async () => {
      RandomService.setSeed(100)
      const chest = await ChestService.generateBossChest(10, createTestPosition())
      expect(chest.rewardTier).toBe(19)
    })
  })

  describe('checkInventorySpace', () => {
    it('should return null when opener has enough space', () => {
      const opener = createTestCharacter({ inventory: [] })
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [{ id: 'item1', name: 'Sword' } as any] },
        null,
        1,
        createTestPosition()
      )

      const warning = ChestService.checkInventorySpace(opener, chest)
      expect(warning).toBeNull()
    })

    it('should return warning when inventory is full', () => {
      const fullInventory = Array(8).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }))
      const opener = createTestCharacter({ inventory: fullInventory as any })
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [{ id: 'new1', name: 'New Item' } as any] },
        null,
        1,
        createTestPosition()
      )

      const warning = ChestService.checkInventorySpace(opener, chest)

      expect(warning).not.toBeNull()
      expect(warning!.freeSlots).toBe(0)
      expect(warning!.itemsAtRisk).toBe(1)
      expect(warning!.warning).toContain('LOST FOREVER')
    })

    it('should calculate partial risk correctly', () => {
      const inventory = Array(6).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }))
      const opener = createTestCharacter({ inventory: inventory as any })
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [{ id: 'new1', name: 'Item 1' }, { id: 'new2', name: 'Item 2' }, { id: 'new3', name: 'Item 3' }] as any },
        null,
        1,
        createTestPosition()
      )

      const warning = ChestService.checkInventorySpace(opener, chest)

      expect(warning).not.toBeNull()
      expect(warning!.freeSlots).toBe(2)
      expect(warning!.itemCount).toBe(3)
      expect(warning!.itemsAtRisk).toBe(1)  // 3 items - 2 slots = 1 at risk
    })
  })

  describe('selectRecipient', () => {
    it('should select a random living party member', () => {
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter' })
      const member2 = createTestCharacter({ id: 'char2', name: 'Thief' })
      const member3 = createTestCharacter({ id: 'char3', name: 'Mage' })

      // Queue random to select member2 (index 1 out of 3)
      RandomService.queueNextValues([0.5])  // 0.5 * 3 = 1.5 → floor → 1

      const recipient = ChestService.selectRecipient([member1, member2, member3])

      expect(recipient).not.toBeNull()
      expect(recipient!.id).toBe('char2')
    })

    it('should skip dead members', () => {
      const deadMember = createTestCharacter({
        id: 'dead1',
        name: 'DeadGuy',
        status: CharacterStatus.DEAD
      })
      const livingMember = createTestCharacter({
        id: 'alive1',
        name: 'AliveGuy'
      })

      const recipient = ChestService.selectRecipient([deadMember, livingMember])

      expect(recipient).not.toBeNull()
      expect(recipient!.id).toBe('alive1')
    })

    it('should return null when all members are dead', () => {
      const deadMember1 = createTestCharacter({
        id: 'dead1',
        status: CharacterStatus.DEAD
      })
      const deadMember2 = createTestCharacter({
        id: 'dead2',
        status: CharacterStatus.ASHES
      })

      const recipient = ChestService.selectRecipient([deadMember1, deadMember2])

      expect(recipient).toBeNull()
    })
  })

  describe('distributeTreasure', () => {
    it('should add gold to result', () => {
      const member = createTestCharacter({ inventory: [] })
      const chest = ChestService.createChestWithContents(
        { gold: 500, items: [] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [member])

      expect(result.goldAdded).toBe(500)
    })

    it('should select random living party member as recipient', () => {
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter', inventory: [] })
      const member2 = createTestCharacter({ id: 'char2', name: 'Thief', inventory: [] })
      const member3 = createTestCharacter({ id: 'char3', name: 'Mage', inventory: [] })
      const item = { id: 'sword', name: 'Sword +1' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition()
      )

      // Queue random to select member2 (index 1 out of 3)
      // pickRandom uses Math.floor(nextRandom() * length), so 0.5 * 3 = 1.5 → floor → 1
      RandomService.queueNextValues([0.5])

      const result = ChestService.distributeTreasure(chest, [member1, member2, member3])

      expect(result.recipientId).toBe('char2')
      expect(result.recipientName).toBe('Thief')
    })

    it('should skip dead members when selecting recipient', () => {
      const deadMember = createTestCharacter({
        id: 'dead1',
        name: 'DeadGuy',
        status: CharacterStatus.DEAD,
        inventory: []
      })
      const livingMember = createTestCharacter({
        id: 'alive1',
        name: 'AliveGuy',
        inventory: []
      })
      const item = { id: 'sword', name: 'Sword +1' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [deadMember, livingMember])

      // Only living member should receive items
      expect(result.recipientId).toBe('alive1')
      expect(result.recipientName).toBe('AliveGuy')
      expect(result.itemsReceived).toHaveLength(1)
    })

    it('should lose all items when all party members are dead', () => {
      const deadMember1 = createTestCharacter({
        id: 'dead1',
        status: CharacterStatus.DEAD,
        inventory: []
      })
      const deadMember2 = createTestCharacter({
        id: 'dead2',
        status: CharacterStatus.ASHES,
        inventory: []
      })
      const item = { id: 'rare', name: 'Rare Item' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [deadMember1, deadMember2])

      expect(result.recipientId).toBe('')
      expect(result.recipientName).toBe('No one')
      expect(result.itemsReceived).toHaveLength(0)
      expect(result.itemsLost).toHaveLength(1)
      expect(result.itemsLost).toContain(item)
      // Gold still goes to party pool even if all dead
      expect(result.goldAdded).toBe(100)
    })

    it('should add items to received list when space available', () => {
      const member = createTestCharacter({ inventory: [] })
      const item1 = { id: 'sword', name: 'Sword +1' } as any
      const item2 = { id: 'shield', name: 'Shield' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item1, item2] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [member])

      expect(result.itemsReceived).toHaveLength(2)
      expect(result.itemsReceived).toContain(item1)
      expect(result.itemsReceived).toContain(item2)
      expect(result.itemsLost).toHaveLength(0)
    })

    it('should lose items when recipient inventory is full', () => {
      const fullInventory = Array(8).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }))
      const member = createTestCharacter({ inventory: fullInventory as any })
      const lostItem = { id: 'rare', name: 'Rare Sword +5' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [lostItem] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [member])

      expect(result.itemsReceived).toHaveLength(0)
      expect(result.itemsLost).toHaveLength(1)
      expect(result.itemsLost).toContain(lostItem)
    })

    it('should partially fill inventory and lose overflow', () => {
      const inventory = Array(7).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }))
      const member = createTestCharacter({ inventory: inventory as any })
      const item1 = { id: 'item7', name: 'Fits' } as any
      const item2 = { id: 'item8', name: 'Lost' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item1, item2] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [member])

      expect(result.itemsReceived).toHaveLength(1)
      expect(result.itemsReceived).toContain(item1)
      expect(result.itemsLost).toHaveLength(1)
      expect(result.itemsLost).toContain(item2)
    })

    it('should use pre-selected recipient when provided', () => {
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter', inventory: [] })
      const member2 = createTestCharacter({ id: 'char2', name: 'Thief', inventory: [] })
      const item = { id: 'sword', name: 'Sword +1' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition()
      )

      // Pre-select member1 - should use it regardless of random
      const result = ChestService.distributeTreasure(chest, [member1, member2], member1)

      expect(result.recipientId).toBe('char1')
      expect(result.recipientName).toBe('Fighter')
    })

    it('should ensure pre-selected recipient matches inventory warning', () => {
      // This test verifies the fix for the inventory warning bug:
      // Warning should show the SAME character who will receive items
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter', inventory: [] })
      const fullMember = createTestCharacter({
        id: 'char2',
        name: 'FullGuy',
        inventory: Array(8).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` })) as any
      })
      const item = { id: 'sword', name: 'Sword +1' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition()
      )

      // Step 1: Pre-select recipient (simulating what component does)
      RandomService.queueNextValues([0.8])  // Would select index 1 (fullMember)
      const recipient = ChestService.selectRecipient([member1, fullMember])
      expect(recipient).toBe(fullMember)

      // Step 2: Check inventory (with the ACTUAL recipient)
      const warning = ChestService.checkInventorySpace(recipient!, chest)
      expect(warning).not.toBeNull()
      expect(warning!.warning).toContain('FullGuy')  // Warning shows recipient name

      // Step 3: Distribute treasure (using pre-selected recipient)
      const result = ChestService.distributeTreasure(chest, [member1, fullMember], recipient!)

      // The recipient in warning MATCHES the recipient in distribution
      expect(result.recipientId).toBe('char2')
      expect(result.recipientName).toBe('FullGuy')
      expect(result.itemsLost).toHaveLength(1)  // Item lost because fullMember is full
    })
  })

  describe('getDistributionMessage', () => {
    it('should format gold message', () => {
      const result = {
        goldAdded: 500,
        itemsReceived: [],
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Fighter'
      }

      const message = ChestService.getDistributionMessage(result)
      expect(message).toContain('500 gold')
    })

    it('should format items received message', () => {
      const result = {
        goldAdded: 0,
        itemsReceived: [{ id: 'sword', name: 'Sword +1' }] as any,
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Fighter'
      }

      const message = ChestService.getDistributionMessage(result)
      expect(message).toContain('Sword +1')
    })

    it('should format items lost message', () => {
      const result = {
        goldAdded: 0,
        itemsReceived: [],
        itemsLost: [{ id: 'rare', name: 'Rare Item' }] as any,
        recipientId: 'char1',
        recipientName: 'Fighter'
      }

      const message = ChestService.getDistributionMessage(result)
      expect(message).toContain('LOST')
      expect(message).toContain('Rare Item')
    })
  })

  describe('createEmptyChest', () => {
    it('should create untrapped chest with no contents', () => {
      const chest = ChestService.createEmptyChest(1, createTestPosition())

      expect(chest.trapped).toBe(false)
      expect(chest.trapId).toBeNull()
      expect(chest.trapIdentified).toBe(true)
      expect(chest.contents.gold).toBe(0)
      expect(chest.contents.items).toHaveLength(0)
      expect(chest.rewardTier).toBe(10)  // Lowest tier in Reward 2 system
    })
  })

  describe('createChestWithContents', () => {
    it('should create chest with specified contents and trap', () => {
      const contents = { gold: 1000, items: [{ id: 'item', name: 'Special' }] as any }
      const chest = ChestService.createChestWithContents(
        contents,
        'TELEPORTER',
        5,
        createTestPosition()
      )

      expect(chest.trapped).toBe(true)
      expect(chest.trapId).toBe('TELEPORTER')
      expect(chest.contents.gold).toBe(1000)
      expect(chest.contents.items).toHaveLength(1)
      expect(chest.mazeLevel).toBe(5)
      expect(chest.rewardTier).toBe(14)  // Default mid-tier in Reward 2 system
    })

    it('should create untrapped chest when trapId is null', () => {
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [] },
        null,
        1,
        createTestPosition()
      )

      expect(chest.trapped).toBe(false)
      expect(chest.trapId).toBeNull()
    })
  })

  describe('selectTrapId (authentic Wizardry 1 distribution)', () => {
    // Base traps from authentic distribution
    const BASE_TRAPS = ['POISON_NEEDLE', 'GAS_BOMB']
    const TYPE3_TRAPS = ['CROSSBOW_BOLT', 'EXPLODING_BOX', 'SPLINTERS', 'BLADES', 'STUNNER']
    const HIGH_TIER_TRAPS = ['ALARM', 'TELEPORTER', 'MAGE_BLASTER', 'PRIEST_BLASTER']
    const ALL_BASE_TRAPS = [...BASE_TRAPS, ...TYPE3_TRAPS]

    it('should select from base distribution at low tiers', async () => {
      // At tier 10, high-tier chance is 0%, so we always get base traps
      RandomService.setSeed(12345)

      // Generate multiple traps to verify distribution
      const traps: TrapId[] = []
      for (let i = 0; i < 50; i++) {
        traps.push(await ChestService.selectTrapId(10))
      }

      // All should be base traps (no high-tier at tier 10)
      for (const trap of traps) {
        expect(ALL_BASE_TRAPS).toContain(trap)
      }
    })

    it('should include Type3 traps (Crossbow, Exploding, Splinters, Blades, Stunner)', async () => {
      RandomService.setSeed(12345)
      const traps: TrapId[] = []

      // Generate many traps to see Type3 variety
      for (let i = 0; i < 200; i++) {
        traps.push(await ChestService.selectTrapId(10))
      }

      // Should see at least one Type3 trap
      const hasType3 = traps.some(t => TYPE3_TRAPS.includes(t))
      expect(hasType3).toBe(true)
    })

    it('should include high-tier traps at tier 19 (45% chance)', async () => {
      RandomService.setSeed(12345)
      const traps: TrapId[] = []

      // Generate many traps at tier 19
      for (let i = 0; i < 200; i++) {
        traps.push(await ChestService.selectTrapId(19))
      }

      // Should see at least one high-tier trap (45% chance per roll)
      const hasHighTier = traps.some(t => HIGH_TIER_TRAPS.includes(t))
      expect(hasHighTier).toBe(true)
    })

    it('should have variety in trap selection', async () => {
      RandomService.setSeed(12345)
      const traps: TrapId[] = []

      // Generate many traps at tier 14 (mid-tier, 20% high-tier chance)
      for (let i = 0; i < 100; i++) {
        traps.push(await ChestService.selectTrapId(14))
      }

      // Should have variety
      const uniqueTraps = new Set(traps)
      expect(uniqueTraps.size).toBeGreaterThan(3)  // At least 4 different trap types
    })
  })

  describe('generateGold', () => {
    it('should generate gold within tier range', () => {
      RandomService.setSeed(12345)

      // Test all Reward 2 tiers (10-19)
      for (let tier = 10; tier <= 19; tier++) {
        const gold = ChestService.generateGold(tier as RewardTier)
        const range = GOLD_RANGE_BY_TIER[tier as RewardTier]
        expect(gold).toBeGreaterThanOrEqual(range.min)
        expect(gold).toBeLessThanOrEqual(range.max)
      }
    })
  })
})
