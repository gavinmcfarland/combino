#!/usr/bin/env node

import path from 'path';

// Simulate the rebase function logic
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

    let resultPath;

    switch (pathType) {
        case 'cwd':
            resultPath = path.relative(process.cwd(), resolvedTargetPath);
            break;

        case 'absolute':
            resultPath = resolvedTargetPath;
            break;

        case 'relative':
        default:
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

console.log('🔧 Simple Dot Notation Test\n');

// Test cases
const testCases = [
    { target: 'src', outputFile: 'package.json', description: 'Same directory' },
    { target: 'src', outputFile: 'src/main.ts', description: 'Parent directory' },
    { target: 'src', outputFile: 'dist/build.js', description: 'Sibling directory' },
    { target: 'src', outputFile: 'src/components/Button.tsx', description: 'Child directory' }
];

testCases.forEach(({ target, outputFile, description }) => {
    console.log(`📁 ${description}:`);
    console.log(`   Target: ${target}, Output: ${outputFile}`);

    const cwd = calculateRebasePath(target, outputFile, { pathType: 'cwd' });
    const relative = calculateRebasePath(target, outputFile, { pathType: 'relative' });
    const absolute = calculateRebasePath(target, outputFile, { pathType: 'absolute' });

    console.log(`   cwd:      "${cwd}"`);
    console.log(`   relative: "${relative}"`);
    console.log(`   absolute: "${absolute}"`);
    console.log('');
});
