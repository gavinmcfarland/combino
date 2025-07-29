# @combino/plugin-rebase

A Combino plugin that provides a `rebase()` function for handling relative paths in configuration files during template scaffolding.

## Problem

When scaffolding projects, configuration files often contain relative paths that must remain valid after the files are moved to their final location. For example:

```json
{
    "typeRoots": ["../../node_modules/@types"],
    "include": ["../vite-env.d.ts"]
}
```

Hardcoding relative paths can lead to incorrect references if the file is moved, since the paths may no longer point to the intended locations. Template authors want to write paths that remain correct regardless of where the file ends up.

## Solution

The rebase plugin provides a `rebase()` function that automatically calculates the correct relative path from the final output location to a given path.

### Template Usage

Template authors write clean, root-relative paths in any file format:

```json
{
    "typeRoots": ["<%= rebase('node_modules/@types') %>"],
    "include": ["<%= rebase('vite-env.d.ts') %>"]
}
```

### How It Works

During rendering, `rebase()` calculates the correct relative path from the final output location to the specified path and returns a string suitable for use in config files.

## Installation

```bash
npm install @combino/plugin-rebase
```

## Usage

### Basic Usage

```javascript
import rebase from '@combino/plugin-rebase';

const combino = new Combino();
await combino.build({
    outputDir: 'examples/basic',
    include: ['frameworks/typescript'],
    plugins: [rebase()],
});
```

### With Options

```javascript
import rebase from '@combino/plugin-rebase';

const combino = new Combino();
await combino.build({
    outputDir: 'examples/basic',
    include: ['frameworks/typescript'],
    plugins: [
        rebase({
            baseDir: 'src', // Optional: base directory for relative calculations
            normalize: true, // Optional: normalize paths (default: true)
            pathType: 'cwd', // Optional: path type - "cwd", "relative", or "absolute"
        }),
    ],
});
```

## Examples

### Path Type Examples

The `pathType` option controls how paths are calculated. You can set it globally in the plugin options or override it per function call:

```javascript
// Example: File at examples/basic/src/main/tsconfig.json
// Target: node_modules/@types

// Global plugin option (affects all rebase() calls)
rebase({ pathType: 'cwd' });

// Per-function override (overrides the global setting)
rebase('node_modules/@types'); // Uses global pathType
rebase('node_modules/@types', 'cwd'); // → "node_modules/@types"
rebase('node_modules/@types', 'relative'); // → "../../../../node_modules/@types"
rebase('src', 'relative'); // → "./src" (note the ./ prefix)
rebase('node_modules/@types', 'absolute'); // → "/Users/gavin/project/node_modules/@types"
```

**When to use each type:**

- **`cwd`**: When you want paths relative to the project root (good for most config files)
- **`relative`**: When you need paths relative to the specific file location (good for imports). **Note**: Relative paths automatically include `./` prefix when appropriate (e.g., `./src` instead of `src`)
- **`absolute`**: When you need full system paths (rare, but useful for some tools)

### Function Override

You can override the path type for individual `rebase()` calls by passing a second argument:

```javascript
// In your template files:
<%= rebase('src') %>                    // Uses global pathType setting
<%= rebase('src', 'cwd') %>             // Forces cwd path type
<%= rebase('src', 'relative') %>        // Forces relative path type
<%= rebase('src', 'absolute') %>        // Forces absolute path type
```

This is useful when you need different path types for different parts of the same file.

## License

MIT
