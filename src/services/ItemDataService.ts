import { Item } from '../types/Item';
import { ItemType } from '../types/ItemType';

/**
 * ItemDataService - Loads and caches item data from JSON files
 * Establishes pattern for domain-specific data services
 */
export class ItemDataService {
  private static itemsCache: Map<string, Item> = new Map();
  private static loaded = false;

  /**
   * Load all item data from data/items/*.json
   * Called during game initialization
   */
  static async loadAllItems(): Promise<void> {
    if (this.loaded) return;

    // For now, load from assets (copied from data/ during build)
    const itemFiles = [
      'weapons.json',
      'armor.json',
      'shields.json',
      'helmets.json',
      'gauntlets.json',
      'consumables.json',
      'misc.json'
    ];

    for (const file of itemFiles) {
      try {
        const response = await fetch(`/assets/items/${file}`);
        const items: Item[] = await response.json();

        for (const item of items) {
          this.itemsCache.set(item.id, item);
        }
      } catch (error) {
        console.error(`Failed to load ${file}:`, error);
      }
    }

    this.loaded = true;
  }

  /**
   * Get single item by ID
   */
  static getItem(itemId: string): Item | null {
    return this.itemsCache.get(itemId) ?? null;
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
    return Array.from(this.itemsCache.values())
      .filter(item => item.type === type);
  }

  /**
   * Get inventory count for display
   */
  static getInventoryCount(current: number): { current: number; max: number } {
    return { current, max: 8 };
  }
}
