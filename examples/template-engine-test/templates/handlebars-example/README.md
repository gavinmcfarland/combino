# {{name}}

This is a {{description}} project.

## Features

{{#each features}}

- {{this}}
  {{/each}}

## Configuration

- **Framework**: {{framework}}
- **Language**: {{language}}
- **Version**: {{version}}

{{#if hasTests}}

## Testing

This project includes comprehensive tests.
{{/if}}

{{#unless hasTests}}

## Testing

No tests configured yet.
{{/unless}}
