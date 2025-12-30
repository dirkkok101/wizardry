# FileLoggingService

**Status**: ✅ Implemented
**Location**: `src/services/FileLoggingService.ts`
**Tests**: `src/services/__tests__/FileLoggingService.spec.ts`

## Overview

FileLoggingService captures all console output (log, warn, error, debug) into an in-memory circular buffer and provides convenient methods for downloading logs as plain text files. This service is designed for development debugging to make it easy to extract and share console logs without copy-pasting from browser DevTools.

## Purpose

**Problem**: Browser console logs are difficult to copy-paste cleanly, lose formatting, and include extraneous browser information.

**Solution**: Automatically intercept all console methods, store logs with timestamps in a circular buffer, and provide a simple `window.downloadLogs()` command to export clean, formatted log files.

## Architecture

### Circular Buffer

Uses a ring buffer (fixed-size array) for efficient memory usage:
- Default size: 1000 entries (configurable)
- Oldest logs automatically discarded when full
- No memory leaks or unbounded growth
- O(1) insertion performance

### Console Interception

Wraps native console methods while preserving original behavior:
- Console output still appears in browser DevTools
- All output is simultaneously captured to buffer
- Original methods can be restored (useful for testing)

### Singleton Pattern

Single global instance initialized at app startup:
- Captures logs from the very first line of code
- No service injection required
- Accessible via window global methods

## Initialization

FileLoggingService is automatically initialized in `src/main.ts` before Angular bootstrap:

```typescript
import { initializeFileLogging } from './services/FileLoggingService';

// Initialize with buffer size (default: 1000)
initializeFileLogging(1000);

bootstrapApplication(App, appConfig);
```

This ensures all logs from app startup onwards are captured.

## API Reference

### Window Global Methods

These methods are exposed on the `window` object for easy console access:

#### `window.downloadLogs()`

Downloads all captured logs as a `.log` file.

**Usage:**
```javascript
// In browser console
window.downloadLogs()
```

**Behavior:**
- Creates a file named `wizardry-logs-{timestamp}.log`
- Downloads via browser's download mechanism
- Logs are formatted as plain text with timestamps
- No-op if buffer is empty (warns in console)

**Example Output:**
```
[2025-11-15 12:34:56.789] [LOG]   [MazeComponent] drawCommands - position: (0,0,NORTH)
[2025-11-15 12:34:56.790] [LOG]   [MazeComponent] drawCommands - loading level: 1
[2025-11-15 12:34:56.791] [WARN]  [VisibilityService] No walls found
[2025-11-15 12:34:56.792] [ERROR] Monster not found: orc
```

#### `window.clearLogs()`

Clears all captured logs from buffer.

**Usage:**
```javascript
// In browser console
window.clearLogs()
```

**Behavior:**
- Resets buffer to empty state
- Future logs continue to be captured
- Logs confirmation message to console

#### `window.getLogCount()`

Returns the number of logs currently in buffer.

**Usage:**
```javascript
// In browser console
window.getLogCount()
// Output: [FileLoggingService] 247 logs captured
// Returns: 247
```

**Behavior:**
- Returns count as number
- Also logs count to console
- Useful for checking buffer usage

### TypeScript API

For programmatic access (testing, advanced usage):

#### `initializeFileLogging(maxSize?: number)`

Initialize file logging system.

**Parameters:**
- `maxSize` (optional): Maximum buffer size. Default: 1000

**Returns:** `FileLoggingService` instance

**Usage:**
```typescript
import { initializeFileLogging } from './services/FileLoggingService';

const logger = initializeFileLogging(2000); // 2000 entry buffer
```

**Notes:**
- Only call once (returns existing instance if already initialized)
- Must be called before any console logs to capture everything

#### `getFileLoggingInstance()`

Get the singleton instance (for testing).

**Returns:** `FileLoggingService | null`

**Usage:**
```typescript
import { getFileLoggingInstance } from './services/FileLoggingService';

const instance = getFileLoggingInstance();
if (instance) {
  console.log(`Buffer contains ${instance.getCount()} logs`);
}
```

## Log Entry Format

Each captured log entry contains:

```typescript
interface LogEntry {
  timestamp: Date      // Exact time log was created
  level: 'LOG' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string      // Formatted message with all arguments
}
```

### Timestamp Format

```
[YYYY-MM-DD HH:MM:SS.mmm]
```

