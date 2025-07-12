# Combino Plugins

Combino uses a powerful plugin system to process templates and transform files. This document covers all available plugins and how to use them.

## Installation

Install the plugins you need:

```bash
# Install individual plugins
npm install @combino/plugin-ejs
npm install @combino/plugin-eta
npm install @combino/plugin-edge
npm install @combino/plugin-ejs-mate
npm install @combino/plugin-strip-ts

# Or install all plugins
npm install @combino/plugin-ejs @combino/plugin-eta @combino/plugin-edge @combino/plugin-ejs-mate @combino/plugin-strip-ts
```

## Usage

Import and use plugins in your Combino configuration:

```javascript
import { createCombino } from 'combino';
import ejsPlugin from '@combino/plugin-ejs';
import etaPlugin from '@combino/plugin-eta';
import edgePlugin from '@combino/plugin-edge';
import ejsMatePlugin from '@combino/plugin-ejs-mate';
import stripTSPlugin from '@combino/plugin-strip-ts';

const combino = createCombino({
    plugins: [ejsPlugin(), etaPlugin(), edgePlugin(), ejsMatePlugin(), stripTSPlugin()],
});

await combino.generate({
    templates: ['my-template'],
    outputDir: './output',
    data: {
        name: 'My Project',
        framework: 'react',
    },
});
```

## Plugin Details

### @combino/plugin-ejs

EJS template engine plugin for processing EJS templates.

**Features:**

- Processes EJS templates with `<%`, `<%=`, and `<%-` syntax
- Automatically strips YAML front matter before processing
- Only processes files that contain EJS syntax
- Supports all EJS options

**Options:**

```javascript
ejsPlugin({
    delimiter: '%',
    debug: false,
    compileDebug: true,
});
```

**Example Template:**

```ejs
---
title: <%= name %>
---

<h1>Hello <%= name %></h1>
<% if (framework === 'react') { %>
  <p>This is a React project</p>
<% } %>
```

### @combino/plugin-eta

ETA template engine plugin with layout support.

**Features:**

- Processes ETA templates with `<%`, `<%=`, and `<%-` syntax
- Supports layout functionality with `<% layout('layout-name') %>`
- Automatic layout file resolution
- Configurable file patterns

**Options:**

```javascript
etaPlugin({
    patterns: ['*.eta', '*.md', '*.html'],
    autoEscape: true,
    autoTrim: false,
});
```

**Example Template:**

```eta
<% layout('base') %>
<h1>Hello <%= name %></h1>
```

**Layout File:**

```eta
<!DOCTYPE html>
<html>
<head>
  <title><%= title %></title>
</head>
<body>
  <%- body %>
</body>
</html>
```

### @combino/plugin-edge

Edge.js template engine plugin.

**Features:**

- Processes Edge.js templates with `@if`, `@each`, `@include`, etc.
- Supports layout functionality with `@layout('layout-name')`
- Temporary file management for Edge.js compilation
- Configurable file patterns

**Options:**

```javascript
edgePlugin({
    patterns: ['*.edge', '*.md', '*.json'],
    cache: false,
});
```

**Example Template:**

```edge
@layout('base')
<h1>Hello {{ name }}</h1>
@if(framework === 'react')
  <p>This is a React project</p>
@endif
```

### @combino/plugin-ejs-mate

Advanced EJS plugin with layout and block support.

**Features:**

- Full EJS template processing
- Advanced layout system (explicit and dynamic)
- Block system for content injection
- Support for multiple layout directories
- Automatic layout file resolution

**Options:**

```javascript
ejsMatePlugin({
    patterns: ['*'],
    delimiter: '%',
    debug: false,
});
```

**Example Template:**

```ejs
<% layout('base') %>

<% block('title') %>
  Default Title
<% end %>

<% block('content') %>
  <h1>Hello <%= name %></h1>
<% end %>
```

**Layout File:**

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

**Configuration:**

```json
{
    "layout": ["./layouts", "../shared/layouts"]
}
```

### @combino/plugin-strip-ts

TypeScript stripping plugin.

**Features:**

- Automatically strips TypeScript syntax from `.ts`, `.tsx`, `.vue`, and `.svelte` files
- Converts TypeScript files to JavaScript (`.ts` → `.js`, `.tsx` → `.jsx`)
- Detects TypeScript syntax patterns
- Graceful fallback when `strip-ts` package is not available

**Options:**

```javascript
stripTSPlugin({
    skip: false, // Set to true to disable TypeScript stripping
});
```

**Dependencies:**

```bash
npm install strip-ts
```

**Supported Conversions:**

- `.ts` → `.js`
- `.tsx` → `.jsx`
- `.vue` (strips TypeScript, keeps Vue syntax)
- `.svelte` (strips TypeScript, keeps Svelte syntax)

## Plugin Hooks

All plugins implement the Combino plugin interface with these hooks:

- **`discover`**: Processes files before template resolution
- **`compile`**: Processes individual template files before merging
- **`assemble`**: Processes files after merging but before formatting
- **`output`**: Processes files after they have been written to disk

## Creating Custom Plugins

Create your own plugins by implementing the Plugin interface:

```javascript
export function myPlugin(options = {}) {
    return {
        compile: async (context) => {
            // Process the file content
            const processedContent = processContent(context.content);
            return { content: processedContent, id: context.id };
        },

        assemble: async (context) => {
            // Process after merging
            return { content: context.content, id: context.id };
        },
    };
}
```

## Best Practices

1. **Use specific plugins**: Only include the plugins you need for your templates
2. **Configure patterns**: Use file patterns to limit which files each plugin processes
3. **Order matters**: Plugins are processed in the order they're provided
4. **Error handling**: Plugins should handle errors gracefully and provide fallbacks
5. **Performance**: Consider the performance impact of multiple plugins

## Troubleshooting

### Plugin not processing files

- Check that the file patterns match your files
- Verify the plugin is included in the plugins array
- Check for syntax errors in your templates

### Layout not found

- Ensure layout files exist in the expected locations
- Check that layout file extensions are supported
- Verify layout directory configuration

### TypeScript stripping not working

- Install the `strip-ts` package: `npm install strip-ts`
- Check that files have the correct extensions
- Verify TypeScript syntax is present in the files
