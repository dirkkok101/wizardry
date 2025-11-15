import { FileLoggingService, initializeFileLogging, getFileLoggingInstance } from '../FileLoggingService'

describe('FileLoggingService', () => {
  let service: FileLoggingService
  let originalConsole: {
    log: typeof console.log
    warn: typeof console.warn
    error: typeof console.error
    debug: typeof console.debug
  }

  beforeEach(() => {
    // Store original console methods
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    }

    // Create fresh service instance
    service = new FileLoggingService(10) // Small buffer for testing
    service.initialize()
  })

  afterEach(() => {
    // Restore original console methods
    service.restore()
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    console.debug = originalConsole.debug
  })

  describe('console interception', () => {
    it('captures console.log messages', () => {
      console.log('Test message')

      const logs = service.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].level).toBe('LOG')
      expect(logs[0].message).toBe('Test message')
    })

    it('captures console.warn messages', () => {
      console.warn('Warning message')

      const logs = service.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].level).toBe('WARN')
      expect(logs[0].message).toBe('Warning message')
    })

    it('captures console.error messages', () => {
      console.error('Error message')

      const logs = service.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].level).toBe('ERROR')
      expect(logs[0].message).toBe('Error message')
    })

    it('captures console.debug messages', () => {
      console.debug('Debug message')

      const logs = service.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].level).toBe('DEBUG')
      expect(logs[0].message).toBe('Debug message')
    })

    it('captures multiple arguments', () => {
      console.log('Message', 'with', 'multiple', 'args')

      const logs = service.getLogs()
      expect(logs[0].message).toBe('Message with multiple args')
    })

    it('serializes object arguments', () => {
      console.log('Object:', { foo: 'bar', baz: 123 })

      const logs = service.getLogs()
      expect(logs[0].message).toContain('Object:')
      expect(logs[0].message).toContain('"foo":"bar"')
      expect(logs[0].message).toContain('"baz":123')
    })

    it('includes timestamps on all entries', () => {
      console.log('Message 1')
      console.log('Message 2')

      const logs = service.getLogs()
      expect(logs[0].timestamp).toBeInstanceOf(Date)
      expect(logs[1].timestamp).toBeInstanceOf(Date)
      expect(logs[1].timestamp.getTime()).toBeGreaterThanOrEqual(logs[0].timestamp.getTime())
    })
  })

  describe('circular buffer', () => {
    it('respects maxSize limit', () => {
      // Add 10 logs (buffer size)
      for (let i = 0; i < 10; i++) {
        console.log(`Message ${i}`)
      }

      expect(service.getCount()).toBe(10)
    })

    it('overwrites oldest entries when buffer is full', () => {
      // Add 15 logs (buffer size = 10)
      for (let i = 0; i < 15; i++) {
        console.log(`Message ${i}`)
      }

      const logs = service.getLogs()
      expect(logs.length).toBe(10)
      // Should have messages 5-14 (oldest 0-4 discarded)
      expect(logs[0].message).toBe('Message 5')
      expect(logs[9].message).toBe('Message 14')
    })

    it('maintains chronological order after wraparound', () => {
      // Add 12 logs (buffer size = 10)
      for (let i = 0; i < 12; i++) {
        console.log(`Message ${i}`)
      }

      const logs = service.getLogs()
      // Should be in order: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
      for (let i = 0; i < logs.length - 1; i++) {
        const current = parseInt(logs[i].message.split(' ')[1])
        const next = parseInt(logs[i + 1].message.split(' ')[1])
        expect(next).toBe(current + 1)
      }
    })
  })

  describe('getCount', () => {
    it('returns 0 when empty', () => {
      expect(service.getCount()).toBe(0)
    })

    it('returns correct count when partially filled', () => {
      console.log('Message 1')
      console.log('Message 2')
      console.log('Message 3')

      expect(service.getCount()).toBe(3)
    })

    it('returns maxSize when buffer is full', () => {
      for (let i = 0; i < 15; i++) {
        console.log(`Message ${i}`)
      }

      expect(service.getCount()).toBe(10) // maxSize
    })
  })

  describe('clear', () => {
    it('removes all logs', () => {
      console.log('Message 1')
      console.log('Message 2')

      service.clear()

      expect(service.getCount()).toBe(0)
      expect(service.getLogs()).toEqual([])
    })

    it('resets buffer after being full', () => {
      // Fill buffer
      for (let i = 0; i < 12; i++) {
        console.log(`Message ${i}`)
      }

      service.clear()
      console.log('New message')

      const logs = service.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].message).toBe('New message')
    })
  })

  describe('downloadLogs', () => {
    beforeEach(() => {
      // Mock DOM methods needed for download
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()

      // Mock document.body methods
      document.body.appendChild = jest.fn()
      document.body.removeChild = jest.fn()
    })

    it('creates download with correct filename format', () => {
      console.log('Test log')

      service.downloadLogs()

      const mockLink = document.createElement('a')
      const appendSpy = document.body.appendChild as jest.Mock
      expect(appendSpy).toHaveBeenCalled()

      const addedElement = appendSpy.mock.calls[0][0]
      // Updated regex to include seconds
      expect(addedElement.download).toMatch(/^wizardry-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/)
    })

    it('formats log entries with timestamps', () => {
      console.log('Test message')

      // Capture the blob content
      let blobContent = ''
      global.Blob = jest.fn().mockImplementation((content) => {
        blobContent = content[0]
        return { size: content[0].length, type: 'text/plain' }
      }) as any

      service.downloadLogs()

      expect(blobContent).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]/)
      expect(blobContent).toContain('[LOG]')
      expect(blobContent).toContain('Test message')
    })

    it('formats multiple log levels correctly', () => {
      console.log('Log message')
      console.warn('Warn message')
      console.error('Error message')

      let blobContent = ''
      global.Blob = jest.fn().mockImplementation((content) => {
        blobContent = content[0]
        return { size: content[0].length, type: 'text/plain' }
      }) as any

      service.downloadLogs()

      expect(blobContent).toContain('[LOG]')
      expect(blobContent).toContain('[WARN]')
      expect(blobContent).toContain('[ERROR]')
    })

    it('does not download when buffer is empty', () => {
      const createObjectURLSpy = global.URL.createObjectURL as jest.Mock
      createObjectURLSpy.mockClear()

      service.downloadLogs()

      expect(createObjectURLSpy).not.toHaveBeenCalled()
    })

    it('cleans up blob URL after download', () => {
      console.log('Test')

      service.downloadLogs()

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('window global methods', () => {
    it('exposes window.downloadLogs', () => {
      expect(typeof (window as any).downloadLogs).toBe('function')
    })

    it('exposes window.clearLogs', () => {
      expect(typeof (window as any).clearLogs).toBe('function')
    })

    it('exposes window.getLogCount', () => {
      expect(typeof (window as any).getLogCount).toBe('function')
    })

    it('window.getLogCount returns correct count', () => {
      console.log('Message')

      const count = (window as any).getLogCount()
      expect(count).toBe(1)
    })

    it('window.clearLogs clears buffer', () => {
      console.log('Message')
      expect(service.getCount()).toBe(1)

      // Clear via window method (which operates on service instance)
      ;(window as any).clearLogs()

      // Verify buffer was cleared
      expect(service.getCount()).toBe(0)
    })
  })

  describe('initializeFileLogging', () => {
    it('creates singleton instance', () => {
      const instance1 = initializeFileLogging(100)
      const instance2 = initializeFileLogging(100)

      expect(instance1).toBe(instance2)
    })

    it('returns existing instance via getFileLoggingInstance', () => {
      const instance = initializeFileLogging(100)
      const retrieved = getFileLoggingInstance()

      expect(retrieved).toBe(instance)
    })

    it('initializes with custom buffer size', () => {
      // First restore existing service to prevent interference
      service.restore()

      // Create new instance with larger buffer
      const instance = new FileLoggingService(500)
      instance.initialize()

      // Fill with 600 logs
      for (let i = 0; i < 600; i++) {
        console.log(`Message ${i}`)
      }

      expect(instance.getCount()).toBe(500)

      // Clean up
      instance.restore()
    })
  })

  describe('restore', () => {
    it('restores original console methods', () => {
      const originalLog = originalConsole.log

      service.restore()

      expect(console.log).toBe(originalLog)
    })

    it('stops capturing after restore', () => {
      service.restore()
      console.log('Should not be captured')

      // Create new service to check
      const newService = new FileLoggingService(10)
      expect(newService.getCount()).toBe(0)
    })
  })
})
