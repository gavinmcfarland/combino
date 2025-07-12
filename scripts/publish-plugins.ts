#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const plugins = [
	'@combino/plugin-ejs',
	'@combino/plugin-eta',
	'@combino/plugin-edge',
	'@combino/plugin-ejs-mate',
	'@combino/plugin-strip-ts',
];

console.log('🚀 Publishing Combino plugins...\n');

for (const plugin of plugins) {
	try {
		console.log(`📦 Publishing ${plugin}...`);
		execSync(`pnpm publish --filter=${plugin}`, {
			stdio: 'inherit',
			cwd: path.resolve(__dirname, '..'),
		});
		console.log(`✅ Successfully published ${plugin}\n`);
	} catch (error) {
		console.error(`❌ Failed to publish ${plugin}:`, (error as Error).message);
		process.exit(1);
	}
}

console.log('🎉 All plugins published successfully!');
