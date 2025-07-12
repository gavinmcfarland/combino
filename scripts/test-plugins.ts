#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = process.cwd();

const plugins: { name: string; package: string }[] = [
	{ name: 'ejs', package: '@combino/plugin-ejs' },
	{ name: 'eta', package: '@combino/plugin-eta' },
	{ name: 'edge', package: '@combino/plugin-edge' },
	{ name: 'ejs-mate', package: '@combino/plugin-ejs-mate' },
	{ name: 'strip-ts', package: '@combino/plugin-strip-ts' },
];

console.log('🧪 Testing Combino Plugins');
console.log('============================\n');

// Test 1: Build all plugins
console.log('📦 Building all plugins...');
try {
	execSync('pnpm run build', { cwd: rootDir, stdio: 'inherit', shell: '/bin/bash' });
	console.log('✅ All plugins built successfully\n');
} catch (error: any) {
	console.error('❌ Build failed:', error.message);
	process.exit(1);
}

// Test 2: Test imports for each plugin
console.log('📥 Testing plugin imports...');
const importResults: { plugin: string; status: string; error?: string }[] = [];

for (const plugin of plugins) {
	console.log(`\n----------------------------------------`);
	console.log(`Testing ${plugin.package}`);
	console.log(`----------------------------------------`);

	try {
		// Test import
		console.log('Building plugin...');
		execSync('pnpm run build', {
			cwd: join(rootDir, 'packages', 'plugins', plugin.name),
			stdio: 'pipe',
			shell: '/bin/bash',
		});

		console.log('Testing import...');
		const pluginModule = await import(resolve(rootDir, 'packages', 'plugins', plugin.name, 'dist', 'index.js'));
		const pluginExport = pluginModule.default;
		console.log('Plugin loaded successfully:', typeof pluginExport);
		console.log('Plugin is function:', typeof pluginExport === 'function');

		if (typeof pluginExport === 'function') {
			const instance = pluginExport();
			console.log('Plugin instance created:', typeof instance);
			console.log(
				'Plugin has hooks:',
				Object.keys(instance).filter((key) => typeof (instance as any)[key] === 'function'),
			);
		}

		importResults.push({ plugin: plugin.name, status: 'PASSED' });
		console.log(`✅ ${plugin.package} passed`);
	} catch (error: any) {
		console.error(`❌ ${plugin.package} failed:`, error.message);
		importResults.push({ plugin: plugin.name, status: 'FAILED', error: error.message });
	}
}

// Test 3: Integration test - import all plugins together
console.log('\n----------------------------------------');
console.log('Testing Plugin Integration');
console.log('----------------------------------------');

try {
	const ejsPlugin = (await import(resolve(rootDir, 'packages/plugins/ejs/dist/index.js'))).default;
	const etaPlugin = (await import(resolve(rootDir, 'packages/plugins/eta/dist/index.js'))).default;
	const edgePlugin = (await import(resolve(rootDir, 'packages/plugins/edge/dist/index.js'))).default;
	const ejsMatePlugin = (await import(resolve(rootDir, 'packages/plugins/ejs-mate/dist/index.js'))).default;
	const stripTsPlugin = (await import(resolve(rootDir, 'packages/plugins/strip-ts/dist/index.js'))).default;

	const allPlugins = [
		{ name: 'EJS Plugin', plugin: ejsPlugin },
		{ name: 'ETA Plugin', plugin: etaPlugin },
		{ name: 'Edge Plugin', plugin: edgePlugin },
		{ name: 'EJS-Mate Plugin', plugin: ejsMatePlugin },
		{ name: 'Strip-TS Plugin', plugin: stripTsPlugin },
	];

	console.log('All plugins imported successfully:');
	allPlugins.forEach(({ name, plugin }) => {
		console.log(`- ${name}: ${typeof plugin}`);
	});

	console.log(
		'\nPlugin 1 returns object with hooks:',
		Object.keys(ejsPlugin()).filter((key) => typeof ejsPlugin()[key] === 'function'),
	);
	console.log(
		'Plugin 2 returns object with hooks:',
		Object.keys(etaPlugin()).filter((key) => typeof etaPlugin()[key] === 'function'),
	);
	console.log(
		'Plugin 3 returns object with hooks:',
		Object.keys(edgePlugin()).filter((key) => typeof edgePlugin()[key] === 'function'),
	);
	console.log(
		'Plugin 4 returns object with hooks:',
		Object.keys(ejsMatePlugin()).filter((key) => typeof ejsMatePlugin()[key] === 'function'),
	);
	console.log(
		'Plugin 5 returns object with hooks:',
		Object.keys(stripTsPlugin()).filter((key) => typeof stripTsPlugin()[key] === 'function'),
	);

	console.log('\n✅ Plugin integration test passed');
} catch (error: any) {
	console.error('❌ Integration test failed:', error.message);
	process.exit(1);
}

// Summary
console.log('\n============================================================');
console.log('Test Results Summary');
console.log('============================================================');

console.log('Builds: ✅ PASSED');
console.log('\nIndividual Plugins:');
importResults.forEach((result) => {
	const status = result.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED';
	console.log(`  ${result.plugin}: ${status}`);
});

console.log('\nIntegration: ✅ PASSED');

const failedPlugins = importResults.filter((r) => r.status === 'FAILED');
if (failedPlugins.length > 0) {
	console.log('\n💥 Some plugins failed!');
	process.exit(1);
} else {
	console.log('\n🎉 All tests passed!');
}
