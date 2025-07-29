#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simulate the rebase function with different path types
function calculateRebasePath(targetPath, outputFilePath, options = {}) {
    const {
        baseDir = path.dirname(outputFilePath),
        normalize = true,
        projectRoot = process.cwd(),
        pathType = 'relative'
    } = options;

    // Resolve the target path relative to project root
    const resolvedTargetPath = path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(projectRoot, targetPath);

    // Resolve the output file path
    const resolvedOutputPath = path.resolve(outputFilePath);

    let resultPath;

    switch (pathType) {
        case 'cwd':
            // Calculate path relative to process.cwd()
            resultPath = path.relative(process.cwd(), resolvedTargetPath);
            break;

        case 'absolute':
            // Return absolute path
            resultPath = resolvedTargetPath;
            break;

        case 'relative':
        default:
            // Calculate relative path from output file location to target
            resultPath = path.relative(baseDir, resolvedTargetPath);
            break;
    }

    // Normalize the path if requested
    if (normalize) {
        resultPath = path.normalize(resultPath);
    }

    // Ensure the path uses forward slashes for consistency
    resultPath = resultPath.replace(/\\/g, '/');

    // Handle edge cases for relative paths
    if (pathType !== 'absolute') {
        if (resultPath === '') {
            return '.';
        }

        if (resultPath === '.') {
            return '.';
        }

        // Add dot notation for relative paths when not already present
        if (pathType === 'relative' && !resultPath.startsWith('./') && !resultPath.startsWith('../')) {
            resultPath = './' + resultPath;
        }
    }

    return resultPath;
}

// Demo scenarios
console.log('🔧 Rebase Plugin Path Type Demo\n');

// Create a rebase function with default options (relative path type)
const createRebaseFunction = (outputFilePath, options = {}) => {
    return (targetPath, pathType) => {
        const finalOptions = { ...options };
        if (pathType && ['cwd', 'relative', 'absolute'].includes(pathType)) {
            finalOptions.pathType = pathType;
        }
        return calculateRebasePath(targetPath, outputFilePath, finalOptions);
    };
};

// Scenario 1: File in examples/basic/src/main/tsconfig.json
const outputFile1 = path.resolve(process.cwd(), 'examples/basic/src/main/tsconfig.json');
const target1 = 'node_modules/@types';
const rebase1 = createRebaseFunction(outputFile1, { pathType: 'relative' }); // Default: relative

console.log('📁 Scenario 1: File at examples/basic/src/main/tsconfig.json');
console.log(`🎯 Target: ${target1}\n`);

console.log('Path Types:');
console.log(`  cwd:      "${calculateRebasePath(target1, outputFile1, { pathType: 'cwd' })}"`);
console.log(`  relative: "${calculateRebasePath(target1, outputFile1, { pathType: 'relative' })}"`);
console.log(`  absolute: "${calculateRebasePath(target1, outputFile1, { pathType: 'absolute' })}"`);
console.log('');

console.log('Function Override Demo (default: relative):');
console.log(`  rebase('${target1}')                    → "${rebase1(target1)}"`);
console.log(`  rebase('${target1}', 'cwd')             → "${rebase1(target1, 'cwd')}"`);
console.log(`  rebase('${target1}', 'relative')        → "${rebase1(target1, 'relative')}"`);
console.log(`  rebase('${target1}', 'absolute')        → "${rebase1(target1, 'absolute')}"`);
console.log('');

// Scenario 2: File in examples/basic/vite.config.ts
const outputFile2 = path.resolve(process.cwd(), 'examples/basic/vite.config.ts');
const target2 = 'src';

console.log('📁 Scenario 2: File at examples/basic/vite.config.ts');
console.log(`🎯 Target: ${target2}\n`);

console.log('Path Types:');
console.log(`  cwd:      "${calculateRebasePath(target2, outputFile2, { pathType: 'cwd' })}"`);
console.log(`  relative: "${calculateRebasePath(target2, outputFile2, { pathType: 'relative' })}"`);
console.log(`  absolute: "${calculateRebasePath(target2, outputFile2, { pathType: 'absolute' })}"`);
console.log('');

// Scenario 3: File in examples/basic/package.json
const outputFile3 = path.resolve(process.cwd(), 'examples/basic/package.json');
const target3 = 'src';

console.log('📁 Scenario 3: File at examples/basic/package.json');
console.log(`🎯 Target: ${target3}\n`);

console.log('Path Types:');
console.log(`  cwd:      "${calculateRebasePath(target3, outputFile3, { pathType: 'cwd' })}"`);
console.log(`  relative: "${calculateRebasePath(target3, outputFile3, { pathType: 'relative' })}"`);
console.log(`  absolute: "${calculateRebasePath(target3, outputFile3, { pathType: 'absolute' })}"`);
console.log('');

console.log('💡 Usage in templates:');
console.log('  <%= rebase("src") %>                    // Uses the configured pathType');
console.log('  <%= rebase("src", "cwd") %>             // Forces cwd path type');
console.log('  <%= rebase("src", "relative") %>        // Forces relative path type');
console.log('  <%= rebase("src", "absolute") %>        // Forces absolute path type');
console.log('  <%= rebase("node_modules/@types") %>    // Calculates appropriate path');
