# Multi-Engine Template Support

Combino now supports using multiple template engines simultaneously! This allows you to use different template engines for different files based on file patterns or content detection.

## Features

- **File Pattern Matching**: Route files to specific engines based on file extensions or patterns
- **Content-Based Detection**: Automatically detect the appropriate engine based on template syntax
- **Priority System**: Control which engine takes precedence when multiple engines could handle a file
- **Fallback Engine**: Specify a default engine for files that don't match any patterns
- **Backward Compatibility**: All existing single-engine usage continues to work

## Usage Examples

### 1. File Pattern-Based Routing

```javascript
import { Combino } from "combino";

const combino = new Combino({
    engines: [
        {
            engine: "ejs",
            patterns: ["*.ejs", "*.ejs.*"],
            priority: 10,
        },
        {
            engine: "handlebars",
            patterns: ["*.hbs", "*.handlebars", "*.hbs.*"],
            priority: 10,
        },
        {
            engine: "mustache",
            patterns: ["*.mustache", "*.ms", "*.mustache.*"],
            priority: 10,
        },
    ],
    defaultEngine: "ejs", // Fallback for unmatched files
});
```

### 2. Content-Based Detection

```javascript
const combino = new Combino({
    engines: [
        { engine: "ejs", priority: 5 },
        { engine: "handlebars", priority: 5 },
        { engine: "mustache", priority: 5 },
    ],
    defaultEngine: "ejs",
});
```

### 3. Mixed Pattern and Content Detection

```javascript
const combino = new Combino({
    engines: [
        {
            engine: "ejs",
            patterns: ["*.ejs", "*.js"], // Force EJS for these patterns
            priority: 10,
        },
        {
            engine: "handlebars",
            // No patterns - will be used for content detection
            priority: 5,
        },
    ],
    defaultEngine: "ejs",
});
```

### 4. Using Engine Instances Directly

```javascript
import { EJSTemplateEngine, HandlebarsTemplateEngine } from "combino";

const combino = new Combino({
    engines: [
        {
            engine: new EJSTemplateEngine(),
            patterns: ["*.ejs"],
        },
        {
            engine: new HandlebarsTemplateEngine(),
            patterns: ["*.hbs"],
        },
    ],
});
```

### 5. Backward Compatibility

All existing usage patterns continue to work:

```javascript
// Single engine by name
const combino1 = new Combino("ejs");

// Single engine instance
const combino2 = new Combino(new EJSTemplateEngine());

// Set engine in combine options
await combino.combine({
    outputDir: "./output",
    include: ["./templates"],
    templateEngine: "handlebars", // Single engine
    data: { name: "World" },
});
```

## Configuration Options

### EngineConfig

```typescript
interface EngineConfig {
    /** Template engine to use (string name or engine instance) */
    engine: string | TemplateEngine;
    /** File patterns this engine should handle (e.g., ["*.ejs", "*.hbs"]) */
    patterns?: string[];
    /** Priority - higher numbers take precedence */
    priority?: number;
}
```

### MultiTemplateEngineConfig

```typescript
interface MultiTemplateEngineConfig {
    /** Array of template engine configurations */
    engines: EngineConfig[];
    /** Default engine to use when no specific engine matches */
    defaultEngine?: string | TemplateEngine;
}
```

## How It Works

1. **Pattern Matching**: When a file is processed, the system first checks if its path matches any configured patterns
2. **Content Detection**: If no pattern matches, the system checks each engine's `hasTemplateSyntax()` method
3. **Priority Resolution**: If multiple engines could handle a file, the one with the highest priority is chosen
4. **Fallback**: If no engine matches, the default engine is used (if specified)

## Pattern Matching

Patterns use simple glob syntax:

- `*.ejs` - Files with .ejs extension
- `*.ejs.*` - Files that start with .ejs and have additional extensions
- `template.*` - Files that start with "template."
- `*.{ejs,hbs}` - Files with either .ejs or .hbs extension

## Supported Engines

- **EJS**: `<%= variable %>`, `<% code %>`
- **Handlebars**: `{{variable}}`, `{{#if condition}}...{{/if}}`
- **Mustache**: `{{variable}}`, `{{#condition}}...{{/condition}}`

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

## Best Practices

1. **Use patterns for clear file organization**: Assign specific engines to file extensions
2. **Set appropriate priorities**: Higher priority engines should be more specific
3. **Provide a default engine**: Ensures all files can be processed
4. **Test your configuration**: Verify that files are routed to the correct engines
5. **Consider performance**: Content detection is slower than pattern matching
