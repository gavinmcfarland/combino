#!/usr/bin/env node

/**
 * Test script for Combino plugins
 * Verifies that all plugins can be built and imported correctly
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const plugins = [
	{ name: 'ejs', package: '@combino/plugin-ejs' },
	{ name: 'eta', package: '@combino/plugin-eta' },
	{ name: 'edge', package: '@combino/plugin-edge' },
	{ name: 'ejs-mate', package: '@combino/plugin-ejs-mate' },
	{ name: 'strip-ts', package: '@combino/plugin-strip-ts' }
];

console.log('🧪 Testing Combino Plugins');
console.log('============================\n');

// Test 1: Build all plugins
console.log('📦 Building all plugins...');
try {
	execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
	console.log('✅ All plugins built successfully\n');
} catch (error) {
	console.error('❌ Build failed:', error.message);
	process.exit(1);
}

// Test 2: Test imports for each plugin
console.log('📥 Testing plugin imports...');
const importResults = [];

for (const plugin of plugins) {
	console.log(`\n----------------------------------------`);
	console.log(`Testing ${plugin.package}`);
	console.log(`----------------------------------------`);

	try {
		// Test import
		console.log('Building plugin...');
		execSync('npm run build', {
			cwd: join(rootDir, 'packages', 'plugins', plugin.name),
			stdio: 'pipe'
		});

		console.log('Testing import...');
		const importTest = `
      import plugin from './dist/index.js';
      console.log('Plugin loaded successfully:', typeof plugin);
      console.log('Plugin is function:', typeof plugin === 'function');

      if (typeof plugin === 'function') {
        const instance = plugin();
        console.log('Plugin instance created:', typeof instance);
        console.log('Plugin has hooks:', Object.keys(instance).filter(key =>
          typeof instance[key] === 'function'
        ));
      }
    `;

		execSync(`node -e "${importTest}"`, {
			cwd: join(rootDir, 'packages', 'plugins', plugin.name),
			stdio: 'inherit'
		});

		importResults.push({ plugin: plugin.name, status: 'PASSED' });
		console.log(`✅ ${plugin.package} passed`);

	} catch (error) {
		console.error(`❌ ${plugin.package} failed:`, error.message);
		importResults.push({ plugin: plugin.name, status: 'FAILED', error: error.message });
	}
}

// Test 3: Integration test - import all plugins together
console.log('\n----------------------------------------');
console.log('Testing Plugin Integration');
console.log('----------------------------------------');

try {
	const integrationTest = `
    import ejsPlugin from './packages/plugins/ejs/dist/index.js';
    import etaPlugin from './packages/plugins/eta/dist/index.js';
    import edgePlugin from './packages/plugins/edge/dist/index.js';
    import ejsMatePlugin from './packages/plugins/ejs-mate/dist/index.js';
    import stripTsPlugin from './packages/plugins/strip-ts/dist/index.js';

    const plugins = [
      { name: 'EJS Plugin', plugin: ejsPlugin },
      { name: 'ETA Plugin', plugin: etaPlugin },
      { name: 'Edge Plugin', plugin: edgePlugin },
      { name: 'EJS-Mate Plugin', plugin: ejsMatePlugin },
      { name: 'Strip-TS Plugin', plugin: stripTsPlugin }
    ];

    console.log('All plugins imported successfully:');
    plugins.forEach(({ name, plugin }) => {
      console.log(\`- \${name}: \${typeof plugin}\`);
    });

    console.log('\\nPlugin 1 returns object with hooks:', Object.keys(ejsPlugin()).filter(key =>
      typeof ejsPlugin()[key] === 'function'
    ));
    console.log('Plugin 2 returns object with hooks:', Object.keys(etaPlugin()).filter(key =>
      typeof etaPlugin()[key] === 'function'
    ));
    console.log('Plugin 3 returns object with hooks:', Object.keys(edgePlugin()).filter(key =>
      typeof edgePlugin()[key] === 'function'
    ));
    console.log('Plugin 4 returns object with hooks:', Object.keys(ejsMatePlugin()).filter(key =>
      typeof ejsMatePlugin()[key] === 'function'
    ));
    console.log('Plugin 5 returns object with hooks:', Object.keys(stripTsPlugin()).filter(key =>
      typeof stripTsPlugin()[key] === 'function'
    ));

    console.log('\\n✅ Plugin integration test passed');
  `;

	execSync(`node -e "${integrationTest}"`, {
		cwd: rootDir,
		stdio: 'inherit'
	});

	console.log('✅ Integration test passed');

} catch (error) {
	console.error('❌ Integration test failed:', error.message);
	process.exit(1);
}

// Summary
console.log('\n============================================================');
console.log('Test Results Summary');
console.log('============================================================');

console.log('Builds: ✅ PASSED');
console.log('\nIndividual Plugins:');
importResults.forEach(result => {
	const status = result.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED';
	console.log(`  ${result.package}: ${status}`);
});

console.log('\nIntegration: ✅ PASSED');

const failedPlugins = importResults.filter(r => r.status === 'FAILED');
if (failedPlugins.length > 0) {
	console.log('\n💥 Some plugins failed!');
	process.exit(1);
} else {
	console.log('\n🎉 All tests passed!');
}
