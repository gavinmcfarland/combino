# Combino

![npm](https://img.shields.io/npm/v/combino)

Combino is a composable scaffolding engine that lets you build fully customised project structures by combining modular template folders with strategic merging, dynamic conditions, and reusable logic.

## Install

Add the npm package to your project.

```bash
npm install combino
```

## Quickstart

At its core, Combino merges files from multiple template directories. Combino has several features that help you decide how files should be merged and processed. From using expressions in folder names and files, to creating plugins to hook into specific lifecycling events of the merging process. Use a `combino.json` file to be more declarative about how you want your templates to be processed.

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

    Compose templates with dynamic paths and target mapping. You can use either plain strings or objects with source/target properties.

    ```json
    {
        "include": [
            "../base",
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

## Plugins

Combino uses a powerful plugin system to process templates and transform files. Plugins can handle template rendering, syntax transformations, and file modifications.

### Using Plugins

Add plugins to your Combino configuration:

```js
import { Combino } from 'combino';
import myPlugin from './my-plugin';

const combino = new Combino();

await combino.combine({
    outputDir: './output',
    include: ['./templates/base', './templates/react'],
    plugins: [myPlugin()],
    data: {
        framework: 'react',
        language: 'typescript',
    },
});
```

### Creating Plugins

Create your own plugins by implementing the Plugin interface:

```js
// Example plugin that converts extensions
export function plugin(options = {}): Plugin {
    const { from, to } = options;

    return {
        assemble: async (context) => {
            const newId = context.id.replace(`.${from}`, `.${to}`);
            return { content: context.content, id: newId };
        },
    };
}
```

### Hooks

Plugins can use two hooks to process files at different stages:

- **`compile`**: Processes individual template files before merging.
- **`assemble`**: Processes files after merging but before formatting.

## Configure

Combino will load `combino.json` files that exist within each template.

```json
{
    "merge": {
        "*.json": {
            "strategy": "deep"
        }
    },
    "include": ["../base"],
    "exclude": ["node_modules/**", "*.log"],
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
