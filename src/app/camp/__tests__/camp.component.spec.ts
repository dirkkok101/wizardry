import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampComponent } from '../camp.component';
import { GameStateService } from '../../../services/GameStateService';
import { SaveService } from '../../../services/SaveService';
import { Router } from '@angular/router';

describe('CampComponent', () => {
  let component: CampComponent;
  let fixture: ComponentFixture<CampComponent>;
  let mockGameStateService: jest.Mocked<GameStateService>;
  let mockSaveService: jest.Mocked<SaveService>;
  let mockRouter: jest.Mocked<Router>;

  beforeEach(async () => {
    mockGameStateService = {
      state: jest.fn(),
      party: jest.fn(),
      updateState: jest.fn()
    } as any;

    mockSaveService = {
      saveGame: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockRouter = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [CampComponent],
      providers: [
        { provide: GameStateService, useValue: mockGameStateService },
        { provide: SaveService, useValue: mockSaveService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CampComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
