import { Combino } from 'combino';
import stripTS from 'combino/plugins/strip-ts';
import ejs from 'combino/plugins/ejs';
import * as plugins from 'combino/plugins';

// Test that all plugins are available
console.log('Available plugins:', Object.keys(plugins));

// Test that individual plugins can be imported and used
const stripTSPlugin = stripTS({ skip: false });
const ejsPlugin = ejs();

console.log('Strip TS plugin type:', typeof stripTSPlugin);
console.log('EJS plugin type:', typeof ejsPlugin);

// Test with Combino
const combino = new Combino();

// This would normally be used with actual templates
console.log('Plugins are ready to use with Combino!');
