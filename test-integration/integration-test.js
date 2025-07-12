
import ejsPlugin from '../packages/plugins/ejs/dist/index.js';
import etaPlugin from '../packages/plugins/eta/dist/index.js';
import edgePlugin from '../packages/plugins/edge/dist/index.js';
import ejsMatePlugin from '../packages/plugins/ejs-mate/dist/index.js';
import stripTSPlugin from '../packages/plugins/strip-ts/dist/index.js';

console.log('All plugins imported successfully:');
console.log('- EJS Plugin:', typeof ejsPlugin);
console.log('- ETA Plugin:', typeof etaPlugin);
console.log('- Edge Plugin:', typeof edgePlugin);
console.log('- EJS-Mate Plugin:', typeof ejsMatePlugin);
console.log('- Strip-TS Plugin:', typeof stripTSPlugin);

// Test that all plugins return functions
const plugins = [ejsPlugin, etaPlugin, edgePlugin, ejsMatePlugin, stripTSPlugin];
plugins.forEach((plugin, index) => {
  const pluginInstance = plugin();
  console.log(`Plugin ${index + 1} returns object with hooks:`,
    typeof pluginInstance === 'object' &&
    (pluginInstance.compile || pluginInstance.assemble || pluginInstance.discover || pluginInstance.output)
  );
});
