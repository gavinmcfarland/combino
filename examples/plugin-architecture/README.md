# Plugin Architecture

Combino now supports a flexible plugin architecture for template engines! This new system provides a cleaner, more intuitive way to configure template engines with their own options.

## Features

- **Plugin Factory Functions**: Simple functions like `ejsPlugin()`, `handlebarsPlugin()`, `mustachePlugin()` that create configured plugins
- **Pattern-Based Routing**: Specify which file patterns each plugin should handle
- **Priority System**: Control which plugin takes precedence when multiple plugins could handle a file
- **Custom Options**: Each plugin can have its own configuration options
- **Backward Compatibility**: All existing template engine usage continues to work
- **Content-Based Detection**: Automatically detect the appropriate plugin based on template syntax

## Basic Usage

### Using Plugin Factory Functions

```javascript
import { Combino } from "combino";
import { ejsPlugin, handlebarsPlugin, mustachePlugin } from "combino/plugins";

const combino = new Combino();

await combino.combine({
    outputDir: "./output",
    include: ["./templates"],
    plugins: [
        ejsPlugin(), // Use EJS for all files
        handlebarsPlugin({
            patterns: ["*.hbs", "*.handlebars"], // Use Handlebars for specific patterns
        }),
        mustachePlugin({
            patterns: ["*.mustache", "*.ms"],
            priority: 10, // Higher priority
        }),
    ],
    data: { name: "World" },
});
```

### Pattern-Based Routing

```javascript
await combino.combine({
    outputDir: "./output",
    include: ["./templates"],
    plugins: [
        ejsPlugin({ patterns: ["*.ejs", "*.js"] }),
        handlebarsPlugin({ patterns: ["*.hbs"] }),
        mustachePlugin({ patterns: ["*.mustache"] }),
    ],
    data: { name: "World" },
});
```

### Content-Based Detection

```javascript
await combino.combine({
    outputDir: "./output",
    include: ["./templates"],
    plugins: [
        ejsPlugin({ priority: 5 }),
        handlebarsPlugin({ priority: 5 }),
        mustachePlugin({ priority: 5 }),
    ],
    data: { name: "World" },
});
```

## Plugin Options

Each plugin can be configured with the following options:

```typescript
interface PluginOptions {
    /** File patterns this plugin should handle (e.g., ["*.ejs", "*.hbs"]) */
    patterns?: string[];
    /** Priority - higher numbers take precedence */
    priority?: number;
    /** Additional options specific to the plugin */
    [key: string]: any;
}
```

### Examples

```javascript
// EJS plugin with custom options
ejsPlugin({
    patterns: ["*.ejs", "*.js"],
    priority: 10,
    customOption: "value",
});

// Handlebars plugin with specific patterns
handlebarsPlugin({
    patterns: ["*.hbs", "*.handlebars"],
    priority: 5,
});

// Mustache plugin with high priority
mustachePlugin({
    patterns: ["*.mustache", "*.ms"],
    priority: 15,
});
```

## Available Plugins

### EJS Plugin

```javascript
import { ejsPlugin } from "combino/plugins";

ejsPlugin(options?: PluginOptions)
```

### Handlebars Plugin

```javascript
import { handlebarsPlugin } from "combino/plugins";

handlebarsPlugin(options?: PluginOptions)
```

### Mustache Plugin

```javascript
import { mustachePlugin } from "combino/plugins";

mustachePlugin(options?: PluginOptions)
```

## How It Works

1. **Pattern Matching**: When a file is processed, the system first checks if its path matches any configured patterns
2. **Content Detection**: If no pattern matches, the system checks each plugin's template syntax detection
3. **Priority Resolution**: If multiple plugins could handle a file, the one with the highest priority is chosen
4. **Fallback**: If no plugin matches, the file is left as-is (no template processing)

## Pattern Matching

Patterns use simple glob syntax:

- `*.ejs` - Files with .ejs extension
- `*.ejs.*` - Files that start with .ejs and have additional extensions
- `template.*` - Files that start with "template."
- `*.{ejs,hbs}` - Files with either .ejs or .hbs extension

## Backward Compatibility

All existing usage patterns continue to work:

```javascript
// Single engine by name
await combino.combine({
    outputDir: "./output",
    include: ["./templates"],
    templateEngine: "ejs", // Legacy support
    data: { name: "World" },
});

// Single engine instance
await combino.combine({
    outputDir: "./output",
    include: ["./templates"],
    templateEngine: new EJSTemplateEngine(), // Legacy support
    data: { name: "World" },
});

// Multi-engine configuration
await combino.combine({
    outputDir: "./output",
    include: ["./templates"],
    templateEngine: {
        // Legacy multi-engine support
        engines: [
            { engine: "ejs", patterns: ["*.ejs"] },
            { engine: "handlebars", patterns: ["*.hbs"] },
        ],
        defaultEngine: "ejs",
    },
    data: { name: "World" },
});
```

## Migration from Template Engine System

### Before (Template Engine System)

```javascript
const combino = new Combino({
    engines: [
        { engine: "ejs", patterns: ["*.ejs"] },
        { engine: "handlebars", patterns: ["*.hbs"] },
    ],
    defaultEngine: "ejs",
});
```

### After (Plugin Architecture)

```javascript
const combino = new Combino();

await combino.combine({
    outputDir: "./output",
    include: ["./templates"],
    plugins: [
        ejsPlugin({ patterns: ["*.ejs"] }),
        handlebarsPlugin({ patterns: ["*.hbs"] }),
    ],
    data: { name: "World" },
});
```

## Benefits of Plugin Architecture

1. **Cleaner API**: Plugin factory functions are more intuitive than configuration objects
2. **Better TypeScript Support**: Each plugin can have its own typed options
3. **Extensibility**: Easy to add new plugins with custom options
4. **Separation of Concerns**: Template engine configuration is separate from Combino configuration
5. **Reusability**: Plugin configurations can be easily shared and reused
6. **Self-Contained**: Each plugin contains all its own logic and dependencies

## Best Practices

1. **Use patterns for clear organization**: Assign specific plugins to file extensions
2. **Set appropriate priorities**: Higher priority plugins should be more specific
3. **Group related patterns**: Keep similar file types together
4. **Test your configuration**: Verify that files are routed to the correct plugins
5. **Consider performance**: Content detection is slower than pattern matching

## Example Template Files

### EJS Template (template.ejs)

```ejs
Hello <%= name %>!
<% items.forEach(function(item) { %>
  - <%= item %>
<% }); %>
```

### Handlebars Template (template.hbs)

```handlebars
Hello
{{name}}!
{{#each items}}
    -
    {{this}}
{{/each}}
```

### Mustache Template (template.mustache)

```mustache
Hello {{name}}!
{{#items}}
  - {{.}}
{{/items}}
```
