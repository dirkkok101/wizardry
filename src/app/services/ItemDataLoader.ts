import { Item } from '@types/Item';
import { ItemType, ItemSlot } from '@types/ItemType';
import { CharacterClass } from '@types/CharacterClass';
import { Alignment } from '@types/Alignment';
import { ItemSchema, ValidatedItem } from '@validation/item-schema';
import { AssetLoadingService } from './AssetLoadingService';

/**
 * Service for loading and validating item data from JSON files
 * Uses AssetLoadingService for centralized loading infrastructure
 * Implements caching to prevent multiple loads
 * Gracefully handles individual item failures
 * Validates all items with Zod schemas at runtime
 */
export class ItemDataLoader {
  private static itemsCache: Map<string, Item> | null = null;
  private static loadPromise: Promise<Map<string, Item>> | null = null;
  private static loading = false;
  private static loaded = false;
  private static loadError: Error | null = null;
  private static failedItems: Map<string, string> = new Map(); // itemId → error message

  /**
   * Load all item JSON files and validate them
   * Returns cached results on subsequent calls
   * Gracefully handles individual item failures
   */
  static async loadAllItems(): Promise<Map<string, Item>> {
    // Return cached result if available
    if (this.itemsCache) {
      return this.itemsCache;
    }

    // Return in-progress load if one exists
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Start new load
    this.loadPromise = this.performLoad();
    this.itemsCache = await this.loadPromise;
    return this.itemsCache;
  }

