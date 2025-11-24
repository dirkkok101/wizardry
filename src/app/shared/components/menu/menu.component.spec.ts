import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuComponent, MenuItem } from './menu.component';

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;

  const testItems: MenuItem[] = [
    { id: 'edge', label: 'Edge of Town', enabled: true, shortcut: 'E' },
    { id: 'tavern', label: 'Tavern', enabled: true, shortcut: 'T' },
    { id: 'inn', label: 'Inn', enabled: false, shortcut: 'I' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    component.items = testItems;
    fixture.detectChanges();
  });

  it('selects first enabled item on init', () => {
    expect(component.selectedIndex).toBe(0);
  });

  it('moves to next item on arrow down', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.handleKeyPress(event);

    expect(component.selectedIndex).toBe(1);
  });

  it('moves to previous item on arrow up', () => {
    component.selectedIndex = 1;

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.handleKeyPress(event);

    expect(component.selectedIndex).toBe(0);
  });

  it('emits select event on Enter', () => {
    jest.spyOn(component.select, 'emit');

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.handleKeyPress(event);

    expect(component.select.emit).toHaveBeenCalledWith('edge');
  });

  it('selects item by letter shortcut', () => {
    jest.spyOn(component.select, 'emit');

    const event = new KeyboardEvent('keydown', { key: 'T' });
    component.handleKeyPress(event);

    expect(component.select.emit).toHaveBeenCalledWith('tavern');
  });

  it('does not automatically map number keys to menu items', () => {
    jest.spyOn(component.select, 'emit');

    const event = new KeyboardEvent('keydown', { key: '2' });
    component.handleKeyPress(event);

    // Should NOT select item at index 1 (no automatic number mapping)
    expect(component.select.emit).not.toHaveBeenCalled();
  });

  it('selects item by explicit number shortcut', () => {
    // Set up menu item with explicit number shortcut
    component.items = [
      { id: 'one', label: 'Option 1', enabled: true, shortcut: '1' },
      { id: 'two', label: 'Option 2', enabled: true, shortcut: '2' }
    ];
    jest.spyOn(component.select, 'emit');

    const event = new KeyboardEvent('keydown', { key: '2' });
    component.handleKeyPress(event);

    // Should select item with shortcut '2' (not index 1)
    expect(component.select.emit).toHaveBeenCalledWith('two');
  });

  it('skips disabled items when navigating', () => {
    component.selectedIndex = 1;

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.handleKeyPress(event);

    // Should wrap around to first item, skipping disabled item
    expect(component.selectedIndex).toBe(0);
  });
});
