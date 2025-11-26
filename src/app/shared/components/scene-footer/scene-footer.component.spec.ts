import { TestBed } from '@angular/core/testing';
import { SceneFooterComponent } from './scene-footer.component';
import { MenuItem } from '@types/MenuItem';

describe('SceneFooterComponent', () => {
  it('renders menu with provided items', () => {
    const fixture = TestBed.createComponent(SceneFooterComponent);
    const items: MenuItem[] = [
      { id: 'test', label: 'TEST', shortcut: 'T', disabled: false }
    ];
    fixture.componentRef.setInput('menuItems', items);
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('app-menu');
    expect(menu).toBeTruthy();
  });

  it('emits itemSelected when menu item is selected', () => {
    const fixture = TestBed.createComponent(SceneFooterComponent);
    const items: MenuItem[] = [
      { id: 'test', label: 'TEST', shortcut: 'T', disabled: false }
    ];
    fixture.componentRef.setInput('menuItems', items);

    let emittedId: string | undefined;
    fixture.componentInstance.itemSelected.subscribe(id => emittedId = id);

    fixture.componentInstance.onItemSelected('test');

    expect(emittedId).toBe('test');
  });
});
