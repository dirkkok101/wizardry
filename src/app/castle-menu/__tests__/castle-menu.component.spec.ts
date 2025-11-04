import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CastleMenuComponent } from '../castle-menu.component';
import { provideRouter } from '@angular/router';

describe('CastleMenuComponent', () => {
  let component: CastleMenuComponent;
  let fixture: ComponentFixture<CastleMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CastleMenuComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CastleMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Header', () => {
    it('should display SceneTitleComponent', () => {
      const titleComponent = fixture.nativeElement.querySelector('app-scene-title');
      expect(titleComponent).toBeTruthy();
    });
  });
});
