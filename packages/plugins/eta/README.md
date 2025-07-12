# @combino/plugin-eta

ETA template engine plugin for Combino.

## Installation

```bash
npm install @combino/plugin-eta
```

## Usage

```javascript
import { createCombino } from 'combino';
import etaPlugin from '@combino/plugin-eta';

const combino = createCombino({
    plugins: [etaPlugin()],
});

// Use with your templates
await combino.generate({
    templates: ['my-template'],
    outputDir: './output',
});
```

## Features

- Processes ETA templates with `<%`, `<%=`, and `<%-` syntax
- Supports layout functionality with `<% layout('layout-name') %>`
- Automatic layout file resolution with multiple extensions
- Configurable file patterns for processing
- Supports all ETA options and features

## Options

```javascript
etaPlugin({
    patterns: ['*.eta', '*.md', '*.html'], // Files to process
    autoEscape: true,
    autoTrim: false,
    // ... other ETA options
});
```

## Layout Support

Use explicit layouts in your templates:

```eta
<% layout('base') %>
<h1>Hello <%= name %></h1>
```

The plugin will automatically find layout files with extensions: `.eta`, `.ejs`, `.md`, `.html`, `.txt`.

## License

MIT
