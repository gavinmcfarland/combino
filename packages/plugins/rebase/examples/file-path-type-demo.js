#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the actual rebase plugin
import rebasePlugin from '../dist/index.js';

// Demo scenarios
console.log('�� Rebase Plugin File Method Demo\n');

// Create a rebase function with the actual plugin
const createRebaseFunction = (outputFilePath, options = {}) => {
	const plugin = rebasePlugin(options);
	return (targetPath, pathType, outputFormat) => {
		const finalOptions = { ...options };
		if (pathType && ['cwd', 'relative', 'absolute'].includes(pathType)) {
			finalOptions.pathType = pathType;
		}

		// Create a mock context to simulate the plugin behavior
		const context = {
			sourcePath: 'template/file.json',
			id: outputFilePath,
			content: `{"path": "<%= rebase('${targetPath}', '${pathType || finalOptions.pathType || 'relative'}', '${outputFormat || ''}') %>"}`,
			data: {}
		};

		// Use the plugin's compile hook to get the rebase function
		plugin.compile(context);
		return context.data.rebase(targetPath, pathType, outputFormat);
	};
};

// Scenario 1: File in examples/basic/src/ui/tsconfig.json referencing vite-env.d.ts
const outputFile1 = path.resolve(process.cwd(), 'examples/basic/src/ui/tsconfig.json');
const target1 = 'vite-env.d.ts';
const rebase1 = createRebaseFunction(outputFile1);

console.log('📁 Scenario 1: File at examples/basic/src/ui/tsconfig.json');
console.log(`🎯 Target: ${target1}\n`);

console.log('Standard Path Types:');
console.log(`  cwd:      "${rebase1(target1, { format: 'cwd' })}"`);
console.log(`  relative: "${rebase1(target1, { format: 'relative' })}"`);
console.log(`  absolute: "${rebase1(target1, { format: 'absolute' })}"`);
console.log('');

console.log('File Method Combinations:');
console.log(`  rebase('${target1}', {locate: true})                    → "${rebase1(target1, { locate: true })}"`);
console.log(`  rebase('${target1}', {format: 'cwd', locate: true})     → "${rebase1(target1, { format: 'cwd', locate: true })}"`);
console.log(`  rebase('${target1}', {format: 'relative', locate: true}) → "${rebase1(target1, { format: 'relative', locate: true })}"`);
console.log(`  rebase('${target1}', {format: 'absolute', locate: true}) → "${rebase1(target1, { format: 'absolute', locate: true })}"`);
console.log('');

// Scenario 2: File in examples/basic/src/main/tsconfig.json referencing node_modules/@types
const outputFile2 = path.resolve(process.cwd(), 'examples/basic/src/main/tsconfig.json');
const target2 = 'node_modules/@types';

console.log('📁 Scenario 2: File at examples/basic/src/main/tsconfig.json');
console.log(`🎯 Target: ${target2}\n`);

console.log('Standard Path Types:');
console.log(`  cwd:      "${rebase1(target2, { format: 'cwd' })}"`);
console.log(`  relative: "${rebase1(target2, { format: 'relative' })}"`);
console.log(`  absolute: "${rebase1(target2, { format: 'absolute' })}"`);
console.log('');

console.log('File Method Combinations:');
console.log(`  rebase('${target2}', {locate: true})                    → "${rebase1(target2, { locate: true })}"`);
console.log(`  rebase('${target2}', {format: 'cwd', locate: true})     → "${rebase1(target2, { format: 'cwd', locate: true })}"`);
console.log(`  rebase('${target2}', {format: 'relative', locate: true}) → "${rebase1(target2, { format: 'relative', locate: true })}"`);
console.log(`  rebase('${target2}', {format: 'absolute', locate: true}) → "${rebase1(target2, { format: 'absolute', locate: true })}"`);
console.log('');

// Scenario 3: File in examples/basic/package.json referencing src
const outputFile3 = path.resolve(process.cwd(), 'examples/basic/package.json');
const target3 = 'src';

console.log('📁 Scenario 3: File at examples/basic/package.json');
console.log(`🎯 Target: ${target3}\n`);

console.log('Standard Path Types:');
console.log(`  cwd:      "${rebase1(target3, { format: 'cwd' })}"`);
console.log(`  relative: "${rebase1(target3, { format: 'relative' })}"`);
console.log(`  absolute: "${rebase1(target3, { format: 'absolute' })}"`);
console.log('');

console.log('File Method Combinations:');
console.log(`  rebase('${target3}', {locate: true})                    → "${rebase1(target3, { locate: true })}"`);
console.log(`  rebase('${target3}', {format: 'cwd', locate: true})     → "${rebase1(target3, { format: 'cwd', locate: true })}"`);
console.log(`  rebase('${target3}', {format: 'relative', locate: true}) → "${rebase1(target3, { format: 'relative', locate: true })}"`);
console.log(`  rebase('${target3}', {format: 'absolute', locate: true}) → "${rebase1(target3, { format: 'absolute', locate: true })}"`);
console.log('');

console.log('💡 Usage in templates:');
console.log('  // Standard usage (uses plugin default)');
console.log('  <%= rebase("vite-env.d.ts") %>                                    // Uses the configured pathType');
console.log('  <%= rebase("vite-env.d.ts", {format: "cwd"}) %>                  // Forces cwd path type');
console.log('  <%= rebase("vite-env.d.ts", {format: "relative"}) %>             // Forces relative path type');
console.log('  <%= rebase("vite-env.d.ts", {format: "absolute"}) %>             // Forces absolute path type');
console.log('');
console.log('  // File location method (works with files and folders)');
console.log('  <%= rebase("vite-env.d.ts", {locate: true}) %>                   // Finds location, returns relative');
console.log('  <%= rebase("vite-env.d.ts", {format: "cwd", locate: true}) %>    // Finds location, returns cwd-relative');
console.log('  <%= rebase("vite-env.d.ts", {format: "absolute", locate: true}) %> // Finds location, returns absolute');
console.log('');
console.log('  // Works with folders too!');
console.log('  <%= rebase("src/components", {locate: true}) %>                  // Finds folder location, returns relative');
console.log('  <%= rebase("node_modules/@types", {format: "cwd", locate: true}) %> // Finds folder location, returns cwd-relative');
console.log('  <%= rebase("dist", {format: "absolute", locate: true}) %>        // Finds folder location, returns absolute');
console.log('');

console.log('🎯 Key benefits of the new API:');
console.log('  - Clear and intuitive options object approach');
console.log('  - No confusing argument position changes');
console.log('  - Works with both files and folders');
console.log('  - Can combine locate and format options');
console.log('  - Function signature: rebase(targetPath, options?)');
