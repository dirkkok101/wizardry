import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SceneTitleComponent } from './scene-title.component';

describe('SceneTitleComponent', () => {
  let component: SceneTitleComponent;
  let fixture: ComponentFixture<SceneTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneTitleComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SceneTitleComponent);
    component = fixture.componentInstance;
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
});
