# Combino Monorepo

A monorepo containing Combino and its official plugins.

## Packages

### Core Package

- **`packages/combino`** - The main Combino scaffolding tool

### Plugins

- **`packages/plugins/ejs`** - [@combino/plugin-ejs](./packages/plugins/ejs/README.md) - EJS template engine plugin
- **`packages/plugins/eta`** - [@combino/plugin-eta](./packages/plugins/eta/README.md) - ETA template engine plugin
- **`packages/plugins/edge`** - [@combino/plugin-edge](./packages/plugins/edge/README.md) - Edge.js template engine plugin
- **`packages/plugins/ejs-mate`** - [@combino/plugin-ejs-mate](./packages/plugins/ejs-mate/README.md) - EJS-Mate template engine plugin with layout support
- **`packages/plugins/strip-ts`** - [@combino/plugin-strip-ts](./packages/plugins/strip-ts/README.md) - TypeScript stripping plugin

## Development

### Prerequisites

- Node.js 18+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Watch mode for development
npm run build:watch
```

### Workspace Scripts

- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format all packages
- `npm run clean` - Clean build artifacts

## Plugin Development

Each plugin follows a standard structure:

```
packages/plugins/[plugin-name]/
├── src/
│   └── index.ts          # Main plugin code
├── dist/                 # Built files (auto-generated)
├── package.json          # Plugin package configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # Plugin documentation
```

### Creating a New Plugin

1. Create a new directory in `packages/plugins/`
2. Copy the structure from an existing plugin
3. Update `package.json` with your plugin details
4. Implement the plugin interface in `src/index.ts`
5. Add tests and documentation

### Plugin Interface

All plugins must implement the Combino plugin interface:

```typescript
export interface Plugin {
    discover?: (context: any) => Promise<any> | any;
    compile?: (context: any) => Promise<any> | any;
    assemble?: (context: any) => Promise<any> | any;
    output?: (context: any) => Promise<void> | void;
}
```

## Publishing

### Publishing Plugins

```bash
# Publish all plugins
npm run publish:plugins

# Or publish individual plugins
npm publish --workspace=@combino/plugin-ejs
```

### Version Management

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Create a changeset
npm run changeset

# Version packages
npm run version

# Publish packages
npm run release
```

## License

MIT
