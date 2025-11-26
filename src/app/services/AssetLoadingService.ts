import { Injectable } from '@angular/core';
import { TextureAtlas, TextureSet } from '@types/texture.types';
import * as TextureAtlasService from './TextureAtlasService';

/**
 * AssetLoadingService - Service for loading game assets
 */

export interface TitleAssets {
  titleBitmap: HTMLImageElement
  fonts: FontFace[]
  uiSounds?: {
    click?: AudioBuffer
    beep?: AudioBuffer
  }
}

export interface GameAssets {
  sprites: Record<string, HTMLImageElement>
  sounds: Record<string, AudioBuffer>
  dataFiles: Map<string, any>
  textures?: Map<string, TextureSet>  // Texture sets keyed by ID
}

export interface LoadingStats {
  totalCount: number
  loadedCount: number
  failedCount: number
  progress: number
  state: 'idle' | 'loading' | 'complete' | 'error'
}

class AssetLoadError extends Error {
  constructor(
    public assetId: string,
    public assetType: string,
    public reason: string,
    public originalError?: Error
  ) {
    super(`Failed to load ${assetType} '${assetId}': ${reason}`)
    this.name = 'AssetLoadError'
  }
}

// Asset cache
const assetCache = new Map<string, any>()
const loadingStats: LoadingStats = {
  totalCount: 0,
  loadedCount: 0,
  failedCount: 0,
  progress: 0,
  state: 'idle'
}

// Event handlers
const loadCompleteHandlers: Array<() => void> = []
const loadProgressHandlers: Array<(progress: number) => void> = []
const loadErrorHandlers: Array<(error: AssetLoadError) => void> = []

/**
 * Load title screen assets (critical path)
 * NOTE: Images are not used - this returns minimal placeholder data
 */
async function loadTitleAssets(): Promise<TitleAssets> {
  // Return minimal assets without loading images
  // Images are not used in this text-based implementation
  return {
    titleBitmap: new Image(), // Placeholder - not actually used
    fonts: []
  }
}

/**
 * Load castle menu background image
 * NOTE: Images are not used - returns placeholder
 */
async function loadCastleMenuAssets(): Promise<HTMLImageElement> {
  return new Image() // Placeholder - not actually used
}

/**
 * Load training grounds background image
 * NOTE: Images are not used - returns placeholder
 */
async function loadTrainingGroundsAssets(): Promise<HTMLImageElement> {
  return new Image() // Placeholder - not actually used
}

/**
 * Load a single texture atlas and extract textures.
 *
 * @param atlas - Texture atlas metadata
 * @returns Extracted textures from the atlas
 */
async function loadTextureAtlasAndExtract(atlas: TextureAtlas): Promise<import('../types/texture.types').Texture[]> {
  try {
    // Load sprite sheet image
    const spriteSheet = await TextureAtlasService.loadTextureAtlas(atlas);

    // Extract all textures from the sprite sheet
    const textures = TextureAtlasService.extractAllTextures(spriteSheet, atlas);

    // Cache the atlas
    assetCache.set(`atlas:${atlas.id}`, textures);

    return textures;
  } catch (error) {
    throw new AssetLoadError(
      atlas.id,
      'texture_atlas',
      `Failed to load texture atlas`,
      error as Error
    );
  }
}

/**
 * Load texture atlases from metadata files.
 *
 * Loads atlas metadata JSON files, then loads each sprite sheet and extracts textures.
 *
 * @param atlasMetadataFiles - Array of atlas metadata file paths
 * @returns Map of texture sets keyed by atlas ID
 */
