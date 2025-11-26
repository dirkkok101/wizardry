import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CastleMenuComponent } from '../castle-menu.component';
import { provideRouter } from '@angular/router';
import { SceneNavigationService } from '@services/SceneNavigationService';

describe('CastleMenuComponent', () => {
  let component: CastleMenuComponent;
  let fixture: ComponentFixture<CastleMenuComponent>;
  let navigationService: SceneNavigationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CastleMenuComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CastleMenuComponent);
    component = fixture.componentInstance;
    navigationService = TestBed.inject(SceneNavigationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Header', () => {
    it('should display SceneTitleComponent', () => {
      const titleComponent = fixture.nativeElement.querySelector('app-scene-title');
      expect(titleComponent).toBeTruthy();
    });
  });

  describe('Footer Navigation', () => {
    it('should display SceneFooterComponent', () => {
      const footerComponent = fixture.nativeElement.querySelector('app-scene-footer');
      expect(footerComponent).toBeTruthy();
    });

    it('should have 6 navigation items in footer', () => {
      expect(component.footerMenuItems().length).toBe(6);
    });

    it('should have Tavern option with A shortcut', () => {
      const tavernItem = component.footerMenuItems().find(item => item.id === 'tavern');
      expect(tavernItem).toBeTruthy();
      expect(tavernItem?.label).toBe('Tavern');
      expect(tavernItem?.shortcut).toBe('A');
      expect(tavernItem?.enabled).toBe(true);
    });

    it('should have Temple option with T shortcut', () => {
      const templeItem = component.footerMenuItems().find(item => item.id === 'temple');
      expect(templeItem).toBeTruthy();
      expect(templeItem?.label).toBe('Temple');
      expect(templeItem?.shortcut).toBe('T');
      expect(templeItem?.enabled).toBe(true);
    });

    it('should have Shop option with S shortcut', () => {
      const shopItem = component.footerMenuItems().find(item => item.id === 'shop');
      expect(shopItem).toBeTruthy();
      expect(shopItem?.label).toBe('Shop');
      expect(shopItem?.shortcut).toBe('S');
      expect(shopItem?.enabled).toBe(true);
    });

    it('should have Inn option with I shortcut', () => {
      const innItem = component.footerMenuItems().find(item => item.id === 'inn');
      expect(innItem).toBeTruthy();
      expect(innItem?.label).toBe('Inn');
      expect(innItem?.shortcut).toBe('I');
      expect(innItem?.enabled).toBe(true);
    });

    it('should have Training Grounds option with G shortcut', () => {
      const trainingItem = component.footerMenuItems().find(item => item.id === 'training');
      expect(trainingItem).toBeTruthy();
      expect(trainingItem?.label).toBe('Training Grounds');
      expect(trainingItem?.shortcut).toBe('G');
      expect(trainingItem?.enabled).toBe(true);
    });

    it('should have Maze option with M shortcut', () => {
      const mazeItem = component.footerMenuItems().find(item => item.id === 'maze');
      expect(mazeItem).toBeTruthy();
      expect(mazeItem?.label).toBe('Maze');
      expect(mazeItem?.shortcut).toBe('M');
    });
  });

  describe('Party Display', () => {
    it('should display party character grid', () => {
      const characterGrid = fixture.nativeElement.querySelector('app-party-character-grid');
      expect(characterGrid).toBeTruthy();
    });

    it('should handle inspect event from character card', () => {
      const navigateSpy = jest.spyOn(navigationService, 'inspectCharacter');
      component.handleActionClick({ characterId: 'char-123', actionType: 'inspect' });

      expect(navigateSpy).toHaveBeenCalledWith('char-123', 'castle-menu');
    });
  });

  describe('Footer Navigation Integration', () => {
    it('should navigate to Tavern when tavern action triggered', () => {
      const navigateSpy = jest.spyOn(navigationService, 'goToTavern');
      component.handleFooterAction('tavern');
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('should navigate to Temple when temple action triggered', () => {
      const navigateSpy = jest.spyOn(navigationService, 'goToTemple');
      component.handleFooterAction('temple');
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('should navigate to Shop when shop action triggered', () => {
      const navigateSpy = jest.spyOn(navigationService, 'goToShop');
      component.handleFooterAction('shop');
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('should navigate to Inn when inn action triggered', () => {
      const navigateSpy = jest.spyOn(navigationService, 'goToInn');
      component.handleFooterAction('inn');
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('should navigate to Training Grounds when training action triggered', () => {
      const navigateSpy = jest.spyOn(navigationService, 'goToTrainingGrounds');
      component.handleFooterAction('training');
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('should not navigate to Maze when party is empty', async () => {
      const navigateSpy = jest.spyOn(navigationService, 'enterMaze');
      component.handleFooterAction('maze');
      await fixture.whenStable();
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });
});
