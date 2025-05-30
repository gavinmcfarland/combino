# Combino

A flexible scaffolding tool that lets you combine template folders to generate custom project setups. It supports smart merging of files across formats like JSON, JavaScript, and Markdown, using simple frontmatter or config rules to control how content is combined.

> **Note:** This project is currently a work in progress. Features and documentation are being actively developed.

## Combine folders

```js
const combino = new Combino();
await combino.combine({
    outputDir: "output",
    templates: ["templates/base", "templates/typescript"],
});
```

Template 1

```bash
templates/
    base/
        package.json
        README.md
```

Template 2

```bash
templates/
    svelte/
        package.json
        svelte.config.js
```

Outputs:

```bash
ouput/
    package.json # deep merge with base
    README.md # copied from base
    svelte.config.js # new file
```

## Configuring templates

### Ignore

Ignore certain files from being copied

```ini
[ignore]
package.json
```

## Data

Supply data with templates

```ini
[data]
plugin.name = "Plugma"
plugin.description = "Take figma plugins to the next level"
plugin.version = 1.0.0
```

## Confitional files and folders

In some cases you want folders and files to be copied only if certain conditions are met.

In the folowing example. The `App.svelte` will only be copied if `framework` equals `svelte`.

```
templates/
    base/
        [?framework=svelte]
            App.svelte
        [?framework=react]
            App.tsx
```

Is `framework` equals `svelte` then this is the output.

```
templates/
    base/
        App.svelte
```
