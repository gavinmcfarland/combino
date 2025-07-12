import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';

export interface DirectoryCompareOptions {
	/** Whether to ignore file extensions when comparing */
	ignoreExtensions?: boolean;
	/** Whether to ignore line endings when comparing text files */
	ignoreLineEndings?: boolean;
	/** Whether to ignore whitespace differences */
	ignoreWhitespace?: boolean;
	/** Whether to parse and compare JSON files as objects (ignores formatting) */
	parseJson?: boolean;
	/** Custom file extensions to treat as text files for content comparison */
	textExtensions?: string[];
	/** Files to ignore (glob patterns) */
	ignoreFiles?: string[];
}

export interface DirectoryCompareResult {
	/** Whether the directories are identical */
	identical: boolean;
	/** List of differences found */
	differences: string[];
	/** Summary of the comparison */
	summary: string;
}

/**
 * Compares two directories recursively and returns whether they are identical
 */
export function compareDirectories(
	dir1: string,
	dir2: string,
	options: DirectoryCompareOptions = {},
): DirectoryCompareResult {
	const differences: string[] = [];
	const defaultTextExtensions = [
		'.txt',
		'.md',
		'.json',
		'.js',
		'.ts',
		'.jsx',
		'.tsx',
		'.html',
		'.css',
		'.scss',
		'.yaml',
		'.yml',
		'.xml',
		'.svg',
	];

	const textExtensions = options.textExtensions || defaultTextExtensions;

	function compareFiles(file1: string, file2: string, relativePath: string): void {
		try {
			const stat1 = statSync(file1);
			const stat2 = statSync(file2);

			// Check if both are files or both are directories
			if (stat1.isFile() !== stat2.isFile()) {
				differences.push(`${relativePath}: One is file, other is directory`);
				return;
			}

			if (stat1.isFile()) {
				// Compare file contents
				const ext = relativePath.substring(relativePath.lastIndexOf('.'));
				const isTextFile = textExtensions.includes(ext);
				const isJsonFile = ext === '.json';

				if (isTextFile) {
					let content1 = readFileSync(file1, 'utf-8');
					let content2 = readFileSync(file2, 'utf-8');

					// Handle JSON files specially if parseJson is enabled
					if (isJsonFile && options.parseJson) {
						try {
							const obj1 = JSON.parse(content1);
							const obj2 = JSON.parse(content2);
							if (JSON.stringify(obj1, null, 2) !== JSON.stringify(obj2, null, 2)) {
								differences.push(`${relativePath}: JSON content differs`);
							}
							return;
						} catch (error) {
							differences.push(`${relativePath}: Invalid JSON - ${error}`);
							return;
						}
					}

					if (options.ignoreLineEndings) {
						content1 = content1.replace(/\r\n/g, '\n');
						content2 = content2.replace(/\r\n/g, '\n');
					}

					if (options.ignoreWhitespace) {
						content1 = content1.trim();
						content2 = content2.trim();
					}

					if (content1 !== content2) {
						differences.push(`${relativePath}: Content differs`);
					}
				} else {
					// For binary files, compare file sizes
					if (stat1.size !== stat2.size) {
						differences.push(`${relativePath}: File sizes differ (${stat1.size} vs ${stat2.size})`);
					}
				}
			} else {
				// Both are directories, compare their contents
				compareDirectoriesRecursive(file1, file2, relativePath);
			}
		} catch (error) {
			differences.push(`${relativePath}: Error comparing files - ${error}`);
		}
	}

	function compareDirectoriesRecursive(dir1Path: string, dir2Path: string, relativePath: string): void {
		try {
			const items1 = readdirSync(dir1Path).sort();
			const items2 = readdirSync(dir2Path).sort();

			// Check if directories have the same number of items
			if (items1.length !== items2.length) {
				differences.push(`${relativePath}: Different number of items (${items1.length} vs ${items2.length})`);
				return;
			}

			// Compare each item
			for (let i = 0; i < items1.length; i++) {
				const item1 = items1[i];
				const item2 = items2[i];

				// Check if item names match (with optional extension ignoring)
				let namesMatch = item1 === item2;
				if (options.ignoreExtensions && !namesMatch) {
					const name1WithoutExt = item1.substring(0, item1.lastIndexOf('.'));
					const name2WithoutExt = item2.substring(0, item2.lastIndexOf('.'));
					namesMatch = name1WithoutExt === name2WithoutExt;
				}

				if (!namesMatch) {
					differences.push(`${relativePath}: Item names differ ("${item1}" vs "${item2}")`);
					continue;
				}

				const fullPath1 = join(dir1Path, item1);
				const fullPath2 = join(dir2Path, item2);
				const newRelativePath = relativePath ? join(relativePath, item1) : item1;

				compareFiles(fullPath1, fullPath2, newRelativePath);
			}
		} catch (error) {
			differences.push(`${relativePath}: Error reading directory - ${error}`);
		}
	}

	// Start the comparison
	compareDirectoriesRecursive(dir1, dir2, '');

	const identical = differences.length === 0;
	const summary = identical
		? `Directories are identical`
		: `Found ${differences.length} difference(s) between directories`;

	return {
		identical,
		differences,
		summary,
	};
}

/**
 * Asserts that two directories are identical, throwing an error with details if they're not
 */
export function assertDirectoriesEqual(
	actualDir: string,
	expectedDir: string,
	options: DirectoryCompareOptions = {},
): void {
	const result = compareDirectories(actualDir, expectedDir, options);

	if (!result.identical) {
		const errorMessage = [
			result.summary,
			'',
			'Differences found:',
			...result.differences.map((diff) => `  - ${diff}`),
			'',
			`Actual directory: ${actualDir}`,
			`Expected directory: ${expectedDir}`,
		].join('\n');

		throw new Error(errorMessage);
	}
}
