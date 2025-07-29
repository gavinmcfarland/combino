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

// Create a rebase function
const createRebaseFunction = (outputFilePath, options = {}) => {
	return (targetPath, pathType) => {
		const finalOptions = { ...options };
		if (pathType && ['cwd', 'relative', 'absolute'].includes(pathType)) {
			finalOptions.pathType = pathType;
		}
		return calculateRebasePath(targetPath, outputFilePath, finalOptions);
	};
};

console.log('🔧 Dynamic Paths Demo\n');

// Simulate template data
const templateData = {
	srcDir: 'src',
	componentName: 'Button',
	baseDir: 'packages',
	framework: 'typescript',
	language: 'ts'
};

// Simulate output file path
const outputFilePath = path.resolve(process.cwd(), 'examples/basic/tsconfig.json');

// Create rebase function
const rebase = createRebaseFunction(outputFilePath, { pathType: 'relative' });

console.log('📁 Template Data:');
console.log(JSON.stringify(templateData, null, 2));
console.log('');

console.log('🎯 Dynamic Path Examples:');
console.log('');

// Example 1: Simple dynamic path
const dynamicPath1 = rebase(templateData.srcDir);
console.log(`rebase('${templateData.srcDir}') → "${dynamicPath1}"`);

// Example 2: Nested dynamic path
const dynamicPath2 = rebase(`${templateData.srcDir}/components`);
console.log(`rebase('${templateData.srcDir}/components') → "${dynamicPath2}"`);

// Example 3: Mixed dynamic path
const dynamicPath3 = rebase(`${templateData.srcDir}/${templateData.componentName}`);
console.log(`rebase('${templateData.srcDir}/${templateData.componentName}') → "${dynamicPath3}"`);

// Example 4: Complex dynamic path
const dynamicPath4 = rebase(`${templateData.baseDir}/${templateData.framework}/${templateData.language}`);
console.log(`rebase('${templateData.baseDir}/${templateData.framework}/${templateData.language}') → "${dynamicPath4}"`);

// Example 5: Dynamic path with pathType override
const dynamicPath5 = rebase(templateData.srcDir, 'cwd');
console.log(`rebase('${templateData.srcDir}', 'cwd') → "${dynamicPath5}"`);

console.log('');
console.log('💡 Usage in Templates:');
console.log('');
console.log('// Static paths (processed before EJS)');
console.log('rebase("src") → "./src"');
console.log('');
console.log('// Dynamic paths (processed by EJS)');
console.log('rebase(`${srcDir}`) → "./src"');
console.log('rebase(`${srcDir}/components`) → "./src/components"');
console.log('rebase(`${srcDir}/${componentName}`, "cwd") → "src/Button"');
console.log('');
console.log('// Mixed usage in JSON config');
console.log('{');
console.log('  "typeRoots": ["<%= rebase(`${srcDir}/@types`) %>"],');
console.log('  "include": ["<%= rebase(`${srcDir}/**/*.ts`) %>"],');
console.log('  "exclude": ["<%= rebase("node_modules") %>"]');
console.log('}');
