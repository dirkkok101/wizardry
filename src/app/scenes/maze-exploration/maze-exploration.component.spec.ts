/**
 * MazeExplorationComponent smoke tests
 *
 * Tests basic component rendering and structure.
 * Full integration tests for maze navigation are in separate E2E tests.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { MazeExplorationComponent } from './maze-exploration.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageLogService } from '@services/MessageLogService';
import { createTestGameState, createTestCharacter } from '@testing/test-factories';
import { GameState } from '@models/GameState';

describe('MazeExplorationComponent', () => {
  let component: MazeExplorationComponent;
  let fixture: ComponentFixture<MazeExplorationComponent>;
  let mockGameState: GameState;

  beforeEach(async () => {
    // Create game state with dungeon and party
    mockGameState = createTestGameState();
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
      imports: [MazeExplorationComponent],
      providers: [
        {
          provide: GameStateService,
          useValue: {
            state: signal(mockGameState),
            updateState: jest.fn()
          }
        },
        {
          provide: SceneNavigationService,
          useValue: {
            inspectCharacter: jest.fn(),
            castSpell: jest.fn(),
            goToCamp: jest.fn()
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

    fixture = TestBed.createComponent(MazeExplorationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render scene title with level number', () => {
    const compiled = fixture.nativeElement;
    const title = compiled.querySelector('app-scene-title');
    expect(title).toBeTruthy();
  });

  it('should render left and right character panels', () => {
    const compiled = fixture.nativeElement;
    const panels = compiled.querySelectorAll('app-character-panel');
    expect(panels.length).toBe(2);
  });

  it('should render the message log', () => {
    const compiled = fixture.nativeElement;
    const messageLog = compiled.querySelector('app-message-log');
    expect(messageLog).toBeTruthy();
  });

  it('should render the footer menu', () => {
    const compiled = fixture.nativeElement;
    const footer = compiled.querySelector('app-scene-footer');
    expect(footer).toBeTruthy();
  });

  it('should compute scene title correctly', () => {
    expect(component.sceneTitle()).toBe('MAZE - LEVEL 1');
  });

  it('should split characters into left and right columns', () => {
    // Left column: positions 0, 2, 4 (odd indices when 1-based)
    // Right column: positions 1, 3, 5 (even indices when 1-based)
    const left = component.leftColumnCharacters();
    const right = component.rightColumnCharacters();

    expect(left.length).toBe(3);
    expect(right.length).toBe(3);
  });

  it('should have movement menu items', () => {
    const menuItems = component.mazeMenuItems();
    const menuIds = menuItems.map(item => item.id);

    expect(menuIds).toContain('forward');
    expect(menuIds).toContain('back');
    expect(menuIds).toContain('left');
    expect(menuIds).toContain('right');
  });

  it('should have camp menu item', () => {
    const menuItems = component.mazeMenuItems();
    const campItem = menuItems.find(item => item.id === 'camp');

    expect(campItem).toBeTruthy();
    expect(campItem?.enabled).toBe(true);
  });
});
