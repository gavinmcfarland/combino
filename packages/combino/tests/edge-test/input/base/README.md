# {{ project.name }}

{{ project.description }}

## Features

@each(feature in project.features)
- {{ feature }}
  @end

## Installation

```bash
npm install {{ project.name }}
```

## Usage

@if(project.examples)

### Examples

@each(example in project.examples)

#### {{ example.title }}

{{ example.description }}

```javascript
{{ html.safe(example.code) }}
```

@end
@else
Basic usage example coming soon.
@end

## License

{{ license }}
