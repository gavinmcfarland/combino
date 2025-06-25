# Combino

![npm](https://img.shields.io/npm/v/combino)

Combino is a composable scaffolding engine that lets you build fully customised project structures by combining modular template folders with smart deep merging, dynamic conditions, and reusable logic.

- [Example](#example)
- [Installation](#installation)
- [Features](#features)
- [Configuration](#configuration)
- [CLI Usage](#cli-usage)
- [Development](#development)
- [Template Engines](#template-engines)

## Example

In this example, we'll look at how we can combine multiple template folders to scaffold a dynamic project based on a framework type.

We start with out template folders and files:

```bash
templates/
    base/
        package.json
        README.md
        src/
            main/
                main.[framework=="react"?"js":"jsx"]
            ui/
                [framework=="react"]App.jsx
                [framework=="svelte"]App.svelte
                styles.css
    svelte/
        svelte.config.js
```

Then combine the templates with dynamic data:

```bash
combino ./templates/base ./templates/svelte --data name=my-svelte-app --data description="A Svelte application" --data framework=svelte
```

This generates:

```bash
output/
    package.json          # Deep merged with templated name, description, and scripts
    README.md             # From base with templating
src/
    main/
        main.js           # Conditional extension based on framework
    ui/
        App.svelte        # Framework-specific file (only for svelte)
        styles.css        # Common file
svelte.config.js          # Unique file copied from svelte template
```

## Installation

Add the npm package to your project.

```bash
npm install -g combino
```

## Features

- ### Dynamic Naming

    Use `[key]` placeholders in filenames to rename them dynamically.

    ```bash
    templates/
      base/
        [name]/
          index.[extension]
    ```

    ```bash
    combino base --data.name=my-plugin --data.extension=ts
    # Output: my-plugin/index.ts
    ```

---

- ### Conditional Inclusion

    Files and folders can be conditionally included using JavaScript expressions.

    ```bash
    templates/
      base/
        tests[testing]/           # Only if --data.testing
          example.test.ts
        [framework=="svelte"]     # Only if framework=svelte
          App.svelte
        [framework=="react"]
          App.tsx
    ```

---

- ### File Content Templating

    Use EJS syntax `<%= %>` inside file contents.

    ```md
    # <%= plugin.name %>

    <%= plugin.description %>
    ```

---

- ### Configurable Template Engines

    Combino supports multiple template engines for file content processing. You can choose between EJS (default), Handlebars, or Mustache.

    **EJS (Default)**

    ```md
    # <%= name %>

    <% features.forEach(function(feature) { %>

    - <%= feature %>
      <% }); %>
    ```

    **Handlebars** _(Optional dependency)_

    ```md
    # {{name}}

    {{#each features}}

    - {{this}}
      {{/each}}
    ```

    **Mustache** _(Optional dependency)_

    ```md
    # {{name}}

    {{#features}}

    - {{.}}
      {{/features}}
    ```

    **Installing Optional Dependencies**

    ```bash
    # For Handlebars support
    npm install handlebars

    # For Mustache support
    npm install mustache
    ```

    **CLI Usage**

    ```bash
    # Use EJS (default)
    combino templates --data name=my-project

    # Use Handlebars (requires: npm install handlebars)
    combino templates --template-engine handlebars --data name=my-project

    # Use Mustache (requires: npm install mustache)
    combino templates --template-engine mustache --data name=my-project
    ```

    **Programmatic Usage**

    ```js
    import { Combino } from "combino";
    import {
        EJSTemplateEngine,
        HandlebarsTemplateEngine,
        MustacheTemplateEngine,
    } from "combino/template-engines";

    // Use EJS
    const combino = new Combino();

    // Use Handlebars (requires: npm install handlebars)
    const combinoHandlebars = new Combino(new HandlebarsTemplateEngine());

    // Use Mustache (requires: npm install mustache)
    // Or pass via options
    await combino.combine({
        outputDir: "./output",
        templates: ["templates"],
        templateEngine: "ejs", // or 'handlebars', 'mustache'
    });
    ```

    **Note**: Handlebars and Mustache are optional dependencies. If you try to use them without installing the required packages, Combino will provide helpful error messages with installation instructions.

---

- ### Template Inclusion

    Compose temapltes with dynamic paths and target mapping.

    ```ini
    [include]
    ../base
    ../<% framework %>/components = src/components
    ```

    ```js
    include: [
        { source: "../base" },
        { source: `../${framework}/components`, target: "src/components" },
    ];
    ```

---

- ### File Exclusion

    Exclude files and folders from being processed using glob patterns.

    ```ini
    [exclude]
    node_modules/**
    *.log
    .DS_Store
    temp/
    ```

    ```js
    exclude: ["node_modules/**", "*.log", ".DS_Store", "temp/"];
    ```

---

- ### Merging Strategies

    Files are intelligently merged by default based on their file type. You can override this behavior with pattern-specific strategies.

    - `deep`: Deep merge objects and arrays (default for JSON)
    - `shallow`: Shallow merge objects (default for Markdown)
    - `append`: Append content to existing files
    - `prepend`: Prepend content to existing files
    - `replace`: Replace existing files completely (default for most file types)

    ```ini
    [merge:*.json]
    strategy = deep

    [merge:*.{md,yaml}]
    strategy = replace
    ```

    ```js
    merge: {
      "*.json": { strategy: "deep" },
      "*.{md,yaml}": { strategy: "replace" }
    }
    ```

    Arrays are intelligently merged by concatenating them and deduping items. Use `$key` property to merge objects in arrays by unique identifier.

    ```json
    {
        "dependencies": [
            {
                "$key": "name",
                "name": "react",
                "version": "^18.2.0"
            }
        ]
    }
    ```

## Configuration

Combino supports a unified configuration structure that works for both `.combino` files and programmatic usage.

- `include?: Array<{ source: string; target?: string }>` - Compose templates from other files and folders
- `exclude?: string[]` - Exclude files/folders using glob patterns
- `data?: Record<string, any>` - Pass custom data for templating and conditions
- `merge?: Record<string, Record<string, any>>` - Control file merging with pattern-specific strategies

### Programmatic Usage

```js
const combino = new Combino();

const config = {
    include: [
        { source: "../base" },
        { source: "../react/components", target: "src/components" },
    ],
    exclude: ["node_modules/**", "*.log"],
    data: {
        project: { name: "My Project", version: "1.0.0" },
    },
    merge: {
        "*.json": { strategy: "deep" },
        "*.{md,yaml}": { strategy: "replace" },
    },
};

await combino.combine({
    templates: ["templates/base", "templates/react"],
    outputDir: "output",
    config,
});
```

### Using `.combino` files

```ini
[include]
../base
../<% framework %>/components = src/components

[exclude]
node_modules/**
*.log

[data]
project.name = "My Project"
project.version = "1.0.0"

[merge:*.json]
strategy = deep

[merge:*.{md,yaml}]
strategy = replace
```

## CLI Usage

`combino [templates...] [options]`

### Arguments

- **`templates...`** { String } One or more template folders (first has lowest priority, last wins)

### Options

- **`-o, --output <dir>`** { String } Output directory (default: ./output)
- **`-c, --config <path>`** { String } Path to .combino config file
- **`--data <key=value>`** { String } Inline key-value data
- **`--template-engine <engine>`** { String } Template engine to use (ejs, handlebars, mustache) (default: ejs)

### Example

```bash
# Using EJS (default)
combino ./templates/base ./templates/svelte --data framework=svelte --data language=ts -o ./my-project

# Using Handlebars
combino ./templates/base ./templates/svelte --template-engine handlebars --data framework=svelte --data language=ts -o ./my-project

# Using Mustache
combino ./templates/base ./templates/svelte --template-engine mustache --data framework=svelte --data language=ts -o ./my-project
```

## Development

To install the dependencies

```bash
npm install
```

To build the project

```bash
npm run build
```

To run tests

```bash
npm test
```
