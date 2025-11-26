import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MessageService } from '../MessageService';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageService);
  });

  afterEach(() => {
    service.clear();
  });

  describe('initial state', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with no message', () => {
      expect(service.message()).toBeNull();
      expect(service.hasMessage()).toBe(false);
    });
  });

  describe('showError()', () => {
    it('should set error message', () => {
      service.showError('Test error');

      expect(service.message()).toEqual({ text: 'Test error', type: 'error' });
      expect(service.isError()).toBe(true);
      expect(service.isSuccess()).toBe(false);
      expect(service.messageText()).toBe('Test error');
    });

    it('should auto-dismiss after default duration', fakeAsync(() => {
      service.showError('Test error');

      expect(service.hasMessage()).toBe(true);

      tick(3000);

      expect(service.hasMessage()).toBe(false);
      expect(service.message()).toBeNull();
    }));

    it('should auto-dismiss after custom duration', fakeAsync(() => {
      service.showError('Test error', 1000);

      expect(service.hasMessage()).toBe(true);

      tick(1000);

      expect(service.hasMessage()).toBe(false);
    }));

    it('should not auto-dismiss when duration is 0', fakeAsync(() => {
      service.showError('Persistent error', 0);

      expect(service.hasMessage()).toBe(true);

      tick(5000);

      expect(service.hasMessage()).toBe(true);
    }));
  });

  describe('showSuccess()', () => {
    it('should set success message', () => {
      service.showSuccess('Test success');

      expect(service.message()).toEqual({ text: 'Test success', type: 'success' });
      expect(service.isSuccess()).toBe(true);
      expect(service.isError()).toBe(false);
      expect(service.messageText()).toBe('Test success');
    });

    it('should auto-dismiss after default duration', fakeAsync(() => {
      service.showSuccess('Test success');

      expect(service.hasMessage()).toBe(true);

      tick(3000);

      expect(service.hasMessage()).toBe(false);
    }));
  });

  describe('showInfo()', () => {
    it('should set info message', () => {
      service.showInfo('Test info');

      expect(service.message()).toEqual({ text: 'Test info', type: 'info' });
      expect(service.messageText()).toBe('Test info');
    });
  });

  describe('showWarning()', () => {
    it('should set warning message', () => {
      service.showWarning('Test warning');

      expect(service.message()).toEqual({ text: 'Test warning', type: 'warning' });
      expect(service.messageText()).toBe('Test warning');
    });
  });

  describe('clear()', () => {
    it('should clear current message immediately', () => {
      service.showError('Test error');
      expect(service.hasMessage()).toBe(true);

      service.clear();

      expect(service.hasMessage()).toBe(false);
      expect(service.message()).toBeNull();
    });

    it('should cancel pending auto-dismiss timer', fakeAsync(() => {
      service.showError('Test error', 3000);

      // Clear before timer fires
      tick(1000);
      service.clear();

      // Advance past original timeout
      tick(3000);

      // Should still be cleared (no error from orphaned timer)
      expect(service.hasMessage()).toBe(false);
    }));

    it('should be safe to call when no message exists', () => {
      expect(() => service.clear()).not.toThrow();
      expect(service.hasMessage()).toBe(false);
    });
  });

  describe('message replacement', () => {
    it('should replace existing message with new one', () => {
      service.showError('First error');
      service.showSuccess('Success message');

      expect(service.message()).toEqual({ text: 'Success message', type: 'success' });
      expect(service.isSuccess()).toBe(true);
      expect(service.isError()).toBe(false);
    });

    it('should clear existing timer when showing new message', fakeAsync(() => {
      service.showError('First error', 5000);

      tick(2000);
      service.showSuccess('New success', 1000);

      // New message should dismiss after its own duration
      tick(1000);
      expect(service.hasMessage()).toBe(false);
    }));

    it('should not dismiss new message based on old timer', fakeAsync(() => {
      service.showError('First error', 1000);

      tick(500);
      service.showSuccess('New success', 5000);

      // Old timer would have fired at 1000ms total, but we're at 500ms
      // After this tick we're at 1100ms total - old timer cleared, new timer still pending
      tick(600);
      expect(service.hasMessage()).toBe(true);
      expect(service.messageText()).toBe('New success');

      // New timer fires at 5000ms from when it was set (at 500ms mark)
      // So it fires at 5500ms total. We're at 1100ms, need 4400ms more.
      tick(4400);
      expect(service.hasMessage()).toBe(false);
    }));
  });

  describe('computed helpers', () => {
    it('hasMessage() should return true when message exists', () => {
      expect(service.hasMessage()).toBe(false);

      service.showInfo('Test');

      expect(service.hasMessage()).toBe(true);
    });

    it('messageText() should return empty string when no message', () => {
      expect(service.messageText()).toBe('');
    });

    it('isError() should return false when no message', () => {
      expect(service.isError()).toBe(false);
    });

    it('isSuccess() should return false when no message', () => {
      expect(service.isSuccess()).toBe(false);
    });
  });
});
