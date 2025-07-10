// Export all plugins for easy importing
export { default as ejs } from './ejs.js';
export { default as ejsMate } from './ejs-mate.js';
export { default as ejsProcessConfig } from './ejs-process-config.js';
export { default as eta } from './eta.js';
export { default as handlebars } from './handlebars.js';
export { default as mustache } from './mustache.js';
export { default as stripTS } from './strip-ts.js';

// Re-export types that plugins might need
export type { Plugin, PluginOptions, FileHook, FileHookContext, FileHookResult } from '../types.js';
