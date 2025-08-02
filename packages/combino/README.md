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

await combino.build({
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
interface Options {
    outputDir: string;
    include: string[];
    exclude?: string[];
    config?: Config | string;
    data?: Record<string, any>;
    plugins?: Plugin[];
    configFileName?: string;
    enableConditionalIncludePaths?: boolean; // Enable/disable conditional include paths feature (default: true)
    warnings?: boolean; // Enable/disable warning messages (default: true)
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

### Template Inclusion

Compose templates with dynamic paths and target mapping. Specify a source and target to move to a specific location.

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

### Template Exclusion

Exclude files and folders from being processed using glob patterns.

**Example**

```json
{
    "exclude": ["package.json"]
}
```

### Merging Strategies

The default merge strategy is `replace` but you can configure any file to use the following merge strategies, `replace`, `deep`, `shallow`, `append`, `rename`.

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

### Dynamic File and Folder Naming

Use placeholders in filenames to rename them dynamically.

**Example**

```bash
templates/
    base/
        [name]/                  # Outputs "test" if name=test
            index.[ext]          # Outputs "js" if ext=js
```

### Conditional File and Folders

Files and folders can be conditionally included using JavaScript expressions.

**Example**

```bash
templates/
    base/
        ui[hasUI]/                # Only if hasUI=true
            example.test.ts
        [framework=="svelte"]     # Only if framework=svelte
            App.svelte
        [framework=="react"]      # Only outputted if framework=react
            App.tsx
        vite.d.ts[ts]             # Only outputted if ts=true
```

### Conditional Include Paths

Include paths in `combino.json` can use conditional logic with square bracket syntax. When a condition is truthy, the folder is entered but its name is dropped from the resolved output path. When falsy, the entire entry is skipped.

**Example**

```json
{
    "include": [
        {
            "source": "../frameworks/<%= framework %>/[typescript]/tsconfig.ui.json",
            "target": "src/ui/tsconfig.json"
        },
        {
            "source": "../frameworks/<%= framework %>/[javascript]/config.js",
            "target": "src/config.js"
        }
    ]
}
```

**Directory Structure**

```bash
frameworks/
    react/
        [typescript]/
            tsconfig.ui.json      # Only included if typescript=true
        [javascript]/
            config.js             # Only included if javascript=true
```

**Behavior**

- If `typescript: true`: File is copied from `frameworks/react/[typescript]/tsconfig.ui.json` to `src/ui/tsconfig.json`
- If `typescript: false`: File is not copied at all
- The `[typescript]` segment is not included in the final output path

**Supported Expressions**

- Simple boolean: `[typescript]` (truthy if `typescript` is true)
- Comparison: `[framework=="react"]` (truthy if `framework` equals "react")
- Ternary: `[typescript ? "ts" : "js"]` (evaluates to "ts" or "js")

### Disabling Conditional Include Paths

You can disable the conditional include paths feature by setting the `enableConditionalIncludePaths` option to `false`. When disabled, conditional logic in include paths will be ignored and paths will be processed as-is.

**Example**

```js
import { Combino } from 'combino';

const combino = new Combino();

await combino.build({
    outputDir: './output',
    include: ['./templates/base'],
    enableConditionalIncludePaths: false, // Disable the feature
    data: {
        typescript: true,
        framework: 'react',
    },
});
```

When disabled, include paths like `../frameworks/<%= framework %>/[typescript]/tsconfig.ui.json` will be processed as literal paths without conditional logic.

### Special Folder and File Naming

**`!`**: Take priority over other any other file or folder merged with them:

```bash
template/
    !package.json
```

**`_`**: Exclude file or folder from being merged unless explicitly included:

```bash
template/
    _components/
```

**`~`**: Disable file until processed:

```bash
template/
    ~.gitignore
```

## Plugins

Combino uses a powerful plugin system to process templates and transform files. Plugins can handle template rendering, syntax transformations, and file modifications.

### Using Plugins

Add plugins to your Combino configuration:

```js
import { Combino } from 'combino';
import stripTS from '@combino/plugin-strip-ts';

const combino = new Combino();

await combino.build({
    outputDir: './output',
    include: ['./templates/base', './templates/react'],
    plugins: [stripTS()],
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

See a [list of plugins](/packages/plugins/README.md).

<details>

<summary>Type Signature</summary>

```typescript
export interface Plugin {
    discover?: (context: any) => Promise<any> | any;
    compile?: (context: any) => Promise<any> | any;
    assemble?: (context: any) => Promise<any> | any;
    output?: (context: any) => Promise<void> | void;
}
```

</details>

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

## Warnings and Error Handling

Combino provides warning messages to help identify issues during template processing. By default, warnings are enabled and will show when:

- Include paths cannot be found on disk
- Conditional include paths fail to resolve
- Other non-critical issues occur

### Disabling Warnings

You can disable warnings by setting the `warnings` option to `false`:

```js
await combino.build({
    outputDir: './output',
    include: ['./templates/base'],
    warnings: false, // Disable warning messages
    data: {
        framework: 'react',
    },
});
```

### Debug Mode

For detailed debugging information, see the [Debug Mode documentation](./DEBUG.md).

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
- **`--no-warnings`** Disable warning messages
