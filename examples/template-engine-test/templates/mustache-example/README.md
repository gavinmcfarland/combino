# {{name}}

This is a {{description}} project.

## Features

{{#features}}

- {{.}}
  {{/features}}

## Configuration

- **Framework**: {{framework}}
- **Language**: {{language}}
- **Version**: {{version}}

{{#hasTests}}

## Testing

This project includes comprehensive tests.
{{/hasTests}}

{{^hasTests}}

## Testing

No tests configured yet.
{{/hasTests}}
