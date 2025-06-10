# Combino

Combine multiple template folders to generate custom file and folder structures. Supports deep merging, conditional inclusion via query parameters, and configurable template data—all with minimal setup.

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

### Conditional Inclusion

Files and folders can be conditionally included or excluded using JavaScript expressions. Conditions can use comparison operators (`==`, `!=`, `>`, `<`, `>=`, `<=`) and logical operators (`&&`, `||`).

#### Example: Conditional Folder

Only include `tests/` if `testing==true`:

```bash
templates/
  base/
    tests[testing]/
      example.test.ts
```

#### Example: Conditional File

Include a file based on `framework` value:

```bash
templates/
  base/
    [framework=="svelte"]
      App.svelte
    [framework=="react"]
      App.tsx
```

If `framework=="svelte"`, the output includes:

```bash
App.svelte
```

If `framework=="react"`, the output includes:

```bash
App.tsx
```

#### Example: Complex Conditions

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

#### Example: Conditional File Extensions

You can also make file extensions conditional:

```bash
templates/
  base/
    src/
      index.[language=="ts"?"tsx":"jsx"]
```

If `language=="ts"`, the output will be `index.tsx`, otherwise `index.jsx`.

---

## Configuration

Use a `.combino` config file to customise how templates are combined.

### Example `.combino` file

```ini
[ignore]
package.json

[data]
plugin.name = "Plugma"
plugin.description = "Take figma plugins to the next level"
plugin.version = 1.0.0
```

-   **\[ignore]**: Prevent specific files from being merged or copied.
-   **\[data]**: Provide custom data for use in templates.

### Template Inclusion

You can include other templates in your `.combino` file using the `[include]` section. This allows you to compose templates by including base templates that can be extended or overridden.

#### Example: Including Base Templates

```ini
[include]
../base
../common

[data]
project.name = "my-project"
project.description = "A custom project"
```

In this example:

-   The template includes files from `../base` and `../common` directories
-   Files from included templates are processed first
-   Files in the current template can override files from included templates
-   Data from included templates is merged with the current template's data

This is useful for:

-   Creating a base template with common files and configurations
-   Building specialized templates that extend the base
-   Composing templates from multiple sources
-   Maintaining a single source of truth for shared files

## Templating file contents

Use EJS syntax `<%= %>` inside file contents.

```md
# README.md

# <%= plugin.name %>

<%= plugin.description %>
```

Combined with a `.combino` file or `--data.plugin.name`, this is rendered at generation time.

## Naming rules

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

## File Merge Strategies

Supports fine-grained control over how files are merged by allowing per-pattern strategy configuration in your `.combino` file.

```ini
[merge]
strategy = replace

[merge:*.json]
strategy = deep
```

### Example: Using Glob Patterns with Brace Expansion

You can use glob patterns with brace expansion to apply a merge strategy to multiple file types. For example, to replace both markdown and JSON files:

```ini
[merge:*.{md,json}]
strategy = replace
```

This will apply the `replace` strategy to any file ending in `.md` or `.json`.

## File conflict strategies

```ini
[merge:*.json]
conflict = skip | error | rename
```

If using `conflict = rename`, Combino will auto-rename files to avoid overwriting:

```bash
logo.png → logo-1.png
```

## Combining programmatically

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

### Examples

Basic usage with multiple templates:

```bash
combino ./templates/base ./templates/svelte --data framework=svelte --data language=ts -o ./my-project
```
