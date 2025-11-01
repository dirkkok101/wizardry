import { TestBed } from '@angular/core/testing';
import { CommandExecutorService, Command } from '../CommandExecutorService';
import { GameStateService } from '../GameStateService';
import { SaveService } from '../SaveService';

describe('CommandExecutorService', () => {
  let service: CommandExecutorService;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CommandExecutorService, GameStateService, SaveService]
    });
    service = TestBed.inject(CommandExecutorService);
    gameState = TestBed.inject(GameStateService);
  });

  describe('execute', () => {
    it('executes a successful command', async () => {
      const command: Command = {
        description: 'Test command',
        execute: jest.fn().mockResolvedValue(true)
      };

      const result = await service.execute(command);

      expect(result).toBe(true);
      expect(command.execute).toHaveBeenCalled();
    });

    it('adds successful command to history', async () => {
      const command: Command = {
        description: 'Test command',
        execute: jest.fn().mockResolvedValue(true)
      };

      await service.execute(command);

      const history = service.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toBe(command);
    });

    it('does not add failed command to history', async () => {
      const command: Command = {
        description: 'Failing command',
        execute: jest.fn().mockResolvedValue(false)
      };

      await service.execute(command);

      const history = service.getHistory();
      expect(history).toHaveLength(0);
    });

    it('handles command errors gracefully', async () => {
      const command: Command = {
        description: 'Error command',
        execute: jest.fn().mockRejectedValue(new Error('Test error'))
      };

      const result = await service.execute(command);

      expect(result).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('clears command history', async () => {
      const command: Command = {
        description: 'Test command',
        execute: jest.fn().mockResolvedValue(true)
      };

      await service.execute(command);
      expect(service.getHistory()).toHaveLength(1);

      service.clearHistory();
      expect(service.getHistory()).toHaveLength(0);
    });
  });
});
