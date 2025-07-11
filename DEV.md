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

This project uses [changeset](https://github.com/changesets/changesets) for version management and publishing to npm.

### Prerequisites

1. Make sure you have write access to the npm package
2. Ensure you're logged in to npm: `npm login`
3. Have the latest changes from the main branch

### Quick Publishing (Recommended)

After creating and committing your changesets, publish with a single command:

```bash
npm run publish
```

This command will:

1. Run tests to ensure everything works
2. Build the project
3. Update version numbers and generate changelog
4. Publish to npm

### Detailed Publishing Workflow

If you prefer to run each step individually:

#### 1. Create Changesets

After making changes to the codebase, create a changeset to document what changed:

```bash
npm run changeset
```

This will prompt you to:

- Select which packages have changed (if multiple)
- Choose the type of change (major, minor, patch)
- Write a description of the changes

#### 2. Commit Changesets

Commit the generated changeset files:

```bash
git add .changeset/
git commit -m "Add changeset for [description of changes]"
git push
```

#### 3. Version and Publish

When ready to release, use the simplified publish command:

```bash
npm run publish
```

This single command handles everything: testing, building, versioning, and publishing.

### Notes

- The project is configured with `"access": "public"` in the changeset config for the unscoped package
- Changesets automatically generate changelog entries based on your descriptions
- The `version` script updates package.json version numbers and creates git tags
- The `release` script publishes to npm and pushes git tags
- The `publish` script runs tests, builds, versions, and publishes in one command

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
