import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MazeViewComponent } from '../maze-view.component';
import { CanvasCommand } from '../../../types/rendering.types';

describe('MazeViewComponent', () => {
  let component: MazeViewComponent;
  let fixture: ComponentFixture<MazeViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeViewComponent]
    });

    fixture = TestBed.createComponent(MazeViewComponent);
    component = fixture.componentInstance;
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('has canvas element after init', () => {
    fixture.detectChanges();

    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('handles empty commands array', () => {
    fixture.componentRef.setInput('commands', []);
    fixture.detectChanges();

    // Should not throw error
    expect(component).toBeTruthy();
  });

  it('renders when commands input changes', () => {
    const commands: CanvasCommand[] = [
      { type: 'line', x: 0, y: 0, x2: 100, y2: 100, color: '#0f0' }
    ];

    fixture.componentRef.setInput('commands', commands);
    fixture.detectChanges();

    // Component should handle the change
    expect(component.commands()).toEqual(commands);
  });
});
