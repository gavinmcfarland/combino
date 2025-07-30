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
            format: 'relative', // Optional: path format - "cwd", "relative", or "absolute"
            locate: false, // Optional: whether to find actual file location (default: false)
        }),
    ],
});
```

## Examples

### Path Type Examples

The `format` option controls how paths are calculated. You can set it globally in the plugin options or override it per function call:

```javascript
// Example: File at examples/basic/src/main/tsconfig.json
// Target: node_modules/@types

// Global plugin option (affects all rebase() calls)
rebase({ format: 'relative' });

// Per-function override (overrides the global setting)
rebase('node_modules/@types'); // Uses global format
rebase('node_modules/@types', { format: 'cwd' }); // → "node_modules/@types"
rebase('node_modules/@types', { format: 'relative' }); // → "../../../../node_modules/@types"
rebase('node_modules/@types', { format: 'absolute' }); // → "/Users/gavin/project/node_modules/@types"
```

**When to use each type:**

- **`cwd`**: When you want paths relative to the project root (good for most config files)
- **`relative`**: When you need paths relative to the specific file location (good for imports). **Note**: Relative paths automatically include `./` prefix when appropriate (e.g., `./src` instead of `src`)
- **`absolute`**: When you need full system paths (rare, but useful for some tools)

### Function Override

You can override the path format for individual `rebase()` calls by passing an options object:

```javascript
// In your template files:
<%= rebase('src') %>                    // Uses global format setting
<%= rebase('src', {format: 'cwd'}) %>             // Forces cwd path format
<%= rebase('src', {format: 'relative'}) %>        // Forces relative path format
<%= rebase('src', {format: 'absolute'}) %>        // Forces absolute path format
```

This is useful when you need different path formats for different parts of the same file.

## File Location Method

The `locate` option allows you to find the actual output location of the referenced file or folder and then format the path using any of the standard path types. This is particularly useful when you want to reference files or folders that will be generated in specific locations relative to the current file.

### Function Signature

```javascript
rebase(targetPath, options?)
```

- `targetPath`: The file or folder path to reference
- `options`: Optional object with the following properties:
    - `format`: The path type to use for output (`'cwd'`, `'relative'`, or `'absolute'`)
    - `locate`: Whether to find the actual output location of the file/folder (default: `false`)

### Usage

```javascript
// Standard usage (uses plugin's default pathType)
<%= rebase('vite-env.d.ts') %>

// Specify output format
<%= rebase('vite-env.d.ts', {format: 'cwd'}) %>
<%= rebase('vite-env.d.ts', {format: 'relative'}) %>
<%= rebase('vite-env.d.ts', {format: 'absolute'}) %>

// Find actual file/folder location and return as relative path (default)
<%= rebase('vite-env.d.ts', {locate: true}) %>

// Find actual file/folder location and return as specific format
<%= rebase('vite-env.d.ts', {format: 'absolute', locate: true}) %>
<%= rebase('vite-env.d.ts', {format: 'cwd', locate: true}) %>

// Works with folders too!
<%= rebase('src/components', {locate: true}) %>
<%= rebase('node_modules/@types', {format: 'cwd', locate: true}) %>
<%= rebase('dist', {format: 'absolute', locate: true}) %>
```

### How It Works

The `locate` option:

1. **Finds the source directory**: Looks for a `src` or `source` directory by walking up the directory tree from the current file
2. **Resolves target paths**: Resolves the target path relative to the found source directory
3. **Applies path format**: Formats the result using the specified path format (`cwd`, `relative`, or `absolute`)

### Example

**Project Structure:**

```
/
├── src/
│   └── ui/
│       └── tsconfig.json (will be generated)
└── vite-env.d.ts (will be generated)
```

**Template:** `frameworks/typescript/src/ui/tsconfig.json`

```json
{
    "include": ["<%= rebase('vite-env.d.ts', 'file') %>"]
}
```

**Output:** `examples/basic/src/ui/tsconfig.json`

```json
{
    "include": ["../vite-env.d.ts"]
}
```

**Different path type examples:**

```javascript
rebase('vite-env.d.ts'); // → "../../../../../vite-env.d.ts" (uses plugin default)
rebase('vite-env.d.ts', { format: 'cwd' }); // → "vite-env.d.ts" (cwd-relative)
rebase('vite-env.d.ts', { format: 'absolute' }); // → "/path/to/vite-env.d.ts" (absolute)
rebase('vite-env.d.ts', { locate: true }); // → "../vite-env.d.ts" (finds location, relative)
rebase('vite-env.d.ts', { format: 'absolute', locate: true }); // → "/path/to/examples/basic/src/vite-env.d.ts" (finds location, absolute)

// Folder examples
rebase('src/components', { locate: true }); // → "../src/components" (finds location, relative)
rebase('src/components', { format: 'cwd', locate: true }); // → "examples/basic/src/src/components" (finds location, cwd-relative)
rebase('src/components', { format: 'absolute', locate: true }); // → "/path/to/examples/basic/src/src/components" (finds location, absolute)
```

## Dynamic Paths

The rebase plugin supports dynamic paths using template variables. This allows you to use data from Combino's template system within your `rebase()` calls.

### Example: Dynamic Paths with Template Variables

**Template:** `frameworks/typescript/tsconfig.json`

```json
{
    "compilerOptions": {
        "typeRoots": ["<%= rebase(`${srcDir}/@types`) %>"],
        "baseUrl": "<%= rebase('.') %>"
    },
    "include": [
        "<%= rebase(`${srcDir}/**/*.ts`) %>",
        "<%= rebase(`${srcDir}/**/*.tsx`) %>",
        "<%= rebase('vite-env.d.ts') %>"
    ],
    "exclude": ["<%= rebase(`${buildDir}`) %>"]
}
```

**With data:** `{ srcDir: "src", buildDir: "dist" }`

**Output:** `examples/basic/src/main/tsconfig.json`

```json
{
    "compilerOptions": {
        "typeRoots": ["../../src/@types"],
        "baseUrl": "."
    },
    "include": ["../../src/**/*.ts", "../../src/**/*.tsx", "../vite-env.d.ts"],
    "exclude": ["../../dist"]
}
```

### Example: Mixed Static and Dynamic Paths

**Template:** `frameworks/typescript/package.json`

```json
{
    "scripts": {
        "dev": "vite --config <%= rebase('vite.config.ts') %>",
        "build": "tsc && vite build --config <%= rebase('vite.config.ts') %>",
        "lint": "eslint <%= rebase(`${srcDir}`) %> --ext ts,tsx"
    },
    "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
    }
}
```

**With data:** `{ srcDir: "src" }`

**Output:** `examples/basic/package.json`

```json
{
    "scripts": {
        "dev": "vite --config ./vite.config.ts",
        "build": "tsc && vite build --config ./vite.config.ts",
        "lint": "eslint ./src --ext ts,tsx"
    },
    "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
    }
}
```
