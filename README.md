# Combino

![npm](https://img.shields.io/npm/v/combino)

Combino is a composable scaffolding engine that lets you build fully customised project structures by combining modular template folders with smart deep merging, dynamic conditions, and reusable logic.

## Instal

Add the npm package to your project.

```bash
npm install combino
```

## Usage

```js
import { Combino } from "combino";

await combino.combine({
    outputDir: "./output",
    templates: ["./templates/base", "./template/override"],
    templateEngine: "ejs",
});
```

<details>

<summary>Type Signature</summary>

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

</details>

## Features

- ### Dynamic Naming

    Use `[key]` placeholders in filenames to rename them dynamically.

    **Example**

    ```bash
    templates/
      base/
        [name]/
          index.[extension]
    ```

- ### Conditional Inclusion

    Files and folders can be conditionally included using JavaScript expressions.

    **Example**

    ```bash
    templates/
      base/
        tests[testing]/           # Only if testing=true
          example.test.ts
        [framework=="svelte"]     # Only if framework=svelte
          App.svelte
        [framework=="react"]      # Only outputted if framework=react
          App.tsx
    ```

- ### Template Inclusion

    Compose temapltes with dynamic paths and target mapping.

    **Example**

    ```ini
    [include]
    ../base
    ../<% framework %>/components = src/components
    ```

- ### Template Exclusion

    Exclude files and folders from being processed using glob patterns.

    **Example**

    ```ini
    [exclude]
    package.json
    ```

- ### Merging Strategies

    The default merge strategy is `replace` but you can configure any file to use the following merge strategies.

    - `replace`: Replace existing files completely
    - `deep`: Deep merge objects and arrays
    - `shallow`: Shallow merge objects
    - `append`: Append content to existing files
    - `prepend`: Prepend content to existing files

    **Example**

    ```ini
    [merge:*.json]
    strategy = deep
    ```

- ### Configurable Template Engines

    Combino supports multiple template engines for file content processing. You can choose between EJS, Handlebars, or Mustache. **All template engines are optional dependencies** - you must install the ones you want to use.

    ```md
    # <%= plugin.name %>

    <%= plugin.description %>
    ```

## Programmatic Usage

```js
import { Combino } from "combino";

// Or pass via options
await combino.combine({
    outputDir: "./output",
    templates: ["./templates/base", "./template/override"],
    templateEngine: "ejs", // or 'handlebars', 'mustache'
});
```

## Usage

`combino [templates...] [options]`

### Arguments

- **`templates...`** { String } One or more paths to template folders (first has lowest priority, last wins)

### Options

- **`-o, --output <dir>`**: Output directory (default: ./output)
- **`-c, --config <path>`**: Path to .combino config file
- **`--data <key=value>`** Inline key-value data
- **`--template-engine <engine>`** Template engine to use (ejs, handlebars, mustache) - requires installing the corresponding dependency
- **`--merge <pattern=strategy>`** Merge strategy for file patterns (e.g., _.json=deep, _.md=replace)
