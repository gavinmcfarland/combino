# Combino

Combino is a composable scaffolding engine that lets you build fully customised project structures by combining modular template folders with smart deep merging, dynamic conditions, and reusable logic.

> **Note:** This project is a work in progress. Features and documentation are still being developed.

---

## Quick Start

```bash
combino ./templates/base ./templates/svelte
```

---

## Example

### Templates

```bash
templates/
  base/
    package.json
    README.md

  svelte/
    package.json
    svelte.config.js
```

### Output

```bash
output/
  package.json       # Deep merged from both templates
  README.md          # From base
  svelte.config.js   # From svelte
```

---

## Template Logic

### Naming rules

Use [key] placeholders in filenames or folder names to rename them dynamically.

Example:

```bash
templates/
  base/
    [name]/
      index.[extension]
```

With:

```bash
combino base --data.name=my-plugin --data.extension=ts
```

The output is:

```bash
my-plugin/
  index.ts
```

### Conditional Inclusion

Files and folders can be conditionally included or excluded using JavaScript expressions. Conditions can use comparison operators (`==`, `!=`, `>`, `<`, `>=`, `<=`) and logical operators (`&&`, `||`).

#### Conditional Folder

Only include `tests/` if `--data.testing`:

```bash
templates/
  base/
    tests[testing]/
      example.test.ts
```

#### Conditional Files

Include a file based on `framework` value:

```bash
templates/
  base/
    [framework=="svelte"]
      App.svelte
    [framework=="react"]
      App.tsx
```

If `--data.framework=svelte`, the output includes:

```bash
App.svelte
```

If `--data.framework=react`, the output includes:

```bash
App.tsx
```

#### Complex Conditions

You can use logical operators to create more complex conditions:

```bash
templates/
  base/
    # Include for React or Vue
    react-or-vue[framework=="react"||framework=="vue"]/
      App.tsx

    # Include only for React with TypeScript
    react-and-ts[framework=="react"&&language=="ts"]/
      App.tsx

    # Include for everything except Vue
    not-vue[framework!="vue"]/
      App.tsx
```

#### Conditional File Extensions

You can also make file extensions conditional:

```bash
templates/
  base/
    src/
      index.[language=="ts"?"tsx":"jsx"]
```

If `--data.language=ts`, the output will be `index.tsx`, otherwise `index.jsx`.

### Templating File Contents

Use EJS syntax `<%= %>` inside file contents.

```md
# README.md

# <%= plugin.name %>

<%= plugin.description %>
```

## Configuration

Use a `.combino` config file to customise how templates are combined.

### [include]

Compose templates from other files and folders by specifying the path names to include.

```ini
[include]
../base
```

### [merge]

Control how files are merged with per-pattern strategy configuration.

#### Merge Strategies

```ini
[merge]
strategy = replace

[merge:*.json]
strategy = deep

[merge:*.{md,json}]
strategy = replace
```

#### Conflict Management

```ini
[merge:*.json]
conflict = skip | error | rename
```

If using `conflict = rename`, Combino will auto-rename files to avoid overwriting:

```bash
logo.png → logo-1.png
```

### [data]

Pass custom data to template folders and files.

```ini
[data]
plugin.name = "Plugma"
plugin.description = "Take figma plugins to the next level"
plugin.version = 1.0.0
```

## Combining Programmatically

```js
const combino = new Combino();
await combino.combine({
    outputDir: "output",
    templates: ["templates/base", "templates/typescript"],
});
```

## CLI Usage

```bash
combino [templates...] [options]
```

**Templates**

-   `templates...` One or more template folders (first has lowest priority, last wins)

**Options**

-   `-o, --output <dir>` Output directory for the generated result (Default: ./output)
-   `-c, --config <path>` Path to a .combino config file (INI or JSON)
-   `--data <key=value>` Inline key-value data to use for templating, conditions, and naming

### Example

Basic usage with multiple templates:

```bash
combino ./templates/base ./templates/svelte --data framework=svelte --data language=ts -o ./my-project
```
