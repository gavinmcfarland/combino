To run tests:

```bash
npm run test
```

To run an example:

```bash
cd examples
node <example>/index.js
```

## Publishing to NPM

This project uses [Lerna](https://lerna.js.org/) for version management and publishing to npm. Lerna automatically detects which packages have changed and handles dependency resolution.

### Prerequisites

1. Make sure you have write access to the npm packages
2. Ensure you're logged in to npm: `npm login`
3. Have the latest changes from the main branch

### Quick Publishing (Recommended)

Publish all changed packages with a single command:

```bash
npm run publish
```

This command will:

1. Run tests to ensure everything works
2. Build the project
3. Update version numbers for changed packages
4. Publish changed packages to npm

### Detailed Publishing Workflow

If you prefer to run each step individually:

#### 1. Version Packages

Update version numbers for packages that have changed:

```bash
npm run version
```

This will:

- Detect which packages have changed since the last release
- Prompt for version bump type (major, minor, patch)
- Update package.json version numbers
- Create git tags
- Generate changelog entries

#### 2. Publish Packages

Publish the versioned packages to npm:

```bash
npm run publish:from-package
```

This publishes packages that have been versioned but not yet published.

### Publishing Individual Packages

Lerna automatically handles:

- **Dependency resolution**: Packages are published in the correct order based on dependencies
- **Change detection**: Only packages with changes are versioned and published
- **Conventional commits**: Version bumps are determined by commit messages
- **Workspace integration**: Works seamlessly with pnpm workspaces

### Notes

- The project uses conventional commits for automatic version bumping
- Lerna automatically detects which packages have changed since the last release
- Dependencies between packages are automatically resolved during publishing
- The `prepublish` script runs tests and builds before publishing
- All packages are published to the public npm registry

## Future Ideas

Take priority over other any other file or folder merged with them.

```bash
template/
    !package.json
```

Exclude file or folder from being merged unless explicitly included.

```bash
template/
    _components/
```

Disable file until processed.

```
templates/
    ~.gitignore
```
