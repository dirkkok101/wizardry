/**
 * Tests for SaveService error types
 */

import {
  SaveServiceError,
  StorageQuotaError,
  StorageUnavailableError,
  SaveCorruptionError,
  SaveVersionError
} from '../SaveErrors'

describe('SaveErrors', () => {
  describe('SaveServiceError', () => {
    it('creates error with message and default recoverable false', () => {
      const error = new SaveServiceError('test error')

      expect(error.message).toBe('test error')
      expect(error.recoverable).toBe(false)
      expect(error.name).toBe('SaveServiceError')
      expect(error).toBeInstanceOf(Error)
    })

    it('creates error with custom recoverable flag', () => {
      const error = new SaveServiceError('recoverable error', true)

      expect(error.recoverable).toBe(true)
    })
  })

  describe('StorageQuotaError', () => {
    it('creates error with standard message and recoverable true', () => {
      const error = new StorageQuotaError()

      expect(error.message).toBe('Storage quota exceeded. Please delete old saves or export backups.')
      expect(error.recoverable).toBe(true)
      expect(error.name).toBe('StorageQuotaError')
      expect(error).toBeInstanceOf(SaveServiceError)
    })
  })

  describe('StorageUnavailableError', () => {
    it('creates error with standard message and recoverable false', () => {
      const error = new StorageUnavailableError()

      expect(error.message).toBe('Storage is unavailable. Private browsing mode may prevent saving.')
      expect(error.recoverable).toBe(false)
      expect(error.name).toBe('StorageUnavailableError')
      expect(error).toBeInstanceOf(SaveServiceError)
    })
  })

  describe('SaveCorruptionError', () => {
    it('creates error with custom message and recoverable false', () => {
      const error = new SaveCorruptionError('checksum mismatch')

      expect(error.message).toBe('checksum mismatch')
      expect(error.recoverable).toBe(false)
      expect(error.name).toBe('SaveCorruptionError')
      expect(error).toBeInstanceOf(SaveServiceError)
    })
  })

  describe('SaveVersionError', () => {
    it('creates error with custom message and recoverable false', () => {
      const error = new SaveVersionError('version 99 not supported')

      expect(error.message).toBe('version 99 not supported')
      expect(error.recoverable).toBe(false)
      expect(error.name).toBe('SaveVersionError')
      expect(error).toBeInstanceOf(SaveServiceError)
    })
  })
})
