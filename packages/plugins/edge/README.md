# @combino/plugin-edge

Edge.js template engine plugin for Combino.

## Installation

```bash
npm install @combino/plugin-edge
```

## Usage

```javascript
import { createCombino } from 'combino';
import edgePlugin from '@combino/plugin-edge';

const combino = createCombino({
    plugins: [edgePlugin()],
});

// Use with your templates
await combino.generate({
    templates: ['my-template'],
    outputDir: './output',
});
```

## Features

- Processes Edge.js templates with `@if`, `@each`, `@include`, etc.
- Supports layout functionality with `@layout('layout-name')`
- Automatic layout file resolution with multiple extensions
- Configurable file patterns for processing
- Temporary file management for Edge.js compilation
- Supports all Edge.js features and syntax

## Options

```javascript
edgePlugin({
    patterns: ['*.edge', '*.md', '*.json'], // Files to process
    cache: false, // Disable caching for template processing
    // ... other Edge.js options
});
```

## Layout Support

Use explicit layouts in your templates:

```edge
@layout('base')
<h1>Hello {{ name }}</h1>
```

The plugin will automatically find layout files with extensions: `.edge`, `.md`, `.html`, `.txt`.

## License

MIT