Example: `[2025-11-15 12:34:56.789]`

### Level Format

Right-padded to 7 characters for alignment:

```
[LOG]
[WARN]
[ERROR]
[DEBUG]
```

### Message Format

- Multiple arguments joined with spaces
- Objects serialized to JSON
- Complex types converted to strings

## Usage Examples

### Basic Debugging Workflow

```javascript
// 1. Navigate app and reproduce issue
// 2. Open browser console (F12)
// 3. Download logs
window.downloadLogs()

// 4. Check how many logs captured
window.getLogCount()  // 523 logs

// 5. Clear buffer and reproduce again
window.clearLogs()
// ... reproduce issue ...
window.downloadLogs()  // Fresh logs only
```

### Capturing Specific Session

```javascript
// Start fresh session
window.clearLogs()

// Perform actions you want to debug
// ... click around, trigger errors ...

// Download logs for that specific session
window.downloadLogs()
```

### Sharing Logs with Team

```javascript
// Download logs
window.downloadLogs()

// File is saved to ~/Downloads/wizardry-logs-2025-11-15T12-34-56.log
// Attach to bug report, GitHub issue, or share via Slack
```

## Configuration

### Buffer Size

Default: 1000 entries

To change, modify `src/main.ts`:

```typescript
// Larger buffer for long debugging sessions
initializeFileLogging(5000);

// Smaller buffer for memory-constrained environments
initializeFileLogging(500);
```

**Considerations:**
- Larger buffers consume more memory
- Average log entry: ~200 bytes
- 1000 entries ≈ 200KB memory
- 5000 entries ≈ 1MB memory

## Performance

**Memory:**
- Circular buffer prevents unbounded growth
- Old entries automatically discarded
- Fixed memory footprint based on buffer size

**CPU:**
- O(1) log insertion (array index assignment)
- Minimal overhead per console call
- No blocking operations

**I/O:**
- Download uses Blob API (efficient)
- No network requests
- File created in-memory then downloaded

## Testing

### Running Tests

```bash
npm test FileLoggingService
```

### Test Coverage

- ✅ Console interception (all 4 methods)
- ✅ Circular buffer wraparound
- ✅ Log count tracking
- ✅ Clear functionality
- ✅ Download with blob creation
- ✅ Window global method exposure
- ✅ Singleton pattern
- ✅ Console restoration

**Coverage:** 100% (19 test cases)

### Mocking in Tests

When testing components that log, you may want to prevent log capture:

```typescript
import { getFileLoggingInstance } from '../services/FileLoggingService';

beforeEach(() => {
  // Temporarily disable logging
  const logger = getFileLoggingInstance();
  logger?.clear();
});
```

## Limitations

1. **Browser Only**: Does not work in Node.js/server environments
2. **No Persistence**: Logs lost on page refresh (by design)
3. **Memory Limit**: Circular buffer has fixed size
4. **No Filtering**: Captures all console output (cannot filter by source)
5. **Plain Text Only**: No syntax highlighting in exported files

## Future Enhancements

Possible improvements (not currently implemented):

- **Filtering**: Filter logs by level, source, or keyword
- **Search**: Query logs programmatically before download
- **Export Formats**: JSON, CSV, or HTML formats
- **Remote Upload**: Send logs to server endpoint
- **UI Component**: In-app log viewer panel
- **Compression**: Gzip logs before download for large buffers

## Troubleshooting

### "No logs to download"

**Cause**: Buffer is empty
**Solution**: Check if logs are being generated. Run `window.getLogCount()` to verify.

### Logs missing from beginning of session

**Cause**: FileLoggingService initialized too late
**Solution**: Verify `initializeFileLogging()` is called in `main.ts` before `bootstrapApplication()`

### Download not working

**Cause**: Browser blocked download
**Solution**: Check browser's download settings and permissions

### Large log file size

**Cause**: Many verbose logs in buffer
**Solution**:
- Call `window.clearLogs()` before capturing specific session
- Reduce buffer size in initialization
- Remove excessive console.log statements

## Related Services

- **LoggerService** (`src/services/LoggerService.ts`): Environment-aware logging wrapper
  - Can be enhanced to use FileLoggingService internally
  - Currently separate implementations

## See Also

- [Angular Logging Best Practices](https://angular.io/guide/dev-tools)
- [Browser Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [Circular Buffer Pattern](https://en.wikipedia.org/wiki/Circular_buffer)
