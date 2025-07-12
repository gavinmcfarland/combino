# Migration to Monorepo Structure

This document outlines the changes made to convert Combino from a single package to a monorepo with individual plugin packages.

## What Changed

### Before

```
combino/
├── src/
│   ├── plugins/
│   │   ├── ejs.ts
│   │   ├── eta.ts
│   │   ├── edge.ts
│   │   ├── ejs-mate.ts
│   │   └── strip-ts.ts
│   └── ...
└── package.json
```

### After

```
combino/
├── packages/
│   ├── combino/           # Main package
│   └── plugins/
│       ├── ejs/           # @combino/plugin-ejs
│       ├── eta/           # @combino/plugin-eta
│       ├── edge/          # @combino/plugin-edge
│       ├── ejs-mate/      # @combino/plugin-ejs-mate
│       └── strip-ts/      # @combino/plugin-strip-ts
├── package.json           # Root monorepo config
└── tsconfig.json          # Root TypeScript config
```

## Plugin Packages

Each plugin is now a separate npm package:

| Plugin   | Package Name               | Description                          |
| -------- | -------------------------- | ------------------------------------ |
| EJS      | `@combino/plugin-ejs`      | EJS template engine                  |
| ETA      | `@combino/plugin-eta`      | ETA template engine with layouts     |
| Edge     | `@combino/plugin-edge`     | Edge.js template engine              |
| EJS-Mate | `@combino/plugin-ejs-mate` | Advanced EJS with layouts and blocks |
| Strip-TS | `@combino/plugin-strip-ts` | TypeScript stripping                 |

## Installation Changes

### Before

```bash
npm install combino
```

### After

```bash
# Install main package
npm install combino

# Install plugins individually
npm install @combino/plugin-ejs
npm install @combino/plugin-eta
npm install @combino/plugin-edge
npm install @combino/plugin-ejs-mate
npm install @combino/plugin-strip-ts
```

## Usage Changes

### Before

```javascript
import { Combino } from 'combino';
import ejsPlugin from 'combino/plugins/ejs';
import etaPlugin from 'combino/plugins/eta';

const combino = new Combino();
await combino.combine({
    plugins: [ejsPlugin(), etaPlugin()],
    // ...
});
```

### After

```javascript
import { createCombino } from 'combino';
import ejsPlugin from '@combino/plugin-ejs';
import etaPlugin from '@combino/plugin-eta';

const combino = createCombino({
    plugins: [ejsPlugin(), etaPlugin()],
});

await combino.generate({
    // ...
});
```

## Development Changes

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@combino/plugin-ejs
```

### Testing

```bash
# Test all packages
npm run test

# Test specific package
npm run test --workspace=@combino/plugin-ejs
```

### Publishing

```bash
# Publish all plugins
npm run publish:plugins

# Publish specific plugin
npm publish --workspace=@combino/plugin-ejs
```

## Benefits

1. **Modular Dependencies**: Each plugin only includes its required dependencies
2. **Independent Versioning**: Plugins can be versioned and updated independently
3. **Better Tree Shaking**: Users only install the plugins they need
4. **Easier Maintenance**: Each plugin has its own package.json and configuration
5. **Faster Builds**: Changes to one plugin don't require rebuilding others

## Migration Steps

1. **Update Dependencies**: Install the new plugin packages
2. **Update Imports**: Change import statements to use the new package names
3. **Update Configuration**: Use the new plugin API if needed
4. **Test**: Verify that all functionality works as expected

## Breaking Changes

- Plugin imports now use `@combino/plugin-*` package names
- Some plugin APIs may have changed slightly
- The main Combino package no longer includes built-in plugins

## Support

If you encounter issues during migration:

1. Check the [plugin documentation](./docs/plugins.md)
2. Review the [plugin README files](./packages/plugins/*/README.md)
3. Open an issue on the repository
