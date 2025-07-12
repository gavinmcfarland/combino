# @combino/plugin-strip-ts

TypeScript stripping plugin for Combino.

## Installation

```bash
npm install @combino/plugin-strip-ts
```

## Usage

```javascript
import { createCombino } from 'combino';
import stripTSPlugin from '@combino/plugin-strip-ts';

const combino = createCombino({
    plugins: [stripTSPlugin()],
});

// Use with your templates
await combino.generate({
    templates: ['my-template'],
    outputDir: './output',
});
```

## Features

- Automatically strips TypeScript syntax from `.ts`, `.tsx`, `.vue`, and `.svelte` files
- Converts TypeScript files to JavaScript (`.ts` → `.js`, `.tsx` → `.jsx`)
- Detects TypeScript syntax patterns for selective processing
- Graceful fallback when `strip-ts` package is not available
- Configurable to skip processing when needed
- Excludes `vite-env.d.ts` files from processing

## Options

```javascript
stripTSPlugin({
    skip: false, // Set to true to disable TypeScript stripping
});
```

## Supported File Types

- `.ts` → `.js`
- `.tsx` → `.jsx`
- `.vue` (strips TypeScript, keeps Vue syntax)
- `.svelte` (strips TypeScript, keeps Svelte syntax)

## TypeScript Syntax Detection

The plugin detects TypeScript syntax including:

- Type annotations (`: string`, `: number`, etc.)
- Interface and type declarations
- Generic types (`<T>`, `<T, U>`)
- Access modifiers (`public`, `private`, `protected`)
- Type assertions (`as`, `satisfies`)
- Optional and non-null operators (`?.`, `!`, `??`)

## Dependencies

This plugin requires the `strip-ts` package for full functionality:

```bash
npm install strip-ts
```

If `strip-ts` is not available, the plugin will log a warning and skip processing.

## License

MIT
