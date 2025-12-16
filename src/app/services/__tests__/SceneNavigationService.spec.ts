import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SceneNavigationService } from '../SceneNavigationService';

describe('SceneNavigationService', () => {
  let service: SceneNavigationService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SceneNavigationService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('returnToCastle()', () => {
    it('should navigate to castle-menu', async () => {
      await service.returnToCastle();

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('should return navigation result', async () => {
      const result = await service.returnToCastle();

      expect(result).toBe(true);
    });
  });

  describe('navigateTo()', () => {
    it('should navigate to specified destination', async () => {
      await service.navigateTo('tavern');

      expect(router.navigate).toHaveBeenCalledWith(['/tavern']);
    });

    it('should navigate to temple', async () => {
      await service.navigateTo('temple');

      expect(router.navigate).toHaveBeenCalledWith(['/temple']);
    });

    it('should navigate to shop', async () => {
      await service.navigateTo('shop');

      expect(router.navigate).toHaveBeenCalledWith(['/shop']);
    });

    it('should navigate to inn', async () => {
      await service.navigateTo('inn');

      expect(router.navigate).toHaveBeenCalledWith(['/inn']);
    });

    it('should navigate to training-grounds', async () => {
      await service.navigateTo('training-grounds');

      expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });

    it('should navigate to maze', async () => {
      await service.navigateTo('maze');

      expect(router.navigate).toHaveBeenCalledWith(['/maze']);
    });
  });

  describe('inspectCharacter()', () => {
    it('should navigate to character-inspection with characterId', async () => {
      await service.inspectCharacter('char-123');

      expect(router.navigate).toHaveBeenCalledWith(['/character-inspection'], {
        queryParams: { characterId: 'char-123', returnTo: 'castle-menu' }
      });
    });

    it('should use default returnTo of castle-menu', async () => {
      await service.inspectCharacter('char-456');

      expect(router.navigate).toHaveBeenCalledWith(['/character-inspection'], {
        queryParams: { characterId: 'char-456', returnTo: 'castle-menu' }
      });
    });

    it('should accept custom returnTo destination', async () => {
      await service.inspectCharacter('char-789', 'tavern');

      expect(router.navigate).toHaveBeenCalledWith(['/character-inspection'], {
        queryParams: { characterId: 'char-789', returnTo: 'tavern' }
      });
    });

    it('should work with all valid return destinations', async () => {
      const destinations = ['castle-menu', 'tavern', 'temple', 'shop', 'inn', 'training-grounds', 'maze'] as const;

      for (const dest of destinations) {
        await service.inspectCharacter('char-1', dest);

        expect(router.navigate).toHaveBeenCalledWith(['/character-inspection'], {
          queryParams: { characterId: 'char-1', returnTo: dest }
        });
      }
    });
  });

  describe('castSpell()', () => {
    it('should navigate to spell-casting with characterId and default context', async () => {
      await service.castSpell('char-123');

      expect(router.navigate).toHaveBeenCalledWith(['/spell-casting'], {
        queryParams: { characterId: 'char-123', returnTo: 'maze', context: 'dungeon' }
      });
    });

    it('should use default returnTo of maze and context of dungeon', async () => {
      await service.castSpell('mage-1');

      expect(router.navigate).toHaveBeenCalledWith(['/spell-casting'], {
        queryParams: { characterId: 'mage-1', returnTo: 'maze', context: 'dungeon' }
      });
    });

    it('should accept custom returnTo destination', async () => {
      await service.castSpell('mage-2', 'castle-menu');

      expect(router.navigate).toHaveBeenCalledWith(['/spell-casting'], {
        queryParams: { characterId: 'mage-2', returnTo: 'castle-menu', context: 'dungeon' }
      });
    });

    it('should accept combat context for combat spell casting', async () => {
      await service.castSpell('mage-3', 'maze', 'combat');

      expect(router.navigate).toHaveBeenCalledWith(['/spell-casting'], {
        queryParams: { characterId: 'mage-3', returnTo: 'maze', context: 'combat' }
      });
    });
  });

  describe('createCharacter()', () => {
    it('should navigate to character-creation', async () => {
      await service.createCharacter();

      expect(router.navigate).toHaveBeenCalledWith(['/character-creation']);
    });
  });

  describe('enterMaze()', () => {
    it('should navigate to maze', async () => {
      await service.enterMaze();

      expect(router.navigate).toHaveBeenCalledWith(['/maze']);
    });
  });

  describe('enterCombat()', () => {
    it('should navigate to combat planning', async () => {
      await service.enterCombat();

      expect(router.navigate).toHaveBeenCalledWith(['/maze/combat/planning']);
    });
  });

  describe('returnFromInspection()', () => {
    it('should navigate to valid returnTo destination', async () => {
      await service.returnFromInspection('tavern');

      expect(router.navigate).toHaveBeenCalledWith(['/tavern']);
    });

    it('should default to castle-menu for invalid destination', async () => {
      await service.returnFromInspection('invalid-route');

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('should default to castle-menu for empty string', async () => {
      await service.returnFromInspection('');

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('should validate all valid destinations', async () => {
      const validDestinations = ['castle-menu', 'tavern', 'temple', 'shop', 'inn', 'training-grounds', 'maze'];

      for (const dest of validDestinations) {
        await service.returnFromInspection(dest);

        expect(router.navigate).toHaveBeenCalledWith([`/${dest}`]);
      }
    });
  });

  describe('town service shortcuts', () => {
    it('goToTavern() should navigate to tavern', async () => {
      await service.goToTavern();

      expect(router.navigate).toHaveBeenCalledWith(['/tavern']);
    });

    it('goToTemple() should navigate to temple', async () => {
      await service.goToTemple();

      expect(router.navigate).toHaveBeenCalledWith(['/temple']);
    });

    it('goToShop() should navigate to shop', async () => {
      await service.goToShop();

      expect(router.navigate).toHaveBeenCalledWith(['/shop']);
    });

    it('goToInn() should navigate to inn', async () => {
      await service.goToInn();

      expect(router.navigate).toHaveBeenCalledWith(['/inn']);
    });

    it('goToTrainingGrounds() should navigate to training-grounds', async () => {
      await service.goToTrainingGrounds();

      expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });
  });
});
