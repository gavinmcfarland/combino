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
 * Calculates the relative path from the final output location to a target path
 */
function calculateRebasePath(targetPath: string, outputFilePath: string, options: RebaseOptions = {}): string {
	const { baseDir = path.dirname(outputFilePath), normalize = true, projectRoot = process.cwd() } = options;

	// Resolve the target path relative to project root
	const resolvedTargetPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(projectRoot, targetPath);

	// Resolve the output file path
	const resolvedOutputPath = path.resolve(outputFilePath);

	// Calculate relative path from output file location to target
	let relativePath = path.relative(baseDir, resolvedTargetPath);

	// Normalize the path if requested
	if (normalize) {
		relativePath = path.normalize(relativePath);
	}

	// Ensure the path uses forward slashes for consistency
	relativePath = relativePath.replace(/\\/g, '/');

	// Handle edge cases
	if (relativePath === '') {
		return '.';
	}

	if (relativePath === '.') {
		return '.';
	}

	return relativePath;
}

/**
 * Creates a rebase function that can be used in templates
 */
function createRebaseFunction(outputFilePath: string, options: RebaseOptions = {}): (targetPath: string) => string {
	return (targetPath: string): string => {
		if (typeof targetPath !== 'string') {
			throw new Error('rebase() expects a string argument');
		}

		return calculateRebasePath(targetPath, outputFilePath, options);
	};
}

/**
 * Rebase Plugin Factory Function
 * Creates a plugin that provides a rebase() function for relative path calculations
 */
export default function plugin(options: RebaseOptions = {}): Plugin {
	return {
		// Compile hook: Preprocess rebase() calls before EJS compilation
		compile: async (context: FileHookContext): Promise<FileHookResult | void> => {
			// Only process files that contain rebase() calls
			if (!context.content.includes('rebase(')) {
				return;
			}

			// Create the rebase function for this specific file
			const rebase = createRebaseFunction(context.id, options);

			// Process rebase() calls in the content before EJS compilation
			// This replaces rebase() calls with their calculated values
			let processedContent = context.content;

			// Replace rebase() calls with their calculated values
			// This regex matches rebase('path') or rebase("path") patterns
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

			// Also handle rebase() calls without quotes (for template engines that support it)
			processedContent = processedContent.replace(/rebase\(([^)]+)\)/g, (match, targetPath) => {
				// Skip if it's already been processed (has quotes)
				if (match.includes('"') || match.includes("'") || match.includes('`')) {
					return match;
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
	};
}
