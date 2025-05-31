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

Use a `.combino` config file to customize how templates are combined.

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

## Combining programmatically 

```js
const combino = new Combino();
await combino.combine({
  outputDir: "output",
  templates: ["templates/base", "templates/typescript"],
});
```
