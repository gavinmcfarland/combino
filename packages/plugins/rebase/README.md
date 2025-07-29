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

These paths are calculated relative to the final output location, but template authors want to write clean, root-relative paths.

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

The rebase plugin works with any file format that supports EJS templating, not just `.ejs` files.

### How It Works

During rendering, `rebase()` calculates the correct relative path from the final output location to the specified path and returns a string suitable for use in config files.

## Installation

```bash
npm install @combino/plugin-rebase
```

## Usage

### Basic Usage

```javascript
import rebasePlugin from '@combino/plugin-rebase';

const combino = new Combino();
await combino.build({
    outputDir: 'examples/basic',
    include: ['frameworks/typescript'],
    plugins: [rebasePlugin()],
});
```

### With Options

```javascript
import rebasePlugin from '@combino/plugin-rebase';

const combino = new Combino();
await combino.build({
    outputDir: 'examples/basic',
    include: ['frameworks/typescript'],
    plugins: [
        rebasePlugin({
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
rebasePlugin({ pathType: 'cwd' });

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

### Example 3: Different Path Types in Different Scenarios

You can configure different path types for different use cases:

```javascript
// For TypeScript config (use cwd for project-relative paths)
const tsConfigPlugin = rebasePlugin({ pathType: 'cwd' });

// For import statements (use relative for file-relative paths)
const importPlugin = rebasePlugin({ pathType: 'relative' });

// For build tools (use absolute for full paths)
const buildPlugin = rebasePlugin({ pathType: 'absolute' });

const combino = new Combino();
await combino.build({
    outputDir: 'examples/basic',
    include: ['frameworks/typescript'],
    plugins: [tsConfigPlugin, importPlugin, buildPlugin],
});
```

**Template:** `frameworks/typescript/tsconfig.json`

```json
{
    "compilerOptions": {
        "typeRoots": ["<%= rebase('node_modules/@types') %>"], // cwd: "node_modules/@types"
        "baseUrl": "<%= rebase('.') %>" // cwd: "."
    },
    "include": [
        "<%= rebase('src/**/*.ts') %>" // cwd: "src/**/*.ts"
    ]
}
```

**Template:** `frameworks/typescript/src/main.ts`

```typescript
import { config } from '<%= rebase('../utils/config') %>'; // relative: "../utils/config"
import { helper } from '<%= rebase('../../shared/helper') %>'; // relative: "../../shared/helper"
```

**Template:** `frameworks/typescript/build.config.js`

```javascript
module.exports = {
  input: '<%= rebase('src/main.ts') %>', // absolute: "/Users/gavin/project/src/main.ts"
  output: '<%= rebase('dist/bundle.js') %>' // absolute: "/Users/gavin/project/dist/bundle.js"
};
```

### Example 4: Function Override in Action

Here's a practical example showing how to use function overrides in a single template file:

**Template:** `frameworks/typescript/mixed-config.json`

```json
{
    "compilerOptions": {
        "typeRoots": ["<%= rebase('node_modules/@types') %>"], // Uses global pathType
        "baseUrl": "<%= rebase('.', 'cwd') %>" // Forces cwd path type
    },
    "include": [
        "<%= rebase('src/**/*.ts', 'relative') %>" // Forces relative path type
    ],
    "exclude": [
        "<%= rebase('node_modules', 'absolute') %>" // Forces absolute path type
    ],
    "build": {
        "input": "<%= rebase('src/main.ts', 'cwd') %>",
        "output": "<%= rebase('dist/bundle.js', 'absolute') %>"
    }
}
```

**Output:** `examples/basic/mixed-config.json`

```json
{
    "compilerOptions": {
        "typeRoots": ["node_modules/@types"], // Global setting (cwd)
        "baseUrl": "." // Forced cwd
    },
    "include": [
        "../../src/**/*.ts" // Forced relative
    ],
    "exclude": [
        "/Users/gavin/project/node_modules" // Forced absolute
    ],
    "build": {
        "input": "src/main.ts", // Forced cwd
        "output": "/Users/gavin/project/dist/bundle.js" // Forced absolute
    }
}
```

This demonstrates how you can mix different path types in the same file based on your specific needs.

### Example 1: TypeScript Configuration

**Template:** `frameworks/typescript/tsconfig.json`

```json
{
    "compilerOptions": {
        "typeRoots": ["<%= rebase('node_modules/@types') %>"],
        "baseUrl": "<%= rebase('.') %>"
    },
    "include": ["<%= rebase('src/**/*.ts') %>", "<%= rebase('vite-env.d.ts') %>"]
}
```

**Output:** `examples/basic/src/main/tsconfig.json`

```json
{
    "compilerOptions": {
        "typeRoots": ["../../node_modules/@types"],
        "baseUrl": "."
    },
    "include": ["**/*.ts", "../vite-env.d.ts"]
}
```

### Example 2: Vite Configuration

**Template:** `frameworks/vue/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '<%= rebase('src') %>')
    }
  }
})
```

**Output:** `examples/vue-basic/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
```

## API

### rebase(path: string, pathType?: string): string

Calculates the path from the final output location to the specified path.

- **path**: The target path (can be absolute or relative to project root)
- **pathType**: Optional path type override ('cwd', 'relative', 'absolute'). If not provided, uses the global plugin setting.
- **returns**: A path string suitable for use in configuration files

### Plugin Options

- **baseDir**: Optional base directory for relative calculations (default: output directory)
- **normalize**: Whether to normalize paths (default: true)
- **pathType**: Type of path to output (default: "relative")
    - `"cwd"`: Path relative to `process.cwd()` (e.g., `src/`)
    - `"relative"`: Path relative to the file using the path (e.g., `./src` or `../src`)
    - `"absolute"`: Full absolute path (e.g., `/Users/gavin/project/src/`)

## How It Works

1. **Path Resolution**: The plugin resolves the target path relative to the project root
2. **Output Location**: Determines the final output location of the current file
3. **Relative Calculation**: Calculates the relative path from output location to target path
4. **Path Normalization**: Normalizes the resulting path for cross-platform compatibility

## Supported Template Engines

This plugin works with any template engine that supports function calls, including:

- EJS
- ETA
- EJS-Mate
- Edge

## License

MIT
