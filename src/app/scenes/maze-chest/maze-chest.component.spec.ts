/**
 * MazeChestComponent smoke tests
 *
 * Tests basic component rendering for chest encounters.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { MazeChestComponent } from './maze-chest.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { createTestGameState, createTestCharacter } from '@testing/test-factories';
import { GameState } from '@models/GameState';

describe('MazeChestComponent', () => {
  let component: MazeChestComponent;
  let fixture: ComponentFixture<MazeChestComponent>;
  let mockGameState: GameState;

  beforeEach(async () => {
    // Create game state with pending chest (using proper Chest structure)
    mockGameState = createTestGameState();
    mockGameState.pendingChest = {
      id: 'test-chest',
      trapped: true,
      trapId: 'poison_needle',
      trapIdentified: false,
      trapDisarmed: false,
      rewardTier: 10,
      contents: {
        gold: 100,
        items: []
      },
      sourcePosition: { x: 10, y: 0, facing: 'N' },
      mazeLevel: 1,
      source: 'exploration'
    };

    mockGameState.dungeon = {
      ...mockGameState.dungeon!,
      currentLevel: 1,
      position: { x: 10, y: 0, facing: 'N' },
      visitedTiles: new Set(['10,0'])
    };

    // Add party members (6 characters for full party)
    const characters = Array.from({ length: 6 }, (_, i) =>
      createTestCharacter({ id: `char-${i}`, name: `Hero ${i + 1}` })
    );
    mockGameState.party.members = characters.map(c => c.id);
    characters.forEach(c => mockGameState.roster.set(c.id, c));

    await TestBed.configureTestingModule({
      imports: [MazeChestComponent],
      providers: [
        {
          provide: GameStateService,
          useValue: {
            state: signal(mockGameState),
            updateState: jest.fn()
          }
        },
        {
          provide: MessageLogService,
          useValue: {
            messages: signal([]),
            addMessage: jest.fn()
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: jest.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MazeChestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render scene title', () => {
    const compiled = fixture.nativeElement;
    const title = compiled.querySelector('app-scene-title');
    expect(title).toBeTruthy();
  });

  it('should render character panels', () => {
    const compiled = fixture.nativeElement;
    const panels = compiled.querySelectorAll('app-character-panel');
    expect(panels.length).toBe(2);
  });

  it('should render chest overlay', () => {
    const compiled = fixture.nativeElement;
    const overlay = compiled.querySelector('app-chest-overlay');
    expect(overlay).toBeTruthy();
  });

  it('should render footer menu', () => {
    const compiled = fixture.nativeElement;
    const footer = compiled.querySelector('app-scene-footer');
    expect(footer).toBeTruthy();
  });

  it('should render message log', () => {
    const compiled = fixture.nativeElement;
    const messageLog = compiled.querySelector('app-message-log');
    expect(messageLog).toBeTruthy();
  });

  it('should have chest actions in footer menu', () => {
    const menuItems = component.footerMenuItems();
    const menuIds = menuItems.map(item => item.id);

    // Should have leave option
    expect(menuIds).toContain('leave');
  });
});
