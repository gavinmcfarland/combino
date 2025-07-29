import * as path from 'path';
import * as fs from 'fs';

// Define the Plugin interface locally since we can't import from combino
export interface Plugin {
	discover?: (context: any) => Promise<any> | any;
	compile?: (context: any) => Promise<any> | any;
	assemble?: (context: any) => Promise<any> | any;
	output?: (context: any) => Promise<void> | void;
}

export interface FileHookContext {
	sourcePath: string;
	id: string;
	content: string;
	data: Record<string, any>;
	allTemplates?: any[];
}

export interface FileHookResult {
	content: string;
	id?: string;
}

export interface RebaseOptions {
	/** Optional base directory for relative calculations (default: output directory) */
	baseDir?: string;
	/** Whether to normalize paths (default: true) */
	normalize?: boolean;
	/** Project root directory (default: current working directory) */
	projectRoot?: string;
	/** Type of path to output: "cwd" (relative to process.cwd()), "relative" (relative to file), or "absolute" (full path) */
	pathType?: 'cwd' | 'relative' | 'absolute';
}

/**
 * Calculates the path from the final output location to a target path based on the specified path type
 */
function calculateRebasePath(targetPath: string, outputFilePath: string, options: RebaseOptions = {}): string {
	const {
		baseDir = path.dirname(outputFilePath),
		normalize = true,
		projectRoot = process.cwd(),
		pathType = 'relative',
	} = options;

	// Resolve the target path relative to project root
	const resolvedTargetPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(projectRoot, targetPath);

	// Resolve the output file path
	const resolvedOutputPath = path.resolve(outputFilePath);

	let resultPath: string;

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

/**
 * Creates a rebase function that can be used in templates
 */
function createRebaseFunction(
	outputFilePath: string,
	options: RebaseOptions = {},
): (targetPath: string, pathType?: string) => string {
	return (targetPath: string, pathType?: string): string => {
		if (typeof targetPath !== 'string') {
			throw new Error('rebase() expects a string argument');
		}

		// If pathType is provided as second argument, use it; otherwise use the default from options
		const finalOptions = { ...options };
		if (pathType && ['cwd', 'relative', 'absolute'].includes(pathType)) {
			finalOptions.pathType = pathType as 'cwd' | 'relative' | 'absolute';
		}

		return calculateRebasePath(targetPath, outputFilePath, finalOptions);
	};
}

/**
 * Rebase Plugin Factory Function
 * Creates a plugin that provides a rebase() function for relative path calculations
 */
export default function plugin(options: RebaseOptions = {}): Plugin {
	return {
		// Compile hook: Add rebase function to template data and process static rebase() calls
		compile: async (context: FileHookContext): Promise<FileHookResult | void> => {
			// Only process files that contain rebase() calls
			if (!context.content.includes('rebase(')) {
				return;
			}

			// Create the rebase function for this specific file
			const rebase = createRebaseFunction(context.id, options);

			// Add rebase function to the template data so EJS can access it
			// Note: This modifies the context.data object directly
			context.data.rebase = rebase;

			// Process static rebase() calls (those with literal strings) before EJS compilation
			let processedContent = context.content;

			// Replace static rebase() calls with their calculated values
			// This regex matches rebase('path') or rebase("path") patterns with literal strings
			processedContent = processedContent.replace(/rebase\(['"`]([^'"`]+)['"`]\)/g, (match, targetPath) => {
				// Skip if the targetPath contains template variables (${...})
				if (targetPath.includes('${')) {
					return match; // Let EJS handle this
				}

				try {
					const relativePath = rebase(targetPath);
					return `"${relativePath}"`;
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.warn(`Warning: Failed to process rebase('${targetPath}'):`, errorMessage);
					return match; // Return original if processing fails
				}
			});

			// Handle static rebase('path', 'pathType') patterns
			processedContent = processedContent.replace(
				/rebase\(['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\)/g,
				(match, targetPath, pathType) => {
					// Skip if the targetPath contains template variables (${...})
					if (targetPath.includes('${')) {
						return match; // Let EJS handle this
					}

					try {
						const relativePath = rebase(targetPath, pathType);
						return `"${relativePath}"`;
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						console.warn(
							`Warning: Failed to process rebase('${targetPath}', '${pathType}'):`,
							errorMessage,
						);
						return match; // Return original if processing fails
					}
				},
			);

			// Also handle static rebase() calls without quotes
			processedContent = processedContent.replace(/rebase\(([^)]+)\)/g, (match, targetPath) => {
				// Skip if it's already been processed (has quotes)
				if (match.includes('"') || match.includes("'") || match.includes('`')) {
					return match;
				}

				// Skip if the targetPath contains template variables (${...})
				if (targetPath.includes('${')) {
					return match; // Let EJS handle this
				}

				// Check if this is a two-argument call (path, pathType)
				const args = targetPath.split(',').map((arg: string) => arg.trim());
				if (args.length === 2) {
					try {
						const relativePath = rebase(args[0], args[1]);
						return `"${relativePath}"`;
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						console.warn(`Warning: Failed to process rebase(${args[0]}, ${args[1]}):`, errorMessage);
						return match; // Return original if processing fails
					}
				}

				try {
					const relativePath = rebase(targetPath.trim());
					return `"${relativePath}"`;
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.warn(`Warning: Failed to process rebase(${targetPath}):`, errorMessage);
					return match; // Return original if processing fails
				}
			});

			return { content: processedContent };
		},

		// Assemble hook: Process any remaining rebase() calls after EJS compilation
		assemble: async (context: FileHookContext): Promise<FileHookResult | void> => {
			// Only process files that contain rebase() calls
			if (!context.content.includes('rebase(')) {
				return;
			}

			// Create the rebase function for this specific file
			const rebase = createRebaseFunction(context.id, options);

			// Process any remaining rebase() calls after EJS compilation
			let processedContent = context.content;

			// Replace any remaining rebase() calls with their calculated values
			processedContent = processedContent.replace(/rebase\(['"`]([^'"`]+)['"`]\)/g, (match, targetPath) => {
				try {
					const relativePath = rebase(targetPath);
					return `"${relativePath}"`;
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.warn(`Warning: Failed to process rebase('${targetPath}'):`, errorMessage);
					return match; // Return original if processing fails
				}
			});

			// Handle any remaining rebase('path', 'pathType') patterns
			processedContent = processedContent.replace(
				/rebase\(['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\)/g,
				(match, targetPath, pathType) => {
					try {
						const relativePath = rebase(targetPath, pathType);
						return `"${relativePath}"`;
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						console.warn(
							`Warning: Failed to process rebase('${targetPath}', '${pathType}'):`,
							errorMessage,
						);
						return match; // Return original if processing fails
					}
				},
			);

			return { content: processedContent };
		},
	};
}
