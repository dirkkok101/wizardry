/**
 * MazeLayoutComponent smoke tests
 *
 * Tests basic component rendering and canvas setup.
 * MazeLayoutComponent is the container for all maze child routes.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { MazeLayoutComponent } from './maze-layout.component';
import { GameStateService } from '@services/GameStateService';
import { createTestGameState, createTestCharacter } from '@testing/test-factories';
import { GameState } from '@models/GameState';

describe('MazeLayoutComponent', () => {
  let component: MazeLayoutComponent;
  let fixture: ComponentFixture<MazeLayoutComponent>;
  let mockGameState: GameState;

  beforeEach(async () => {
    // Create game state with dungeon
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
      imports: [MazeLayoutComponent, RouterTestingModule],
      providers: [
        {
          provide: GameStateService,
          useValue: {
            state: signal(mockGameState),
            updateState: jest.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MazeLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have maze layout container', () => {
    const compiled = fixture.nativeElement;
    const container = compiled.querySelector('.maze-layout');
    expect(container).toBeTruthy();
  });

  it('should have canvas element', () => {
    const compiled = fixture.nativeElement;
    const canvas = compiled.querySelector('canvas.maze-canvas');
    expect(canvas).toBeTruthy();
  });

  it('should have router outlet for child routes', () => {
    const compiled = fixture.nativeElement;
    const outlet = compiled.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should compute dungeon state from game state', () => {
    expect(component.dungeonState()).toBeTruthy();
    expect(component.dungeonState()?.currentLevel).toBe(1);
  });

  it('should compute current position', () => {
    const position = component.position();
    expect(position).toEqual({ x: 10, y: 0, facing: 'N' });
  });
});
