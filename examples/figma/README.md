# Template Generation

## Misc notes

- vite-env.d.ts is needed for various things like, `import` and importing svgs.

vite-env.d.ts is a TypeScript declaration file used by Vite to provide type definitions for environment variables and other Vite-specific features, particularly within the import.meta.env object. It helps with type safety and autocompletion when working with environment variables in a TypeScript project built with Vite.

https://vite.dev/guide/env-and-mode

vite-env.d.ts is useful even without TypeScript because intellisense uses it

## Developing/Testing

There is a file called `generate-all.js` that will generate all the possible combinations so you can debug them.