  /**
   * Internal method to perform the actual loading
   * Uses AssetLoadingService for centralized infrastructure
   */
  private static async performLoad(): Promise<Map<string, Item>> {
    this.loading = true;
    this.loadError = null;
    this.failedItems.clear();

    const items = new Map<string, Item>();

    try {
      // Use AssetLoadingService to load item JSON files
      const assetLoader = new AssetLoadingService();
      const rawItems = await assetLoader.loadDataFiles<any>('items');

      // Validate each item with Zod and convert to runtime Item format
      for (const [itemId, rawItem] of rawItems.entries()) {
        try {
          // Validate with Zod
          const validated: ValidatedItem = ItemSchema.parse(rawItem);

          // Transform to runtime Item format
          const item = this.transformValidatedToItem(validated);

          items.set(itemId, item);
        } catch (error) {
          // Track validation failure but continue loading other items
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.failedItems.set(itemId, errorMessage);
          console.warn(`Failed to validate item ${itemId}:`, errorMessage);
        }
      }

      this.loaded = true;

      const successCount = items.size;
      const failCount = this.failedItems.size;
      const totalCount = successCount + failCount;

      if (failCount > 0) {
        console.warn(`Loaded ${successCount}/${totalCount} items (${failCount} failed)`);
      } else {
        console.log(`✅ Loaded and validated ${successCount}/${totalCount} items`);
      }

      return items;
    } catch (error) {
      // Catastrophic failure (e.g., directory not found)
      this.loadError = error as Error;
      console.error('Failed to load items:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Transform validated JSON item to runtime Item format
   * Maps JSON schema to Item interface
   */
  private static transformValidatedToItem(validated: ValidatedItem): Item {
    // Determine ItemType from category
    const type = this.mapCategoryToType(validated.category);

    // Determine ItemSlot from type and subtypes
    const slot = this.deriveSlot(validated);

    // Map class restrictions
    const classRestrictions = validated.usableBy.map((cls) => this.mapClassString(cls));

    // Transform damage (use max value from damage roll)
    const damage = 'damage' in validated ? validated.damage.max : undefined;

    // Transform defense (ac in JSON)
    const defense = 'ac' in validated ? validated.ac : undefined;

    // Price (cost in JSON)
    const price = validated.cost;

    return {
      // Core identity
      id: validated.id,
      name: validated.name,

      // Transformed runtime fields
      type,
      slot,
      price,
      damage,
      defense,
      classRestrictions,

      // Direct mappings
      cursed: validated.cursed,
      identified: false,  // Runtime default
      equipped: false,     // Runtime default
      alignmentRestrictions: validated.alignmentRequired ?
        [validated.alignmentRequired.toUpperCase() as Alignment] : undefined,

      // Preserve JSON fields for reference
      category: validated.category,
      weaponType: 'weaponType' in validated ? validated.weaponType : undefined,
      armorType: 'armorType' in validated ? validated.armorType : undefined,
      consumableType: 'consumableType' in validated ? validated.consumableType : undefined,
      cost: validated.cost,
      damageRoll: 'damage' in validated ? validated.damage : undefined,
      ac: defense,
      usableBy: validated.usableBy,
      enhancement: 'enhancement' in validated ? validated.enhancement : undefined,
      special: validated.special || null,
      singleUse: 'singleUse' in validated ? validated.singleUse : undefined,
      depletionChance: 'depletionChance' in validated ? validated.depletionChance : undefined,
      transformsTo: 'transformsTo' in validated ? validated.transformsTo : undefined,
      effect: 'effect' in validated ? validated.effect : undefined
    };
  }

  /**
   * Map JSON category string to ItemType enum
   */
  private static mapCategoryToType(category: string): ItemType {
    const mapping: Record<string, ItemType> = {
      'weapon': ItemType.WEAPON,
      'armor': ItemType.ARMOR,
      'shield': ItemType.SHIELD,
      'helmet': ItemType.HELMET,
      'gauntlets': ItemType.GAUNTLET,
      'accessory': ItemType.MISC,
      'consumable': ItemType.CONSUMABLE,
      'special': ItemType.MISC
    };

    return mapping[category] || ItemType.MISC;
  }

  /**
   * Derive ItemSlot from category and subtypes
   */
  private static deriveSlot(validated: ValidatedItem): ItemSlot {
    if (validated.category === 'weapon') return ItemSlot.WEAPON;
    if (validated.category === 'armor' && 'armorType' in validated && validated.armorType === 'body') return ItemSlot.ARMOR;
    if (validated.category === 'shield') return ItemSlot.SHIELD;
    if (validated.category === 'helmet') return ItemSlot.HELMET;
    if (validated.category === 'gauntlets') return ItemSlot.GAUNTLETS;
    return ItemSlot.NONE;  // Consumables and misc items
  }

  /**
   * Map class string from JSON to CharacterClass enum
   */
  private static mapClassString(classStr: string): CharacterClass {
    const mapping: Record<string, CharacterClass> = {
      'fighter': CharacterClass.FIGHTER,
      'mage': CharacterClass.MAGE,
      'priest': CharacterClass.PRIEST,
      'thief': CharacterClass.THIEF,
      'bishop': CharacterClass.BISHOP,
      'samurai': CharacterClass.SAMURAI,
      'lord': CharacterClass.LORD,
      'ninja': CharacterClass.NINJA
    };

    return mapping[classStr.toLowerCase()] || CharacterClass.FIGHTER;
  }

  /**
   * Get a specific item by ID
   * Must call loadAllItems first
   */
  static getItem(itemId: string): Item | null {
    if (!this.itemsCache) {
      throw new Error('Items not loaded. Call loadAllItems() first.');
    }
    return this.itemsCache.get(itemId) ?? null;
  }

  /**
   * Get all loaded items
   */
  static getAllItems(): Map<string, Item> {
    if (!this.itemsCache) {
      throw new Error('Items not loaded. Call loadAllItems() first.');
    }
    return this.itemsCache;
  }

  /**
   * Get multiple items by IDs
   * Filters out null values (missing items)
   */
  static getItems(itemIds: string[]): Item[] {
    return itemIds
      .map(id => this.getItem(id))
      .filter((item): item is Item => item !== null);
  }

  /**
   * Get all items of a specific type
   */
  static getItemsByType(type: ItemType): Item[] {
    if (!this.itemsCache) {
      throw new Error('Items not loaded. Call loadAllItems() first.');
    }
    return Array.from(this.itemsCache.values())
      .filter(item => item.type === type);
  }

  /**
   * Check if items are currently being loaded
   */
  static isLoading(): boolean {
    return this.loading;
  }

  /**
   * Check if items have been successfully loaded
   */
  static isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get any error that occurred during loading
   */
  static getError(): Error | null {
    return this.loadError;
  }

  /**
   * Get map of failed item loads
   * @returns Map of itemId → error message for items that failed to load
   */
  static getFailedItems(): ReadonlyMap<string, string> {
    return this.failedItems;
  }

  /**
   * Get count of successfully loaded items
   */
  static getLoadedCount(): number {
    return this.itemsCache?.size ?? 0;
  }

  /**
   * Get total count of items attempted to load
   */
  static getTotalCount(): number {
    return this.getLoadedCount() + this.failedItems.size;
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.itemsCache = null;
    this.loadPromise = null;
    this.loading = false;
    this.loaded = false;
    this.loadError = null;
    this.failedItems.clear();
  }
}
