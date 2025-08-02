# Debug Mode

Combino includes a debug mode that provides detailed logging information to help troubleshoot template processing issues.

## Enabling Debug Mode

There are several ways to enable debug mode:

### 1. Environment Variable (Recommended)

```bash
DEBUG=true npm test -- --testNamePattern="your-test-name"
```

### 2. Using the Debug Script

```bash
npm run test:debug -- --testNamePattern="your-test-name"
```

### 3. Command Line Flags

```bash
npm test -- --testNamePattern="your-test-name" -- --debug
# or
npm test -- --testNamePattern="your-test-name" -- -d
```

### 4. NODE_ENV

```bash
NODE_ENV=debug npm test -- --testNamePattern="your-test-name"
```

## What Debug Mode Shows

When debug mode is enabled, you'll see detailed information about:

- **Template Resolution**: Which templates are being processed and in what order
- **Config Parsing**: How `combino.json` files are being parsed and merged
- **Include Processing**: How include directives are being resolved and processed
- **File Merging**: Which files are being merged and with what strategies
- **Path Resolution**: How relative paths are being resolved to absolute paths
- **Conditional Logic**: How conditional include paths are being evaluated

## Example Output

**Without Debug Mode:**

```
✓ missing-include-warning: Test that console warnings are shown when includes can't be found on disk
```

**With Debug Mode:**

```
DEBUG: allPathsToProcess: ['/path/to/template']
DEBUG: Processing templatePath: /path/to/template
DEBUG: resolveTemplate - Config parsed successfully: { include: [...] }
DEBUG: Processing conditional include: ../folder/file.txt -> src/file.txt
DEBUG: TemplateResolver - Resolving physical path:
  - logicalSource: ../folder/file.txt
  - physicalSource: ../folder/file.txt
  - templatePath: /path/to/template
⚠️  Include skipped: Path not found "/path/to/missing/file.txt"
```

## Warnings vs Debug Logs

- **Warnings** (⚠️): Always shown, indicate actual issues that need attention
- **Debug Logs**: Only shown in debug mode, provide detailed troubleshooting information

## Use Cases

Debug mode is particularly useful for:

- Troubleshooting template resolution issues
- Understanding the order of file processing
- Debugging conditional include path logic
- Investigating file merging behavior
- Verifying config file parsing