async function loadTextureAtlases(atlasMetadataFiles: string[]): Promise<Map<string, TextureSet>> {
  const textureSets = new Map<string, TextureSet>();

  for (const metadataPath of atlasMetadataFiles) {
    try {
      // Load atlas metadata JSON
      const response = await fetch(metadataPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${metadataPath}: ${response.statusText}`);
      }
      const atlasMetadata: TextureAtlas = await response.json();

      // Load sprite sheet and extract textures
      const textures = await loadTextureAtlasAndExtract(atlasMetadata);

      // Create texture set
      const textureSet = TextureAtlasService.createTextureSet(
        atlasMetadata.id,
        atlasMetadata.description || atlasMetadata.id,
        textures
      );

      textureSets.set(atlasMetadata.id, textureSet);

      // Update progress
      loadingStats.loadedCount++;
      loadingStats.progress = (loadingStats.loadedCount / loadingStats.totalCount) * 100;
      loadProgressHandlers.forEach(handler => handler(loadingStats.progress));
    } catch (error) {
      loadingStats.failedCount++;
      const assetError = new AssetLoadError(
        metadataPath,
        'texture_atlas_metadata',
        `Failed to load texture atlas metadata`,
        error as Error
      );
      loadErrorHandlers.forEach(handler => handler(assetError));
      throw assetError;
    }
  }

  return textureSets;
}

/**
 * Load all game assets in parallel
 */
async function loadGameAssets(): Promise<GameAssets> {
  loadingStats.state = 'loading'
  loadingStats.totalCount = 1 // Will increase as we add more assets

  try {
    // For now, just return empty assets
    // Will be expanded in future tasks
    const assets: GameAssets = {
      sprites: {},
      sounds: {},
      dataFiles: new Map()
    }

    loadingStats.loadedCount = loadingStats.totalCount
    loadingStats.progress = 100
    loadingStats.state = 'complete'

    // Notify handlers
    loadCompleteHandlers.forEach(handler => handler())

    return assets
  } catch (error) {
    loadingStats.state = 'error'
    throw error
  }
}

/**
 * Load an image asset
 * NOTE: Deprecated - images are not used in this text-based implementation
 */
async function loadImage(assetId: string, path: string): Promise<HTMLImageElement> {
  console.warn('loadImage is deprecated and should not be used')
  return new Image()
}

/**
 * Check if asset is loaded
 */
function isAssetLoaded(assetId: string): boolean {
  return assetCache.has(assetId)
}

/**
 * Get loaded asset by ID
 */
function getAsset<T>(assetId: string): T | null {
  return assetCache.get(assetId) ?? null
}

/**
 * Get loading progress (0-100)
 */
function getLoadingProgress(): number {
  return loadingStats.progress
}

/**
 * Get loading statistics
 */
function getLoadingStats(): LoadingStats {
  return { ...loadingStats }
}

/**
 * Register callback for load complete
 */
function onLoadComplete(callback: () => void): () => void {
  loadCompleteHandlers.push(callback)

  // Return unsubscribe function
  return () => {
    const index = loadCompleteHandlers.indexOf(callback)
    if (index > -1) {
      loadCompleteHandlers.splice(index, 1)
    }
  }
}

/**
 * Register callback for load progress
 */
function onLoadProgress(callback: (progress: number) => void): () => void {
  loadProgressHandlers.push(callback)

  return () => {
    const index = loadProgressHandlers.indexOf(callback)
    if (index > -1) {
      loadProgressHandlers.splice(index, 1)
    }
  }
}

/**
 * Register callback for load errors
 */
function onLoadError(callback: (error: AssetLoadError) => void): () => void {
  loadErrorHandlers.push(callback)

  return () => {
    const index = loadErrorHandlers.indexOf(callback)
    if (index > -1) {
      loadErrorHandlers.splice(index, 1)
    }
  }
}

/**
 * Load all JSON data files from a directory
 * @param directory - Directory name under /assets/ (e.g., 'races', 'classes')
 * @returns Map of data objects keyed by their 'id' property
 */
async function loadDataFiles<T extends { id: string }>(directory: string): Promise<Map<string, T>> {
  const dataMap = new Map<string, T>()

  // Determine file list based on directory
  const files = getDataFileList(directory)

  // Load each file
  for (const filename of files) {
    const path = `/assets/${directory}/${filename}`
    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`)
      }
      const data: T = await response.json()
      dataMap.set(data.id, data)
    } catch (error) {
      console.error(`Error loading ${path}:`, error)
      throw error
    }
  }

  return dataMap
}

/**
 * Get list of data files for a directory
 * Exported for use by data loaders that need direct file access
 */
