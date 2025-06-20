# Combino

Combino is a composable scaffolding engine that lets you build fully customised project structures by combining modular template folders with smart deep merging, dynamic conditions, and reusable logic.

## Quick Start

```bash
# Install
npm install -g combino

# Basic usage
combino ./templates/base ./templates/svelte --data framework=svelte

# With config file
combino ./templates/base ./templates/svelte -c config.combino
```

## Example

**Templates:**
```
templates/
  base/
    package.json
    README.md
  svelte/
    package.json
    svelte.config.js
```

**Output:**
```
output/
  package.json       # Deep merged from both templates
  README.md          # From base
  svelte.config.js   # From svelte
```

## Features

### Dynamic Naming
Use `[key]` placeholders in filenames to rename them dynamically:

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

### Conditional Inclusion
Files and folders can be conditionally included using JavaScript expressions:

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

### JSON Array Merging
Use `$key` property to merge objects in arrays by unique identifier:

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

### File Content Templating
Use EJS syntax `<%= %>` inside file contents:

```md
# <%= plugin.name %>
<%= plugin.description %>
```

## Configuration

Combino supports a unified configuration structure:

- `include?: Array<{ source: string; target?: string }>` - Compose templates from other files and folders
- `exclude?: string[]` - Exclude files/folders using glob patterns
- `data?: Record<string, any>` - Pass custom data for templating and conditions
- `merge?: Record<string, Record<string, any>>` - Control file merging with pattern-specific strategies

### Merge Strategies
- `deep`: Deep merge objects and arrays (default for JSON)
- `shallow`: Shallow merge objects (default for Markdown)
- `append`: Append content to existing files
- `prepend`: Prepend content to existing files
- `replace`: Replace existing files completely (default)

## Programmatic Usage

```js
const combino = new Combino();

const config = {
  include: [
    { source: '../base' },
    { source: '../react/components', target: 'src/components' }
  ],
  exclude: ['node_modules/**', '*.log'],
  data: {
    project: { name: "My Project", version: "1.0.0" }
  },
  merge: {
    "*.json": { strategy: "deep" },
    "*.md": { strategy: "replace" }
  }
};

await combino.combine({
  templates: ["templates/base", "templates/react"],
  outputDir: "output",
  config
});
```

## Using `.combino` files

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

[merge:*.md]
strategy = replace
```

## CLI Usage

```bash
combino [templates...] [options]
```

**Options:**
- `-o, --output <dir>` - Output directory (default: ./output)
- `-c, --config <path>` - Path to .combino config file
- `--data <key=value>` - Inline key-value data

**Example:**
```bash
combino ./templates/base ./templates/svelte --data framework=svelte --data language=ts -o ./my-project
```
