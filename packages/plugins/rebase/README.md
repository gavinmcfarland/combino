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
        }),
    ],
});
```

## Examples

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

### rebase(path: string): string

Calculates the relative path from the final output location to the specified path.

- **path**: The target path (can be absolute or relative to project root)
- **returns**: A relative path string suitable for use in configuration files

### Plugin Options

- **baseDir**: Optional base directory for relative calculations (default: output directory)
- **normalize**: Whether to normalize paths (default: true)

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