export function getDataFileList(directory: string): string[] {
  switch (directory) {
    case 'races':
      return ['human.json', 'elf.json', 'dwarf.json', 'gnome.json', 'hobbit.json']
    case 'classes':
      return ['fighter.json', 'mage.json', 'priest.json', 'thief.json', 'bishop.json', 'samurai.json', 'lord.json', 'ninja.json']
    case 'spells':
      // All 51 spell JSON files from data/spells/ (alphabetically sorted)
      // All spells now use single-level format (multi-level variants removed)
      // Contains all 41 authentic Wizardry 1 spells (21 Mage + 20 Priest)
      return [
        'badi.json', 'badial.json', 'badialma.json', 'badios.json', 'bamatu.json',
        'calfo.json', 'dalto.json', 'di.json', 'dial.json', 'dialko.json', 'dialma.json', 'dilto.json', 'dios.json', 'dumapic.json',
        'halito.json', 'haman.json', 'kadorto.json', 'kalki.json', 'kandi.json', 'katino.json',
        'lahalito.json', 'lakanito.json', 'latumapic.json', 'latumofis.json', 'litokan.json', 'loktofeit.json', 'lomilwa.json', 'lomilwa_priest.json', 'lorto.json',
        'mabadi.json', 'madalto.json', 'madi.json', 'mahalito.json', 'mahaman.json', 'makanito.json', 'malikto.json', 'malor.json', 'mamorlis.json', 'manifo.json', 'maporfic.json', 'masopic.json', 'matu.json',
        'milwa.json', 'mogref.json', 'molito.json', 'montino.json', 'morlis.json',
        'porfic.json', 'sopic.json', 'tiltowait.json', 'zilwan.json'
      ]
    case 'items':
      // Individual item JSON files (102 total) - matches actual files in data/items/
      return [
        "amulet_makanito.json", "amulet_manifo.json", "anointed_flail.json", "anointed_mace.json",
        "armor_heroes.json", "blade_cusinart.json", "blue_ribbon.json", "breast_plate.json",
        "breast_plate_1.json", "breast_plate_2.json", "breast_plate_3.json", "breast_plate_cursed_1.json",
        "breast_plate_cursed_2.json", "broken_item.json", "bronze_key.json", "chain_1.json",
        "chain_2.json", "chain_cursed_1.json", "chain_cursed_2.json", "chain_mail.json",
        "chain_pro_fire.json", "copper_gloves.json", "cursed_helmet.json", "cursed_robe.json",
        "dagger.json", "dagger_1.json", "dagger_2.json", "dagger_speed.json",
        "deadly_ring.json", "diadem_malor.json", "dragon_slayer.json", "evil_plate_3.json",
        "evil_shield_3.json", "evil_sword_3.json", "gold_key.json", "great_helm.json",
        "helm.json", "helm_1.json", "helm_2_evil.json", "jeweled_amulet.json",
        "large_shield.json", "leather_1.json", "leather_2.json", "leather_armor.json",
        "leather_cursed_1.json", "leather_cursed_2.json", "long_sword.json", "long_sword_1.json",
        "long_sword_2.json", "long_sword_cursed_1.json", "lords_garb.json", "mace_1.json",
        "mace_2.json", "mace_cursed_1.json", "mace_cursed_2.json", "mace_protection.json",
        "mage_masher.json", "murasama_blade.json", "neut_pmail_2.json", "plate_mail.json",
        "plate_mail_1.json", "plate_mail_2.json", "potion_dial.json", "potion_dios.json",
        "potion_latumofis.json", "potion_sopic.json", "ring_healing.json", "ring_porfic.json",
        "ring_pro_undead.json", "robes.json", "rod_flame.json", "scroll_badial.json",
        "scroll_badios.json", "scroll_dilto.json", "scroll_halito.json", "scroll_katino.json",
        "scroll_lomilwa.json", "shield_1.json", "shield_2.json", "shield_3.json",
        "shield_cursed_1.json", "shield_cursed_2.json", "short_sword.json", "short_sword_1.json",
        "short_sword_2.json", "short_sword_cursed_1.json", "short_sword_cursed_2.json", "shuriken.json",
        "silver_gloves.json", "silver_key.json", "small_shield.json", "staff.json",
        "staff_2.json", "staff_cursed_2.json", "staff_mogref.json", "staff_montino.json",
        "statuette_bear.json", "statuette_frog.json", "thieves_dagger.json", "vorpal_blade.json",
        "werdna_amulet.json", "were_slayer.json"
      ]
    case 'monsters':
      // Individual monster JSON files (96 total) - matches actual files in data/monsters/
      return [
        "arch_mage_greater.json", "arch_mage_lesser.json", "attack_dog.json", "bishop.json",
        "bleeb.json", "boring_beetle.json", "bubbly_slime.json", "bushwacker.json",
        "capybara.json", "champ_samurai.json", "chimera.json", "coyote.json",
        "creeping_coin.json", "creeping_crud.json", "dragon_fly.json", "dragon_puppy.json",
        "dragon_zombie.json", "earth_giant.json", "fire_dragon.json", "fire_giant.json",
        "flack.json", "frost_giant.json", "gargoyle.json", "gas_cloud.json",
        "gas_dragon.json", "gaze_hound.json", "giant_spider.json", "giant_toad.json",
        "gorgon.json", "grave_mist.json", "greater_demon.json", "hatamoto.json",
        "high_master.json", "high_ninja.json", "high_priest_greater.json", "high_priest_lesser.json",
        "high_wizard.json", "highwayman.json", "huge_spider.json", "killer_wolf.json",
        "kobold.json", "lesser_demon.json", "lifestealer.json", "lvl_10_fighter.json",
        "lvl_10_mage.json", "lvl_1_mage.json", "lvl_1_ninja.json", "lvl_1_priest.json",
        "lvl_3_ninja.json", "lvl_3_priest.json", "lvl_3_samurai.json", "lvl_4_thief.json",
        "lvl_5_mage.json", "lvl_5_priest.json", "lvl_6_ninja.json", "lvl_7_fighter.json",
        "lvl_7_mage.json", "lvl_7_thief.json", "lvl_8_bishop.json", "lvl_8_fighter.json",
        "lvl_8_ninja.json", "lvl_8_priest.json", "maelific.json", "major_daimyo.json",
        "master_ninja.json", "master_thief_greater.json", "master_thief_lesser.json", "medusalizard.json",
        "minor_daimyo.json", "murphy_ghost.json", "nightstalker.json", "ogre.json",
        "ogre_lord.json", "orc.json", "poison_giant.json", "priestess.json",
        "raver_lord.json", "rogue.json", "rotting_corpse.json", "shade.json",
        "spirit.json", "swordsman.json", "thief.json", "troll.json",
        "undead_kobold.json", "vampire.json", "vampire_lord.json", "vorpal_bunny.json",
        "werdna.json", "were_bear.json", "wererat.json", "weretiger.json",
        "werewolf.json", "will_o_wisp.json", "wyvern.json", "zombie.json"
      ]
    case 'maps':
      return Array.from({ length: 10 }, (_, i) => `level-${String(i + 1).padStart(2, '0')}.json`)
    default:
      throw new Error(`Unknown data directory: ${directory}`)
  }
}

