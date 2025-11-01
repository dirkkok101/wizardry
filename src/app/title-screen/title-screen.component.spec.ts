import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TitleScreenComponent } from './title-screen.component';
import { AssetLoadingService } from '../../services/AssetLoadingService';
import { SaveService } from '../../services/SaveService';

describe('TitleScreenComponent', () => {
  let component: TitleScreenComponent;
  let fixture: ComponentFixture<TitleScreenComponent>;
  let assetService: AssetLoadingService;
  let saveService: SaveService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TitleScreenComponent],
      providers: [AssetLoadingService, SaveService]
    });

    fixture = TestBed.createComponent(TitleScreenComponent);
    component = fixture.componentInstance;
    assetService = TestBed.inject(AssetLoadingService);
    saveService = TestBed.inject(SaveService);
    router = TestBed.inject(Router);

    // Mock asset loading to resolve immediately
    jest.spyOn(assetService, 'loadTitleScreenAssets').mockResolvedValue({
      titleBitmap: new Image(),
      fonts: []
    });

    // Mock save data check
    jest.spyOn(saveService, 'hasSaveData').mockResolvedValue(false);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('loads title screen assets on init', async () => {
      const loadSpy = jest.spyOn(assetService, 'loadTitleScreenAssets');

      await component.ngOnInit();

      expect(loadSpy).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('shows loading state initially', () => {
      expect(component.isLoading()).toBe(true);
      expect(component.canPressKey()).toBe(false);
    });

    it('checks for existing save data on load', async () => {
      const hasSaveSpy = jest.spyOn(saveService, 'hasSaveData');

      await component.ngOnInit();

      expect(hasSaveSpy).toHaveBeenCalled();
    });
  });

  describe('key press handling', () => {
    beforeEach(async () => {
      await component.ngOnInit(); // Complete loading
    });

    it('navigates to castle menu on any key press', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.handleKeyPress(event);

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('ignores key presses during loading', () => {
      component.isLoading.set(true);
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.handleKeyPress(event);

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('ignores repeated key presses after navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.handleKeyPress(event);
      component.handleKeyPress(event); // Second press

      expect(router.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('save data detection', () => {
    it('shows "Load Game" option when save exists', async () => {
      jest.spyOn(saveService, 'hasSaveData').mockResolvedValue(true);

      await component.ngOnInit();

      expect(component.hasSaveData()).toBe(true);
    });

    it('does not show "Load Game" when no save exists', async () => {
      jest.spyOn(saveService, 'hasSaveData').mockResolvedValue(false);

      await component.ngOnInit();

      expect(component.hasSaveData()).toBe(false);
    });
  });
});
