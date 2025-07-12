// Example: How to import plugins from combino

// Import individual plugins
import stripTS from 'combino/plugins/strip-ts';
import ejs from 'combino/plugins/ejs';
import handlebars from 'combino/plugins/handlebars';
import mustache from 'combino/plugins/mustache';
import ejsMate from 'combino/plugins/ejs-mate';
import ejsProcessConfig from 'combino/plugins/ejs-process-config';

// Or import all plugins at once
import * as plugins from 'combino/plugins';

// Usage example
console.log('Available plugins:', Object.keys(plugins));

// Example usage of strip-ts plugin
const stripTSPlugin = stripTS({ skip: false });
console.log('Strip TS plugin:', stripTSPlugin);