/**
 * Clear all cached assets
 */
function clearCache(): void {
  assetCache.clear()
  loadingStats.loadedCount = 0
  loadingStats.failedCount = 0
  loadingStats.progress = 0
  loadingStats.state = 'idle'
}

@Injectable({
  providedIn: 'root'
})
export class AssetLoadingService {
  /**
   * Load title screen assets (alias for loadTitleAssets)
   */
  async loadTitleScreenAssets(): Promise<TitleAssets> {
    return loadTitleAssets();
  }

  /**
   * Load title screen assets (critical path)
   */
  async loadTitleAssets(): Promise<TitleAssets> {
    return loadTitleAssets();
  }

  /**
   * Load castle menu background image
   */
  async loadCastleMenuAssets(): Promise<HTMLImageElement> {
    return loadCastleMenuAssets();
  }

  /**
   * Load training grounds background image
   */
  async loadTrainingGroundsAssets(): Promise<HTMLImageElement> {
    return loadTrainingGroundsAssets();
  }

  /**
   * Load all game assets in parallel
   */
  async loadGameAssets(): Promise<GameAssets> {
    return loadGameAssets();
  }

  /**
   * Check if asset is loaded
   */
  isAssetLoaded(assetId: string): boolean {
    return isAssetLoaded(assetId);
  }

  /**
   * Get loaded asset by ID
   */
  getAsset<T>(assetId: string): T | null {
    return getAsset<T>(assetId);
  }

  /**
   * Get loading progress (0-100)
   */
  getLoadingProgress(): number {
    return getLoadingProgress();
  }

  /**
   * Get loading statistics
   */
  getLoadingStats(): LoadingStats {
    return getLoadingStats();
  }

  /**
   * Register callback for load complete
   */
  onLoadComplete(callback: () => void): () => void {
    return onLoadComplete(callback);
  }

  /**
   * Register callback for load progress
   */
  onLoadProgress(callback: (progress: number) => void): () => void {
    return onLoadProgress(callback);
  }

  /**
   * Register callback for load errors
   */
  onLoadError(callback: (error: AssetLoadError) => void): () => void {
    return onLoadError(callback);
  }

  /**
   * Clear all cached assets
   */
  clearCache(): void {
    clearCache();
  }

  /**
   * Load all JSON data files from a directory
   * @param directory - Directory name under /assets/ (e.g., 'races', 'classes')
   * @returns Map of data objects keyed by their 'id' property
   */
  async loadDataFiles<T extends { id: string }>(directory: string): Promise<Map<string, T>> {
    return loadDataFiles<T>(directory);
  }

  /**
   * Load texture atlases from metadata files.
   *
   * @param atlasMetadataFiles - Array of paths to atlas metadata JSON files
   * @returns Map of texture sets keyed by atlas ID
   */
  async loadTextureAtlases(atlasMetadataFiles: string[]): Promise<Map<string, TextureSet>> {
    return loadTextureAtlases(atlasMetadataFiles);
  }

  /**
   * Get loaded texture set by ID.
   *
   * @param textureSetId - Texture set identifier
   * @returns Texture set or null if not found
   */
  getTextureSet(textureSetId: string): TextureSet | null {
    const cached = assetCache.get(`atlas:${textureSetId}`);
    return cached ?? null;
  }
}
