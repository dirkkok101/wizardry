import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component } from '@angular/core'
import { SelectionListComponent, SelectableOption } from '../selection-list.component'

interface TestOption extends SelectableOption {
  name: string
  cost: number
}

// Test host component to provide template
@Component({
  standalone: true,
  imports: [SelectionListComponent],
  template: `
    <app-selection-list
      [options]="options"
      [allowArrowNavigation]="allowArrowNavigation"
      (optionSelected)="onSelected($event)"
      (cancelled)="onCancelled()">
      <ng-template #itemTemplate let-option let-selected="selected">
        <span class="test-item" [class.is-selected]="selected">
          {{ option.name }} - {{ option.cost }} gp
        </span>
      </ng-template>
    </app-selection-list>
  `
})
class TestHostComponent {
  options: TestOption[] = [
    { id: 'a', shortcut: 'A', enabled: true, name: 'Option A', cost: 10 },
    { id: 'b', shortcut: 'B', enabled: true, name: 'Option B', cost: 20 },
    { id: 'c', shortcut: 'C', enabled: false, name: 'Option C', cost: 30 },
    { id: 'd', shortcut: 'D', enabled: true, name: 'Option D', cost: 40 }
  ]
  allowArrowNavigation = true
  selectedOption: TestOption | null = null
  cancelledCalled = false

  onSelected(option: TestOption): void {
    this.selectedOption = option
  }

  onCancelled(): void {
    this.cancelledCalled = true
  }
}

describe('SelectionListComponent', () => {
  let hostComponent: TestHostComponent
  let hostFixture: ComponentFixture<TestHostComponent>
  let selectionList: SelectionListComponent<TestOption>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents()

    hostFixture = TestBed.createComponent(TestHostComponent)
    hostComponent = hostFixture.componentInstance
    hostFixture.detectChanges()

    // Get the SelectionListComponent instance
    const listDebugEl = hostFixture.debugElement.query(
      el => el.componentInstance instanceof SelectionListComponent
    )
    selectionList = listDebugEl.componentInstance as SelectionListComponent<TestOption>
  })

  describe('initialization', () => {
    it('should create', () => {
      expect(selectionList).toBeTruthy()
    })

    it('should display all options', () => {
      const items = hostFixture.nativeElement.querySelectorAll('.selection-item')
      expect(items.length).toBe(4)
    })

    it('should display shortcuts', () => {
      const shortcuts = hostFixture.nativeElement.querySelectorAll('.item-shortcut')
      expect(shortcuts.length).toBe(4)
      expect(shortcuts[0].textContent).toContain('A')
      expect(shortcuts[1].textContent).toContain('B')
    })

    it('should render custom template content', () => {
      const testItems = hostFixture.nativeElement.querySelectorAll('.test-item')
      expect(testItems.length).toBe(4)
      expect(testItems[0].textContent).toContain('Option A - 10 gp')
    })

    it('should mark disabled options', () => {
      const items = hostFixture.nativeElement.querySelectorAll('.selection-item')
      expect(items[2].classList.contains('disabled')).toBe(true)
    })
  })

  describe('keyboard navigation', () => {
    it('should navigate down with ArrowDown', () => {
      // Start at index 0
      expect(selectionList.selectedIndex()).toBe(0)

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      selectionList.handleKeydown(event)

      expect(selectionList.selectedIndex()).toBe(1)
    })

    it('should navigate up with ArrowUp', () => {
      selectionList.selectedIndex.set(1)

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      selectionList.handleKeydown(event)

      expect(selectionList.selectedIndex()).toBe(0)
    })

    it('should skip disabled options when navigating', () => {
      selectionList.selectedIndex.set(1) // Option B

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      selectionList.handleKeydown(event)

      // Should skip C (disabled) and go to D
      expect(selectionList.selectedIndex()).toBe(3)
    })

    it('should wrap around at the end', () => {
      selectionList.selectedIndex.set(3) // Last enabled option

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      selectionList.handleKeydown(event)

      expect(selectionList.selectedIndex()).toBe(0)
    })

    it('should wrap around at the beginning', () => {
      selectionList.selectedIndex.set(0)

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      selectionList.handleKeydown(event)

      expect(selectionList.selectedIndex()).toBe(3)
    })
  })

  describe('shortcut key selection', () => {
    it('should select option with matching shortcut', () => {
      const event = new KeyboardEvent('keydown', { key: 'B' })
      selectionList.handleKeydown(event)

      expect(hostComponent.selectedOption?.id).toBe('b')
    })

    it('should be case-insensitive', () => {
      const event = new KeyboardEvent('keydown', { key: 'd' })
      selectionList.handleKeydown(event)

      expect(hostComponent.selectedOption?.id).toBe('d')
    })

    it('should not select disabled option by shortcut', () => {
      const event = new KeyboardEvent('keydown', { key: 'C' })
      selectionList.handleKeydown(event)

      expect(hostComponent.selectedOption).toBeNull()
    })
  })

  describe('Enter key selection', () => {
    it('should select current option on Enter', () => {
      selectionList.selectedIndex.set(1)

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      selectionList.handleKeydown(event)

      expect(hostComponent.selectedOption?.id).toBe('b')
    })

    it('should not select disabled option on Enter', () => {
      selectionList.selectedIndex.set(2) // Disabled option

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      selectionList.handleKeydown(event)

      expect(hostComponent.selectedOption).toBeNull()
    })
  })

  describe('ESC key cancellation', () => {
    it('should emit cancelled on ESC', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      selectionList.handleKeydown(event)

      expect(hostComponent.cancelledCalled).toBe(true)
    })
  })

  describe('mouse interaction', () => {
    it('should select option on click', () => {
      const items = hostFixture.nativeElement.querySelectorAll('.selection-item')
      items[1].click()
      hostFixture.detectChanges()

      expect(hostComponent.selectedOption?.id).toBe('b')
    })

    it('should not select disabled option on click', () => {
      const items = hostFixture.nativeElement.querySelectorAll('.selection-item')
      items[2].click() // Disabled option
      hostFixture.detectChanges()

      expect(hostComponent.selectedOption).toBeNull()
    })

    it('should update selection on hover', () => {
      selectionList.onOptionMouseEnter(3)
      expect(selectionList.selectedIndex()).toBe(3)
    })

    it('should not update selection on hover of disabled option', () => {
      const initialIndex = selectionList.selectedIndex()
      selectionList.onOptionMouseEnter(2) // Disabled
      expect(selectionList.selectedIndex()).toBe(initialIndex)
    })
  })

  describe('arrow navigation disabled', () => {
    beforeEach(() => {
      hostComponent.allowArrowNavigation = false
      hostFixture.detectChanges()
    })

    it('should ignore arrow keys when navigation disabled', () => {
      const initialIndex = selectionList.selectedIndex()

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      selectionList.handleKeydown(event)

      expect(selectionList.selectedIndex()).toBe(initialIndex)
    })

    it('should still allow shortcut keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'B' })
      selectionList.handleKeydown(event)

      expect(hostComponent.selectedOption?.id).toBe('b')
    })
  })

  describe('computed properties', () => {
    it('should compute enabled indices correctly', () => {
      const enabled = selectionList.enabledIndices()
      expect(enabled).toEqual([0, 1, 3]) // Indices 0, 1, 3 are enabled
    })

    it('should compute selected option correctly', () => {
      selectionList.selectedIndex.set(1)
      const selected = selectionList.selectedOption()
      expect(selected?.id).toBe('b')
    })
  })
})
