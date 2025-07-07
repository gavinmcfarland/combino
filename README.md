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
import { Combino } from 'combino';

await combino.combine({
    outputDir: './output',
    include: ['./templates/base', './template/svelte'],
    data: {
        framework: 'svelte',
    },
});
```

<details>

<summary>Type Signature</summary>

```ts
interface TemplateOptions {
    outputDir: string;
    include: string[];
    exclude?: string[];
    config?: CombinoConfig | string;
    data?: Record<string, any>;
    plugins?: Plugin[];
}

interface CombinoConfig {
    include?: Array<string | { source: string; target?: string }>;
    exclude?: string[];
    data?: Record<string, any>;
    merge?: Record<string, Record<string, any>>;
    layout?: string[];
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

    Compose temapltes with dynamic paths and target mapping. You can use either plain strings or objects with source/target properties.

    **Example (Plain strings)**

    ```json
    {
        "include": ["../base", "../components"]
    }
    ```

    **Example (Objects with target mapping)**

    ```json
    {
        "include": [
            {
                "source": "../components",
                "target": "src/ui"
            }
        ]
    }
    ```

- ### Template Exclusion

    Exclude files and folders from being processed using glob patterns.

    **Example**

    ```json
    {
        "exclude": ["package.json"]
    }
    ```

- ### Merging Strategies

    The default merge strategy is `replace` but you can configure any file to use the following merge strategies.

    - `replace`: Replace existing files completely
    - `deep`: Deep merge objects and arrays
    - `shallow`: Shallow merge objects
    - `append`: Append content to existing files
    - `prepend`: Prepend content to existing files

    **Example**

    ```json
    {
        "merge": {
            "*.json": {
                "strategy": "deep"
            }
        }
    }
    ```

## Configure

Combino will load `combino.json` or `config.json` files that exist within each template.

```json
{
    "include": ["../base"],
    "exclude": ["node_modules/**", "*.log"],
    "merge": {
        "*.json": {
            "strategy": "deep"
        }
    },
    "data": {
        "project": {
            "name": "My Project",
            "version": "1.0.0"
        }
    }
}
```

## CLI

`combino [include...] [options]`

### Arguments

- **`include...`** One or more paths to template folders to include (first has lowest priority, last wins)

### Options

- **`-o, --output <dir>`**: Output directory (default: ./output)
- **`-c, --config <path>`**: Path to combino.json config file
- **`--data <key=value>`** Inline key-value data
- **`--template-engine <engine>`** Template engine to use (ejs, handlebars, mustache) - requires installing the corresponding dependency
- **`--merge <pattern=strategy>`** Merge strategy for file patterns (e.g., _.json=deep, _.md=replace)
