# Combino

![npm](https://img.shields.io/npm/v/combino)

Combino is a composable scaffolding engine that lets you build fully customised project structures by combining modular template folders with smart deep merging, dynamic conditions, and reusable logic.

## Features

- **Dynamic Naming**: Use placeholders in filenames to rename them dynamically.
- **Conditional Inclusion**: Files and folders can be conditionally included using JavaScript expressions.
- **Template Inclusion**: Compose templates with dynamic paths and target mapping.
- **Template Exclusion**: Exclude files and folders from being processed using glob patterns.
- **Merging Strategies**: Sepcify specific merging strategies per file or file type.
- **Templating Engines**: Supports optional template engines for file content processing.
- **CLI or JavaScript API**: Use via the CLI or JavaScript API.

## Installation

Add the npm package to your project.

```bash
npm install combino
```

## CLI Usage

`combino [templates...] [options]`

### Arguments

- **`templates...`** { String } One or more paths to template folders (first has lowest priority, last wins)

### Options

- **`-o, --output <dir>`**: Output directory (default: ./output)
- **`-c, --config <path>`**: Path to .combino config file
- **`--data <key=value>`** Inline key-value data
- **`--template-engine <engine>`** Template engine to use (ejs, handlebars, mustache) - requires installing the corresponding dependency
- **`--merge <pattern=strategy>`** Merge strategy for file patterns (e.g., _.json=deep, _.md=replace)

## JavaScript API Usage

```js
import { Combino } from "combino";
import { EJSTemplateEngine } from "combino/template-engines";

// Use EJS (requires: npm install ejs)
const combinoEjs = new Combino(new EJSTemplateEngine());

// Or pass via options
await combino.combine({
    outputDir: "./output",
    templates: ["templates"],
    templateEngine: "ejs", // or 'handlebars', 'mustache'
});
```

### Type Signature

```ts
interface TemplateOptions {
    outputDir: string;
    templates: string[];
    config?: CombinoConfig | string;
    data?: Record<string, any>;
    templateEngine?: string;
}

interface CombinoConfig {
    include?: Array<{ source: string; target?: string }>;
    exclude?: string[];
    data?: Record<string, any>;
    merge?: Record<string, Record<string, any>>;
}
```
