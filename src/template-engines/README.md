# Template Engines

Combino now supports configurable template engines, allowing you to use different templating syntaxes based on your preferences or project requirements.

## Available Template Engines

### EJS (Default)

- **Syntax**: `<%= variable %>`, `<% code %>`
- **Example**: `<%= name %>`
- **CLI Option**: `--template-engine ejs`
- **Dependency**: Included by default

### Handlebars (Optional)

- **Syntax**: `{{variable}}`, `{{#if condition}}...{{/if}}`
- **Example**: `{{name}}`
- **CLI Option**: `--template-engine handlebars`
- **Installation**: `npm install handlebars`

### Mustache (Optional)

- **Syntax**: `{{variable}}`, `{{#condition}}...{{/condition}}`
- **Example**: `{{name}}`
- **CLI Option**: `--template-engine mustache`
- **Installation**: `npm install mustache`

## Installation

### Core Package

```bash
npm install combino
```

### Optional Dependencies

```bash
# For Handlebars support
npm install handlebars

# For Mustache support
npm install mustache
```

## Usage

### CLI Usage

```bash
# Use EJS (default)
combino templates --data name=my-project

# Use Handlebars (requires: npm install handlebars)
combino templates --template-engine handlebars --data name=my-project

# Use Mustache (requires: npm install mustache)
combino templates --template-engine mustache --data name=my-project
```

### Programmatic Usage

```typescript
import { Combino } from "combino";
import {
    EJSTemplateEngine,
    HandlebarsTemplateEngine,
} from "combino/template-engines";

// Use EJS
const combino = new Combino(new EJSTemplateEngine());

// Use Handlebars (requires: npm install handlebars)
const combino = new Combino(new HandlebarsTemplateEngine());

// Or pass via options
await combino.combine({
    outputDir: "./output",
    templates: ["templates"],
    templateEngine: "ejs", // or 'handlebars', 'mustache'
});
```

## Error Handling

If you try to use Handlebars or Mustache without installing the required dependencies, Combino will provide helpful error messages:

```bash
$ combino templates --template-engine handlebars --data name=test
Error: Template engine 'handlebars' is not available.
To use this template engine, please install the required dependency:
  npm install handlebars
```

## Creating Custom Template Engines

You can create custom template engines by implementing the `TemplateEngine` interface:

```typescript
import { TemplateEngine } from "./index.js";

export class CustomTemplateEngine implements TemplateEngine {
    async render(content: string, data: Record<string, any>): Promise<string> {
        // Your template rendering logic here
        return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || match;
        });
    }

    hasTemplateSyntax(content: string): boolean {
        return content.includes("{{");
    }
}
```

## Template Syntax Detection

Each template engine should implement the `hasTemplateSyntax` method to efficiently detect when template processing is needed. This helps avoid unnecessary processing for files that don't contain template syntax.

## Optional Dependencies

Handlebars and Mustache are implemented as optional dependencies to keep the core package lightweight. The template engines use dynamic imports to load the dependencies only when needed, and provide clear error messages if the dependencies are not installed.
