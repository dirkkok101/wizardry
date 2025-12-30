export interface TempleConfig {
  serviceCosts: Record<string, number>;
  serviceAgeIncrease: Record<string, number>;
}

export interface InnConfig {
  roomCosts: Record<string, number>;
  roomHealRates: Record<string, number>;
}

export interface TownServicesConfig {
  temple: TempleConfig;
  inn: InnConfig;
}

export interface ShopConfig {
  sellPriceMultiplier: number;
  identifyPrice: number;
  uncurse: {
    specialItemPriceThreshold: number;
    specialItemUncurseCost: number;
    normalItemMultiplier: number;
  };
}

export class TownConfigLoader {
  private static townServicesConfig: TownServicesConfig | null = null;
  private static shopConfig: ShopConfig | null = null;
  private static loadPromise: Promise<void> | null = null;
  private static loadError: Error | null = null;

  static async loadAll(): Promise<void> {
    if (this.townServicesConfig && this.shopConfig) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.performLoad();
    await this.loadPromise;
  }

  private static async performLoad(): Promise<void> {
    this.loadError = null;

    const [townServicesResponse, shopResponse] = await Promise.all([
      fetch('/assets/config/town-services.json'),
      fetch('/assets/config/shop-settings.json'),
    ]);

    if (!townServicesResponse.ok) {
      this.loadError = new Error(
        `Failed to load town-services.json: HTTP ${townServicesResponse.status}`,
      );
      throw this.loadError;
    }

    if (!shopResponse.ok) {
      this.loadError = new Error(`Failed to load shop-settings.json: HTTP ${shopResponse.status}`);
      throw this.loadError;
    }

    this.townServicesConfig = await townServicesResponse.json();
    this.shopConfig = await shopResponse.json();
  }

  static isInitialized(): boolean {
    return this.townServicesConfig !== null && this.shopConfig !== null;
  }

  private static ensureInitialized(): void {
    if (!this.isInitialized()) {
      throw new Error('TownConfigLoader not initialized. Call loadAll() first.');
    }
  }

  static getTempleServiceCost(serviceType: string): number {
    this.ensureInitialized();
    const cost = this.townServicesConfig!.temple.serviceCosts[serviceType];
    if (cost === undefined) {
      throw new Error(`Unknown temple service type: ${serviceType}`);
    }
    return cost;
  }

  static getTempleServiceAgeIncrease(serviceType: string): number {
    this.ensureInitialized();
    const ageIncrease = this.townServicesConfig!.temple.serviceAgeIncrease[serviceType];
    if (ageIncrease === undefined) {
      throw new Error(`Unknown temple service type: ${serviceType}`);
    }
    return ageIncrease;
  }

  static getTempleConfig(): TempleConfig {
    this.ensureInitialized();
    return this.townServicesConfig!.temple;
  }

  static getInnRoomCost(roomType: string): number {
    this.ensureInitialized();
    const cost = this.townServicesConfig!.inn.roomCosts[roomType];
    if (cost === undefined) {
      throw new Error(`Unknown inn room type: ${roomType}`);
    }
    return cost;
  }

  static getInnRoomHealRate(roomType: string): number {
    this.ensureInitialized();
    const healRate = this.townServicesConfig!.inn.roomHealRates[roomType];
    if (healRate === undefined) {
      throw new Error(`Unknown inn room type: ${roomType}`);
    }
    return healRate;
  }

  static getInnConfig(): InnConfig {
    this.ensureInitialized();
    return this.townServicesConfig!.inn;
  }

  static getShopSellMultiplier(): number {
    this.ensureInitialized();
    return this.shopConfig!.sellPriceMultiplier;
  }

  static getShopIdentifyPrice(): number {
    this.ensureInitialized();
    return this.shopConfig!.identifyPrice;
  }

  static getShopUncurseSettings(): ShopConfig['uncurse'] {
    this.ensureInitialized();
    return this.shopConfig!.uncurse;
  }

  static getShopConfig(): ShopConfig {
    this.ensureInitialized();
    return this.shopConfig!;
  }

  static getError(): Error | null {
    return this.loadError;
  }

  static clearCache(): void {
    this.townServicesConfig = null;
    this.shopConfig = null;
    this.loadPromise = null;
    this.loadError = null;
  }

  static setConfigForTesting(
    townServices: TownServicesConfig | null,
    shop: ShopConfig | null,
  ): void {
    this.townServicesConfig = townServices;
    this.shopConfig = shop;
  }
}
