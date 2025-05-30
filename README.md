# Combino

Combine multiple template folders to generate custom file and folder structures. Supports deep merging, conditional inclusion via query parameters, and configurable template data—all with minimal setup.

> **Note:** This project is currently a work in progress. Features and documentation are being actively developed.

## Quick Start

Here's a simple example of how to use Combino:

```js
const combino = new Combino();
await combino.combine({
    outputDir: "output",
    templates: ["templates/base", "templates/typescript"],
});
```

### Example Structure

**Template 1 (Base)**

```bash
templates/
    base/
        package.json
        README.md
```

**Template 2 (Svelte)**

```bash
templates/
    svelte/
        package.json
        svelte.config.js
```

**Generated Output**

```bash
output/
    package.json    # Deep merged from both templates
    README.md      # Copied from base template
    svelte.config.js # New file from svelte template
```

## Template Configuration

### Conditional Templates

Templates support query parameters to conditionally include or exclude specific files and folders.

#### Conditional Folders

The following example only includes the `tests` folder when `testing` is set to `true`:

```bash
templates/
    base/
        tests[?testing]/
            example.test.ts
```

#### Conditional Files

You can also conditionally include specific files based on configuration.

```bash
templates/
    base/
        [?framework=svelte]
            App.svelte
        [?framework=react]
            App.tsx
```

When `framework=svelte`:

```bash
templates/
    base/
        App.svelte
```

When `framework=react`:

```bash
templates/
    base/
        App.tsx
```

### Ignore Files

You can specify files to be ignored during the combination process:

```ini
[ignore]
package.json
```

### Template Data

Supply custom data to your templates:

```ini
[data]
plugin.name = "Plugma"
plugin.description = "Take figma plugins to the next level"
plugin.version = 1.0.0
```
