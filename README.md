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

Files and folders can be conditionally included or excluded using query parameters.

#### Example: Conditional Folder

Only include `tests/` if `testing=true`:

```bash
templates/
  base/
    tests[?testing]/
      example.test.ts
```

#### Example: Conditional File

Include a file based on `framework` value:

```bash
templates/
  base/
    [?framework=svelte]
      App.svelte
    [?framework=react]
      App.tsx
```

If `framework=svelte`, the output includes:

```bash
App.svelte
```

If `framework=react`, the output includes:

```bash
App.tsx
```

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

* **\[ignore]**: Prevent specific files from being merged or copied.
* **\[data]**: Provide custom data for use in templates.

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

Suppoed fine-grained control over how files are merged by allowing per-pattern strategy configuration in your `.combino` file.

```ini
[merge]
strategy = replace

[merge:*.json]
strategy = deep
```

## Combining programmatically 

```js
const combino = new Combino();
await combino.combine({
  outputDir: "output",
  templates: ["templates/base", "templates/typescript"],
});
```

## CLI Usage (coming soon


```bash
combino [templates...] [options]
```

**Templates**
- `templates...` One or more template folders (first has lowest priority, last wins)

**Options**
- `--data.key=value`	Inline key-value data to use for templating, conditions, and naming.
- `-o`, `--output <dir>`	Output directory for the generated result. (Default: ./output)
- `-c`, `--config <path>`	Path to a .combino config file (INI or JSON).
