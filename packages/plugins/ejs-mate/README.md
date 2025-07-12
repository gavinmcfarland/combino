# @combino/plugin-ejs-mate

EJS-Mate template engine plugin for Combino with advanced layout and block support.

## Installation

```bash
npm install @combino/plugin-ejs-mate
```

## Usage

```javascript
import { createCombino } from 'combino';
import ejsMatePlugin from '@combino/plugin-ejs-mate';

const combino = createCombino({
    plugins: [ejsMatePlugin()],
});

// Use with your templates
await combino.generate({
    templates: ['my-template'],
    outputDir: './output',
});
```

## Features

- Full EJS template processing with `<%`, `<%=`, and `<%-` syntax
- Advanced layout system with explicit and dynamic layouts
- Block system for content injection and manipulation
- Support for multiple layout directories
- Automatic layout file resolution with multiple extensions
- Configurable file patterns for processing
- Supports all EJS options and features

## Options

```javascript
ejsMatePlugin({
    patterns: ['*'], // Files to process
    delimiter: '%',
    debug: false,
    // ... other EJS options
});
```

## Layout Support

### Explicit Layouts

Use explicit layouts in your templates:

```ejs
<% layout('base') %>
<h1>Hello <%= name %></h1>
```

### Dynamic Layouts

Configure layout directories in your `combino.json`:

```json
{
    "layout": ["./layouts", "../shared/layouts"]
}
```

The plugin will automatically find layout files with the same name as the current file.

### Block System

Define blocks in your templates:

```ejs
<% block('title') %>
  Default Title
<% end %>

<% block('content') %>
  <h1>Hello <%= name %></h1>
<% end %>
```

And use them in layouts:

```ejs
<!DOCTYPE html>
<html>
<head>
  <title><%= block('title') %></title>
</head>
<body>
  <%- body %>
  <%- block('content') %>
</body>
</html>
```

## License

MIT
