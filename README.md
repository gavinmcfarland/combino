# Combino

![npm](https://img.shields.io/npm/v/combino)

Combino is a composable scaffolding engine that lets you build fully customised project structures by combining modular template folders with strategic merging, dynamic conditions, and reusable logic.

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
    templateEngine: "ejs",
    include: ["./templates/base", "./template/svelte"],
    data: {
        framework: "svelte",
    },
});
```

<details>

<summary>Type Signature</summary>

```ts
interface TemplateOptions {
    outputDir: string;
    include: string[];
    config?: CombinoConfig | string;
    data?: Record<string, any>;
    templateEngine?: string;
    onFileProcessed?: (
        context: FileHookContext,
    ) =>
        | Promise<{ content: string; targetPath?: string }>
        | { content: string; targetPath?: string };
}

interface FileHookContext {
    sourcePath: string;
    targetPath: string;
    content: string;
    data: Record<string, any>;
    templateEngine?: TemplateEngine;
}

interface CombinoConfig {
    include?: Array<{ source: string; target?: string }>;
    exclude?: string[];
    data?: Record<string, any>;
    merge?: Record<string, Record<string, any>>;
}
```

</details>

## Example

At its core, Combino copies files from both template directories.

For example, the following templates combined:

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

This generates:

```bash
output/
    package.json          # Copied from base
    README.md             # Copied from base
src/
    main/
        main.js           # Conditional extension based on framework
    ui/
        App.svelte        # Framework-specific file (only for svelte)
        styles.css        # Copied from base
svelte.config.js          # Unique file copied from svelte template
```

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

- ### File Processing Hooks

    You can add custom processing logic that runs after template processing but before formatting using the `onFileProcessed` hook.

    ```js
    await combino.combine({
        outputDir: "./output",
        include: ["./templates/base"],
        data: { framework: "react" },
        onFileProcessed: (context) => {
            let newPath = context.targetPath;
            // Example: change file extension
            if (context.targetPath.endsWith(".ts")) {
                newPath = context.targetPath.replace(/\.ts$/, ".js");
            }
            // Add a comment to all JavaScript files
            return {
                content: `// Generated by Combino\n${context.content}`,
                targetPath: newPath,
            };
        },
    });
    ```

    The hook receives a context object with:

    - `sourcePath`: The source file path from the template
    - `targetPath`: The target file path where the file will be written
    - `content`: The file content after template processing
    - `data`: The data used for template processing
    - `templateEngine`: The template engine instance (if any)

## Configure

Combino will load `.combino` files that exist within each template.

```ini
[include]
../base
../<% framework %>/components = src/components

[exclude]
node_modules/**
*.log

[merge:*.json]
strategy = deep

[data]
project.name = "My Project"
project.version = "1.0.0"
```

## CLI

`combino [include...] [options]`

### Arguments

- **`include...`** One or more paths to template folders to include (first has lowest priority, last wins)

### Options

- **`-o, --output <dir>`**: Output directory (default: ./output)
- **`-c, --config <path>`**: Path to .combino config file
- **`--data <key=value>`** Inline key-value data
- **`--template-engine <engine>`** Template engine to use (ejs, handlebars, mustache) - requires installing the corresponding dependency
- **`--merge <pattern=strategy>`** Merge strategy for file patterns (e.g., _.json=deep, _.md=replace)
