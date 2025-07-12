#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const plugins = [
    '@combino/plugin-ejs',
    '@combino/plugin-eta',
    '@combino/plugin-edge',
    '@combino/plugin-ejs-mate',
    '@combino/plugin-strip-ts'
];

console.log('🚀 Publishing Combino plugins...\n');

for (const plugin of plugins) {
    try {
        console.log(`📦 Publishing ${plugin}...`);
        execSync(`npm publish --workspace=${plugin}`, {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '..')
        });
        console.log(`✅ Successfully published ${plugin}\n`);
    } catch (error) {
        console.error(`❌ Failed to publish ${plugin}:`, error.message);
        process.exit(1);
    }
}

console.log('🎉 All plugins published successfully!');
