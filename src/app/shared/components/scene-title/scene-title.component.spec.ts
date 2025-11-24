import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { SceneTitleComponent } from './scene-title.component';
import { GameStateService } from '../../../../services/GameStateService';
import { signal } from '@angular/core';
import { GameState } from '../../../../../types/GameState';

describe('SceneTitleComponent', () => {
  let component: SceneTitleComponent;
  let fixture: ComponentFixture<SceneTitleComponent>;
  let gameStateService: GameStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneTitleComponent],
      providers: [GameStateService]
    }).compileComponents();

    fixture = TestBed.createComponent(SceneTitleComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders title from input', () => {
    fixture.componentRef.setInput('title', 'TEST TITLE');
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toBe('TEST TITLE');
  });

  describe('content projection', () => {
    @Component({
      standalone: true,
      imports: [SceneTitleComponent],
      template: `
        <app-scene-title [title]="'TEST TITLE'">
          <div class="projected-content">Projected Content</div>
        </app-scene-title>
      `
    })
    class TestHostComponent {}

    it('projects content into ng-content slot', () => {
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const projectedContent = hostFixture.nativeElement.querySelector('.projected-content');
      expect(projectedContent).toBeTruthy();
      expect(projectedContent.textContent).toBe('Projected Content');
    });

    it('displays both title and projected content', () => {
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const h1 = hostFixture.nativeElement.querySelector('h1');
      const projectedContent = hostFixture.nativeElement.querySelector('.projected-content');

      expect(h1.textContent).toBe('TEST TITLE');
      expect(projectedContent.textContent).toBe('Projected Content');
    });

    it('works without projected content', () => {
      fixture.componentRef.setInput('title', 'TEST TITLE');
      fixture.detectChanges();

      const h1 = fixture.nativeElement.querySelector('h1');
      expect(h1.textContent).toBe('TEST TITLE');
      // Component should still render without errors
      expect(fixture.nativeElement.querySelector('.scene-header')).toBeTruthy();
    });
  });

  describe('party gold display', () => {
    beforeEach(() => {
      // Set up game state with party gold
      gameStateService.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 1500
        }
      }));
    });

    it('displays party gold when showPartyGold is true', () => {
      fixture.componentRef.setInput('title', 'TEST SCENE');
      fixture.componentRef.setInput('showPartyGold', true);
      fixture.detectChanges();

      const partyGoldElement = fixture.nativeElement.querySelector('.party-gold');
      expect(partyGoldElement).toBeTruthy();
      expect(partyGoldElement.textContent).toContain('PARTY GOLD: 1500 GP');
    });

    it('hides party gold when showPartyGold is false', () => {
      fixture.componentRef.setInput('title', 'TEST SCENE');
      fixture.componentRef.setInput('showPartyGold', false);
      fixture.detectChanges();

      const partyGoldElement = fixture.nativeElement.querySelector('.party-gold');
      expect(partyGoldElement).toBeNull();
    });

    it('hides party gold when showPartyGold is not provided (defaults to false)', () => {
      fixture.componentRef.setInput('title', 'TEST SCENE');
      fixture.detectChanges();

      const partyGoldElement = fixture.nativeElement.querySelector('.party-gold');
      expect(partyGoldElement).toBeNull();
    });

    it('displays correct gold amount from GameStateService', () => {
      // Update gold to different amount
      gameStateService.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 42
        }
      }));

      fixture.componentRef.setInput('title', 'TEST SCENE');
      fixture.componentRef.setInput('showPartyGold', true);
      fixture.detectChanges();

      const partyGoldElement = fixture.nativeElement.querySelector('.party-gold');
      expect(partyGoldElement.textContent).toContain('PARTY GOLD: 42 GP');
    });

    it('uses correct format "PARTY GOLD: X GP"', () => {
      fixture.componentRef.setInput('title', 'TEST SCENE');
      fixture.componentRef.setInput('showPartyGold', true);
      fixture.detectChanges();

      const partyGoldElement = fixture.nativeElement.querySelector('.party-gold');
      expect(partyGoldElement.textContent).toMatch(/^PARTY GOLD: \d+ GP$/);
    });

    it('updates party gold display when game state changes', () => {
      fixture.componentRef.setInput('title', 'TEST SCENE');
      fixture.componentRef.setInput('showPartyGold', true);
      fixture.detectChanges();

      let partyGoldElement = fixture.nativeElement.querySelector('.party-gold');
      expect(partyGoldElement.textContent).toContain('PARTY GOLD: 1500 GP');

      // Update gold amount
      gameStateService.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 2500
        }
      }));
      fixture.detectChanges();

      partyGoldElement = fixture.nativeElement.querySelector('.party-gold');
      expect(partyGoldElement.textContent).toContain('PARTY GOLD: 2500 GP');
    });
  });
});
