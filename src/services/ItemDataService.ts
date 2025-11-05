import { Item } from '../types/Item';
import { ItemType, ItemSlot } from '../types/ItemType';
import { CharacterClass } from '../types/CharacterClass';

/**
 * Manifest of all item IDs to load
 * Generated from data/items/ directory
 * TODO: Generate this automatically from build process
 */
const ITEM_IDS = [
  // Weapons
  'bare_hand', 'broken_item', 'dagger', 'long_sword', 'short_sword', 'mace',
  'staff', 'spear', 'axe', 'flail', 'katana', 'nunchaku', 'murasama_blade',
  'shuriken', 'were_slayer', 'evil_slayer', 'blade_cusinart', 'staff_gnilda',
  'staff_mogref',
  // Armor
  'robes', 'leather', 'chain_mail', 'breast_plate', 'plate_mail', 'banded_mail',
  'plate_armor', 'lords_garb', 'plate_x',
  // Shields
  'small_shield', 'large_shield', 'shield_x',
  // Helmets
  'leather_helm', 'iron_helm', 'steel_helm', 'helm_x',
  // Gauntlets
  'leather_gloves', 'gauntlets', 'gauntlets_x',
  // Consumables - Scrolls
  'scroll_halito', 'scroll_mogref', 'scroll_katino', 'scroll_dumapic',
  'scroll_dilto', 'scroll_sopic', 'scroll_mahalito', 'scroll_molito',
  'scroll_morlis', 'scroll_dalto', 'scroll_lahalito', 'scroll_madalto',
  'scroll_makanito', 'scroll_mamorlis', 'scroll_haman', 'scroll_malor',
  'scroll_mahaman', 'scroll_tiltowait', 'scroll_zilwan', 'scroll_badios',
  'scroll_lorto', 'scroll_mabadios', 'scroll_loktofeit', 'scroll_maporfic',
  'scroll_deadly', 'scroll_kandi', 'scroll_di', 'scroll_badi', 'scroll_lorhi',
  'scroll_madi', 'scroll_matu', 'scroll_calfo', 'scroll_manifo', 'scroll_montino',
  'scroll_lomilwa', 'scroll_dialko', 'scroll_latumapic', 'scroll_bamatu',
  'scroll_dial', 'scroll_badial', 'scroll_litokan', 'scroll_kadorto', 'scroll_zilwang',
  'scroll_masopic', 'scroll_haman2', 'scroll_malor2', 'scroll_mahaman2', 'scroll_tiltowait2',
  // Misc/Special
  'amulet', 'bear_statue', 'bishops_necklace', 'blue_ribbon', 'bronze_key',
  'dink_key', 'garlic', 'long_sword_x1', 'shield_x1', 'silver_key',
  'werdnas_amulet', 'book'
];

/**
 * ItemDataService - Loads and caches item data from JSON files
 * Transforms JSON format to runtime Item format
 */
export class ItemDataService {
  private static itemsCache: Map<string, Item> = new Map();
  private static loaded = false;
  private static loadError: Error | null = null;

  /**
   * Load all item data from individual JSON files in /assets/items/
   * Called during game initialization
   */
  static async loadAllItems(): Promise<void> {
    if (this.loaded) return;

    try {
      const loadPromises = ITEM_IDS.map(async (itemId) => {
        try {
          const response = await fetch(`/assets/items/${itemId}.json`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const jsonData = await response.json();
          const item = this.transformJsonToItem(jsonData);
          this.itemsCache.set(item.id, item);
        } catch (error) {
          console.warn(`Failed to load item ${itemId}:`, error);
          // Continue loading other items even if one fails
        }
      });

      await Promise.all(loadPromises);
      this.loaded = true;
      console.log(`Loaded ${this.itemsCache.size}/${ITEM_IDS.length} items`);
    } catch (error) {
      this.loadError = error as Error;
      throw error;
    }
  }

  /**
   * Transform JSON data to runtime Item format
   * Maps JSON schema to Item interface
   */
  private static transformJsonToItem(json: any): Item {
    // Determine ItemType from category
    const type = this.mapCategoryToType(json.category);

    // Determine ItemSlot from type and subtypes
    const slot = this.deriveSlot(json);

    // Map class restrictions
    const classRestrictions = json.usableBy
      ? json.usableBy.map((cls: string) => this.mapClassString(cls))
      : undefined;

    // Transform damage (use max value from damageRoll)
    const damage = json.damageRoll?.max;

    // Transform defense (ac in JSON)
    const defense = json.ac;

    // Price (cost in JSON)
    const price = json.cost || 0;

    return {
      // Core identity
      id: json.id,
      name: json.name,

      // Transformed runtime fields
      type,
      slot,
      price,
      damage,
      defense,
      classRestrictions,

      // Direct mappings
      cursed: json.cursed || false,
      identified: false,  // Runtime default
      equipped: false,     // Runtime default

      // Preserve JSON fields for reference
      category: json.category,
      weaponType: json.weaponType,
      armorType: json.armorType,
      consumableType: json.consumableType,
      cost: json.cost,
      damageRoll: json.damageRoll,
      ac: json.ac,
      usableBy: json.usableBy,
      enhancement: json.enhancement,
      special: json.special,
      singleUse: json.singleUse,
      depletionChance: json.depletionChance,
      transformsTo: json.transformsTo,
      effect: json.effect
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
      'gauntlet': ItemType.GAUNTLET,
      'consumable': ItemType.CONSUMABLE,
      'misc': ItemType.MISC
    };

    return mapping[category] || ItemType.MISC;
  }

  /**
   * Derive ItemSlot from category and subtypes
   */
  private static deriveSlot(json: any): ItemSlot {
    if (json.category === 'weapon') return ItemSlot.WEAPON;
    if (json.category === 'armor' && json.armorType === 'body') return ItemSlot.ARMOR;
    if (json.category === 'shield') return ItemSlot.SHIELD;
    if (json.category === 'helmet') return ItemSlot.HEAD;
    if (json.category === 'gauntlet') return ItemSlot.HANDS;
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
}
