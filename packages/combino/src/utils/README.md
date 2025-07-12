# Test Utilities

This directory contains utility functions for testing.

## Directory Comparison

The `directory-compare.ts` module provides utilities to compare directories recursively.

### Usage

```typescript
import { assertDirectoriesEqual, compareDirectories } from '../utils/directory-compare.js';

// Simple assertion - throws error if directories differ
assertDirectoriesEqual(outputDir, expectedDir);

// Detailed comparison with options
const result = compareDirectories(outputDir, expectedDir, {
    ignoreLineEndings: true,
    ignoreWhitespace: true,
    textExtensions: ['.json', '.md', '.txt'],
});

if (!result.identical) {
    console.log('Differences found:', result.differences);
}
```

### Options

- `ignoreExtensions`: Whether to ignore file extensions when comparing
- `ignoreLineEndings`: Whether to normalize line endings (CRLF vs LF)
- `ignoreWhitespace`: Whether to trim whitespace from text files
- `textExtensions`: Custom list of file extensions to treat as text files
- `ignoreFiles`: Files to ignore (glob patterns)

### Example Test Pattern

```typescript
describe('My Test Suite', () => {
    const testDir = __dirname;
    const outputDir = join(testDir, 'output');
    const expectedDir = join(testDir, 'expected');

    beforeAll(async () => {
        // Clean up and run your tool
        try {
            rmSync(outputDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore if directory doesn't exist
        }

        // Run your tool here
        await yourTool.generate(outputDir);
    });

    it('should generate expected output', () => {
        assertDirectoriesEqual(outputDir, expectedDir);
    });
});
```
