import { TestBed } from '@angular/core/testing';
import { LoggerService } from '../LoggerService';

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoggerService]
    });
    service = TestBed.inject(LoggerService);

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('log', () => {
    it('logs messages in development mode', () => {
      service.log('Test message', 'arg1', 'arg2');

      // In test environment (development mode), should log
      expect(consoleLogSpy).toHaveBeenCalledWith('Test message', 'arg1', 'arg2');
    });
  });

  describe('warn', () => {
    it('logs warnings in development mode', () => {
      service.warn('Warning message', 'data');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Warning message', 'data');
    });
  });

  describe('error', () => {
    it('always logs errors', () => {
      service.error('Error message', new Error('test'));

      // Errors should be logged even in production
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error message', expect.any(Error));
    });
  });
});
