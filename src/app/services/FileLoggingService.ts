/**
 * FileLoggingService - Captures console logs to downloadable file
 *
 * Intercepts all console.log/warn/error/debug calls and stores them
 * in an in-memory circular buffer. Provides window methods for
 * downloading logs as plain text files.
 *
 * Usage:
 *   window.downloadLogs()  - Download captured logs
 *   window.clearLogs()     - Clear log buffer
 *   window.getLogCount()   - Get number of captured logs
 */

interface LogEntry {
  timestamp: Date
  level: 'LOG' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
}

export class FileLoggingService {
  private buffer: LogEntry[] = []
  private maxSize: number
  private writeIndex: number = 0
  private isFull: boolean = false

  // Store original console methods
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  }

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
    this.buffer = new Array(maxSize)
  }

  /**
   * Initialize log capturing by intercepting console methods
   */
  initialize(): void {
    this.interceptConsole('log', 'LOG')
    this.interceptConsole('warn', 'WARN')
    this.interceptConsole('error', 'ERROR')
    this.interceptConsole('debug', 'DEBUG')

    // Expose global methods
    this.exposeGlobalMethods()
  }

  /**
   * Intercept a console method and capture its output
   */
  private interceptConsole(method: 'log' | 'warn' | 'error' | 'debug', level: LogEntry['level']): void {
    const original = this.originalConsole[method]
    const self = this

    console[method] = function(...args: any[]) {
      // Call original console method (preserve normal console output)
      original.apply(console, args)

      // Capture to buffer
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')

      self.addLogEntry({
        timestamp: new Date(),
        level,
        message
      })
    }
  }

  /**
   * Add log entry to circular buffer
   */
  private addLogEntry(entry: LogEntry): void {
    this.buffer[this.writeIndex] = entry
    this.writeIndex = (this.writeIndex + 1) % this.maxSize

    if (this.writeIndex === 0) {
      this.isFull = true
    }
  }

  /**
   * Get all captured logs in chronological order
   */
  getLogs(): LogEntry[] {
    if (!this.isFull) {
      // Buffer not full yet - return 0 to writeIndex
      return this.buffer.slice(0, this.writeIndex)
    } else {
      // Buffer is full - return from writeIndex to end, then 0 to writeIndex
      return [
        ...this.buffer.slice(this.writeIndex),
        ...this.buffer.slice(0, this.writeIndex)
      ]
    }
  }

  /**
   * Get number of captured logs
   */
  getCount(): number {
    return this.isFull ? this.maxSize : this.writeIndex
  }

  /**
   * Clear all captured logs
   */
  clear(): void {
    this.buffer = new Array(this.maxSize)
    this.writeIndex = 0
    this.isFull = false
  }

  /**
   * Format timestamp as [YYYY-MM-DD HH:MM:SS.mmm]
   */
  private formatTimestamp(date: Date): string {
    const pad = (n: number, width: number = 2) => String(n).padStart(width, '0')

    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())
    const ms = pad(date.getMilliseconds(), 3)

    return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}]`
  }

  /**
   * Format log entry as plain text line
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = this.formatTimestamp(entry.timestamp)
    const level = `[${entry.level}]`.padEnd(7) // Align levels
    return `${timestamp} ${level} ${entry.message}`
  }

  /**
   * Download logs as .log file
   */
  downloadLogs(): void {
    const logs = this.getLogs()

    if (logs.length === 0) {
      this.originalConsole.warn('[FileLoggingService] No logs to download')
      return
    }

    // Format logs as plain text
    const content = logs.map(entry => this.formatLogEntry(entry)).join('\n')

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `wizardry-logs-${timestamp}.log`

    // Create temporary download link
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up blob URL
    URL.revokeObjectURL(url)

    this.originalConsole.log(`[FileLoggingService] Downloaded ${logs.length} logs to ${filename}`)
  }

  /**
   * Expose global methods on window object
   */
  private exposeGlobalMethods(): void {
    (window as any).downloadLogs = () => this.downloadLogs();
    (window as any).clearLogs = () => {
      this.clear()
      // Use original console to avoid capturing this log
      this.originalConsole.log('[FileLoggingService] Logs cleared')
    };
    (window as any).getLogCount = () => {
      const count = this.getCount()
      // Use original console to avoid capturing this log
      this.originalConsole.log(`[FileLoggingService] ${count} logs captured`)
      return count
    }
  }

  /**
   * Restore original console methods (for cleanup/testing)
   */
  restore(): void {
    console.log = this.originalConsole.log
    console.warn = this.originalConsole.warn
    console.error = this.originalConsole.error
    console.debug = this.originalConsole.debug
  }
}

// Singleton instance
let instance: FileLoggingService | null = null

/**
 * Initialize file logging (call once at app startup)
 */
export function initializeFileLogging(maxSize: number = 1000): FileLoggingService {
  if (instance) {
    // Use instance's original console to avoid capturing this warning
    if (instance) {
      instance['originalConsole'].warn('[FileLoggingService] Already initialized')
    }
    return instance
  }

  instance = new FileLoggingService(maxSize)
  instance.initialize()
  // Use original console to avoid capturing initialization log
  instance['originalConsole'].log(`[FileLoggingService] Initialized with buffer size ${maxSize}`)
  return instance
}

/**
 * Get singleton instance (for testing)
 */
export function getFileLoggingInstance(): FileLoggingService | null {
  return instance
}
