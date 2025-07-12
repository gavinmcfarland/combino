# @combino/plugin-ejs

EJS template engine plugin for Combino.

## Installation

```bash
npm install @combino/plugin-ejs
```

## Usage

```javascript
import { createCombino } from 'combino';
import ejsPlugin from '@combino/plugin-ejs';

const combino = createCombino({
    plugins: [ejsPlugin()],
});

// Use with your templates
await combino.generate({
    templates: ['my-template'],
    outputDir: './output',
});
```

## Features

- Processes EJS templates with `<%`, `<%=`, and `<%-` syntax
- Automatically strips YAML front matter before processing
- Supports all EJS options and features
- Only processes files that contain EJS syntax

## Options

The plugin accepts all standard EJS options:

```javascript
ejsPlugin({
    delimiter: '?',
    debug: false,
    compileDebug: true,
    // ... other EJS options
});
```

## License

MIT
