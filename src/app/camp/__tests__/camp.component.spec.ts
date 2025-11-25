import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampComponent } from '../camp.component';
import { GameStateService } from '../../../services/GameStateService';
import { SaveService } from '../../../services/SaveService';
import { SceneNavigationService } from '../../../services/SceneNavigationService';
import { MessageService } from '../../../services/MessageService';
import { GameStateQueries } from '../../../utils/GameStateQueries';
import { Character } from '../../../types/Character';
import { CharacterStatus } from '../../../types/CharacterStatus';

describe('CampComponent', () => {
  let component: CampComponent;
  let fixture: ComponentFixture<CampComponent>;
  let gameState: GameStateService;
  let mockSaveService: jest.Mocked<SaveService>;
  let navigationService: SceneNavigationService;
  let messageService: MessageService;

  beforeEach(async () => {
    mockSaveService = {
      saveGame: jest.fn().mockResolvedValue(undefined)
    } as any;

    await TestBed.configureTestingModule({
      imports: [CampComponent],
      providers: [
        GameStateService,
        { provide: SaveService, useValue: mockSaveService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CampComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    navigationService = TestBed.inject(SceneNavigationService);
    messageService = TestBed.inject(MessageService);

    jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'castSpell').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'enterMaze').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'returnToCastle').mockImplementation(() => Promise.resolve(true));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('party display', () => {
    it('should compute party characters from game state', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 20,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      const char2: Character = {
        id: 'char2',
        name: 'Mage',
        class: 'MAGE',
        race: 'ELF',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 10,
        intelligence: 16,
        piety: 10,
        vitality: 10,
        agility: 12,
        luck: 10,
        hp: 15,
        maxHp: 15,
        ac: 8,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      // Set up game state with party
      gameState.updateState(state => ({
        ...state,
        party: {
          members: ['char1', 'char2'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: ['char2'] }
        },
        roster: new Map([
          ['char1', char1],
          ['char2', char2]
        ])
      }));

      fixture.detectChanges();

      const chars = GameStateQueries.partyCharacters(gameState.state());
      expect(chars).toHaveLength(2);
      expect(chars[0].name).toBe('Fighter');
      expect(chars[1].name).toBe('Mage');
    });

    it('should return empty array when no party members', () => {
      // Game state starts empty, no need to update
      fixture.detectChanges();

      expect(GameStateQueries.partyCharacters(gameState.state())).toHaveLength(0);
    });
  });

  describe('character actions', () => {
    it('should provide inspect action for all characters', () => {
      const char: Character = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 20,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      gameState.updateState(state => ({
        ...state,
        party: { members: ['char1'], gold: 100, formation: { frontRow: ['char1'], backRow: [] } },
        roster: new Map([['char1', char]])
      }));

      fixture.detectChanges();

      const actions = component.getActionsForCharacter(char);
      expect(actions).toContainEqual(expect.objectContaining({ type: 'inspect', enabled: true }));
    });

    it('should provide cast action only for spellcasters', () => {
      const mage: Character = {
        id: 'mage1',
        name: 'Gandalf',
        class: 'MAGE',
        race: 'ELF',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 10,
        intelligence: 18,
        piety: 10,
        vitality: 10,
        agility: 12,
        luck: 10,
        hp: 15,
        maxHp: 15,
        ac: 8,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      const fighter: Character = {
        id: 'fighter1',
        name: 'Conan',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 18,
        intelligence: 10,
        piety: 10,
        vitality: 16,
        agility: 12,
        luck: 10,
        hp: 25,
        maxHp: 25,
        ac: 4,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      expect(component.getActionsForCharacter(mage)).toContainEqual(
        expect.objectContaining({ type: 'cast', enabled: true })
      );
      expect(component.getActionsForCharacter(fighter)).not.toContainEqual(
        expect.objectContaining({ type: 'cast' })
      );
    });

    it('should navigate to character inspection on inspect action', () => {
      component.handleActionClick({ characterId: 'char1', actionType: 'inspect' });

      expect(navigationService.inspectCharacter).toHaveBeenCalledWith('char1', 'camp');
    });

    it('should navigate to spell casting on cast action', () => {
      component.handleActionClick({ characterId: 'char1', actionType: 'cast' });

      expect(navigationService.castSpell).toHaveBeenCalledWith('char1', 'camp');
    });
  });

  describe('move actions', () => {
    it('should provide move up action for characters not at position 0', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 20,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      const char2: Character = { ...char1, id: 'char2', name: 'Mage' };

      gameState.updateState(state => ({
        ...state,
        party: {
          members: ['char1', 'char2'],
          gold: 100,
          formation: { frontRow: ['char1', 'char2'], backRow: [] }
        },
        roster: new Map([
          ['char1', char1],
          ['char2', char2]
        ])
      }));

      fixture.detectChanges();

      const actions = component.getActionsForCharacter(char2);

      expect(actions).toContainEqual(
        expect.objectContaining({ type: 'moveUp', enabled: true })
      );
    });

    it('should disable move up for first character', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 20,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      gameState.updateState(state => ({
        ...state,
        party: {
          members: ['char1'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: [] }
        },
        roster: new Map([['char1', char1]])
      }));

      fixture.detectChanges();

      const actions = component.getActionsForCharacter(char1);

      expect(actions).toContainEqual(
        expect.objectContaining({ type: 'moveUp', enabled: false })
      );
    });
  });

  describe('footer menu', () => {
    it('should enable maze entry when all party members are OK or INJURED', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 20,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      const char2: Character = { ...char1, id: 'char2', name: 'Mage', status: CharacterStatus.INJURED };

      gameState.updateState(state => ({
        ...state,
        party: {
          members: ['char1', 'char2'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: ['char2'] }
        },
        roster: new Map([
          ['char1', char1],
          ['char2', char2]
        ])
      }));

      fixture.detectChanges();

      expect(component.canEnterMaze()).toBe(true);

      const menuItems = component.footerMenuItems();
      const mazeItem = menuItems.find(item => item.id === 'maze');
      expect(mazeItem?.enabled).toBe(true);
    });

    it('should disable maze entry when party member is DEAD', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 20,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      const char2: Character = { ...char1, id: 'char2', name: 'Dead Guy', status: CharacterStatus.DEAD };

      gameState.updateState(state => ({
        ...state,
        party: {
          members: ['char1', 'char2'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: ['char2'] }
        },
        roster: new Map([
          ['char1', char1],
          ['char2', char2]
        ])
      }));

      fixture.detectChanges();

      expect(component.canEnterMaze()).toBe(false);

      const menuItems = component.footerMenuItems();
      const mazeItem = menuItems.find(item => item.id === 'maze');
      expect(mazeItem?.enabled).toBe(false);
    });

    it('should disable maze entry when no party members', () => {
      fixture.detectChanges();

      expect(component.canEnterMaze()).toBe(false);
    });

    it('should navigate to maze when entering maze with valid party', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 20,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      gameState.updateState(state => ({
        ...state,
        party: {
          members: ['char1'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: [] }
        },
        roster: new Map([['char1', char1]])
      }));

      fixture.detectChanges();

      component.enterMaze();

      expect(navigationService.enterMaze).toHaveBeenCalled();
      expect(messageService.hasMessage()).toBe(false);
    });

    it('should show error when entering maze with dead party member', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Dead Guy',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 0,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.DEAD,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 0,
        inventory: []
      };

      gameState.updateState(state => ({
        ...state,
        party: {
          members: ['char1'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: [] }
        },
        roster: new Map([['char1', char1]])
      }));

      fixture.detectChanges();

      component.enterMaze();

      expect(navigationService.enterMaze).not.toHaveBeenCalled();
      expect(messageService.messageText()).toBe('Some party members are dead - visit Temple first');
    });

    it('should navigate to castle on castle menu action', () => {
      component.handleFooterAction('castle');
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });
  });
});
