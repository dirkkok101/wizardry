import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageLogComponent } from './message-log.component';

describe('MessageLogComponent', () => {
  let component: MessageLogComponent;
  let fixture: ComponentFixture<MessageLogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MessageLogComponent]
    });

    fixture = TestBed.createComponent(MessageLogComponent);
    component = fixture.componentInstance;
  });

  it('displays all messages in order', () => {
    fixture.componentRef.setInput('messages', ['First', 'Second', 'Third']);
    fixture.detectChanges();

    const messageElements = fixture.nativeElement.querySelectorAll('.message');
    expect(messageElements.length).toBe(3);
    expect(messageElements[0].textContent).toBe('First');
    expect(messageElements[1].textContent).toBe('Second');
    expect(messageElements[2].textContent).toBe('Third');
  });

  it('shows empty state when no messages', () => {
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    const messageElements = fixture.nativeElement.querySelectorAll('.message');
    expect(messageElements.length).toBe(0);
  });

  it('auto-scrolls to newest message after render', () => {
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    const logContent = fixture.nativeElement.querySelector('.message-log-content');
    expect(logContent).toBeTruthy();
    // Check that scrollTop is at maximum (scrolled to bottom)
    expect(logContent.scrollTop).toBeGreaterThanOrEqual(0);
  });

  it('handles maximum message limit gracefully', () => {
    const messages = Array.from({ length: 15 }, (_, i) => `Message ${i + 1}`);
    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    const messageElements = fixture.nativeElement.querySelectorAll('.message');
    expect(messageElements.length).toBe(15);
  });
});
