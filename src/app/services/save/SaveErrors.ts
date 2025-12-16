/**
 * Error types for SaveService
 *
 * These typed errors provide better error handling and recovery options
 * for save/load operations.
 */

/**
 * Base error class for all SaveService errors
 */
export class SaveServiceError extends Error {
  constructor(
    message: string,
    public readonly recoverable: boolean = false
  ) {
    super(message)
    this.name = 'SaveServiceError'
  }
}

/**
 * Thrown when localStorage quota is exceeded
 * Recoverable - user can delete old saves or export backups
 */
export class StorageQuotaError extends SaveServiceError {
  constructor() {
    super('Storage quota exceeded. Please delete old saves or export backups.', true)
    this.name = 'StorageQuotaError'
  }
}

/**
 * Thrown when localStorage is not available (e.g., private browsing)
 * Not recoverable - storage access is blocked
 */
export class StorageUnavailableError extends SaveServiceError {
  constructor() {
    super('Storage is unavailable. Private browsing mode may prevent saving.', false)
    this.name = 'StorageUnavailableError'
  }
}

/**
 * Thrown when save data fails integrity checks (checksum mismatch, invalid JSON)
 * Not recoverable - data is corrupted
 */
export class SaveCorruptionError extends SaveServiceError {
  constructor(message: string) {
    super(message, false)
    this.name = 'SaveCorruptionError'
  }
}

/**
 * Thrown when save data is from an incompatible version (future version)
 * Not recoverable - can't downgrade save format
 */
export class SaveVersionError extends SaveServiceError {
  constructor(message: string) {
    super(message, false)
    this.name = 'SaveVersionError'
  }
}
