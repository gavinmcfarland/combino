# Template Engines

Combino now supports configurable template engines, allowing you to use different templating syntaxes based on your preferences or project requirements.

## Available Template Engines

### EJS (Default)

- **Syntax**: `<%= variable %>`, `<% code %>`
- **Example**: `<%= name %>`
- **CLI Option**: `--template-engine ejs`

### Handlebars

- **Syntax**: `{{variable}}`, `{{#if condition}}...{{/if}}`
- **Example**: `{{name}}`
- **CLI Option**: `--template-engine handlebars`
- **Note**: Requires `handlebars` package to be installed

### Mustache

- **Syntax**: `{{variable}}`, `{{#condition}}...{{/condition}}`
- **Example**: `{{name}}`
- **CLI Option**: `--template-engine mustache`
- **Note**: Requires `mustache` package to be installed

## Usage

### CLI Usage

```bash
# Use EJS (default)
combino templates --data name=my-project

# Use Handlebars
combino templates --template-engine handlebars --data name=my-project

# Use Mustache
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

// Use Handlebars
const combino = new Combino(new HandlebarsTemplateEngine());

// Or pass via options
await combino.combine({
    outputDir: "./output",
    templates: ["templates"],
    templateEngine: "ejs", // or 'handlebars', 'mustache'
});
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
