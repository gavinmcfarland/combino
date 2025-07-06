import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combino } from '../src/index.js';
import { Plugin, FileHookContext, FileHookResult } from '../src/plugins/types.js';
import { ejs } from '../src/plugins/ejs.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { assertDirectoriesEqual } from '../utils/directory-compare.js';

describe('Plugin Architecture Tests', () => {
	let combino: Combino;
	const testOutputDir = './test-plugin-output';

	beforeEach(() => {
		combino = new Combino();
	});

	afterEach(async () => {
		// Clean up test output
		try {
			await fs.rm(testOutputDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('Plugin Hook System', () => {
		it('should execute process hooks for file processing', async () => {
			// Create a plugin with only a process hook
			const processPlugin: Plugin = {
				filePattern: ['*.md'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content.replace(
							'This content should be modified by the process hook.',
							'This content should be modified by the process hook. [PROCESSED]',
						),
						targetPath: context.targetPath,
					};
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), processPlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Check that the process hook was executed
			const outputContent = await fs.readFile(join(testOutputDir, 'README.md'), 'utf-8');
			expect(outputContent).toContain('[PROCESSED]');
		});

		it('should execute transform hooks with template context', async () => {
			// Create a plugin with only a transform hook
			const transformPlugin: Plugin = {
				filePattern: ['*.md'],
				transform: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content.replace(
							'This content should be modified by the transform hook with template context.',
							'This content should be modified by the transform hook with template context. [TRANSFORMED]',
						),
						targetPath: context.targetPath,
					};
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), transformPlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Check that the transform hook was executed
			const outputContent = await fs.readFile(join(testOutputDir, 'README.md'), 'utf-8');
			expect(outputContent).toContain('[TRANSFORMED]');
		});

		it('should execute both process and transform hooks in correct order', async () => {
			// Create a plugin with both hooks
			// Process hook executes FIRST, then transform hook executes SECOND
			const dualHookPlugin: Plugin = {
				filePattern: ['*.md'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content.replace(
							'This content should be processed by both hooks in sequence.',
							'This content should be processed by both hooks in sequence. [PROCESSED]',
						),
						targetPath: context.targetPath,
					};
				},
				transform: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content.replace('[PROCESSED]', '[PROCESSED] [TRANSFORMED]'),
						targetPath: context.targetPath,
					};
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), dualHookPlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Check that both hooks were executed in the correct order (process first, then transform)
			const outputContent = await fs.readFile(join(testOutputDir, 'README.md'), 'utf-8');
			expect(outputContent).toContain('[PROCESSED] [TRANSFORMED]');
		});
	});

	describe('Plugin Pattern Matching', () => {
		it('should only apply plugins to files matching their patterns', async () => {
			// Create plugins for different file types
			const markdownPlugin: Plugin = {
				filePattern: ['*.md'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content + '\n\n<!-- Processed by Markdown plugin -->',
						targetPath: context.targetPath,
					};
				},
			};

			const jsonPlugin: Plugin = {
				filePattern: ['*.json'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					try {
						const jsonData = JSON.parse(context.content);
						jsonData.pluginProcessed = true;
						return {
							content: JSON.stringify(jsonData, null, 2),
							targetPath: context.targetPath,
						};
					} catch {
						return {
							content: context.content,
							targetPath: context.targetPath,
						};
					}
				},
			};

			const textPlugin: Plugin = {
				filePattern: ['*.txt'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content + '\n\n# Added by plugin process hook',
						targetPath: context.targetPath,
					};
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), markdownPlugin, jsonPlugin, textPlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Check that each plugin only affected its target file type
			const readmeContent = await fs.readFile(join(testOutputDir, 'README.md'), 'utf-8');
			expect(readmeContent).toContain('<!-- Processed by Markdown plugin -->');

			const packageContent = await fs.readFile(join(testOutputDir, 'package.json'), 'utf-8');
			const packageJson = JSON.parse(packageContent);
			expect(packageJson.pluginProcessed).toBe(true);

			const configContent = await fs.readFile(join(testOutputDir, 'config.txt'), 'utf-8');
			expect(configContent).toContain('# Added by plugin process hook');
		});

		it('should apply plugins without patterns to all files', async () => {
			// Create a plugin without file patterns (should apply to all files)
			const universalPlugin: Plugin = {
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content + '\n/* Universal plugin applied */',
						targetPath: context.targetPath,
					};
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), universalPlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Check that the universal plugin was applied to all files
			const files = ['README.md', 'package.json', 'config.txt'];
			for (const file of files) {
				const content = await fs.readFile(join(testOutputDir, file), 'utf-8');
				expect(content).toContain('/* Universal plugin applied */');
			}
		});
	});

	describe('Plugin Error Handling', () => {
		it('should continue processing when a plugin throws an error', async () => {
			// Create a plugin that throws an error
			const errorPlugin: Plugin = {
				filePattern: ['*.md'],
				process: async (): Promise<FileHookResult> => {
					throw new Error('Plugin error for testing');
				},
			};

			// Create a working plugin
			const workingPlugin: Plugin = {
				filePattern: ['*.txt'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content + '\n# Working plugin executed',
						targetPath: context.targetPath,
					};
				},
			};

			// Should not throw an error, should continue processing
			await expect(
				combino.combine({
					include: ['tests/plugin-architecture-test/input/base'],
					outputDir: testOutputDir,
					plugins: [ejs(), errorPlugin, workingPlugin],
					data: {
						name: 'TestProject',
						version: '1.0.0',
						author: 'Test Author',
					},
				}),
			).resolves.not.toThrow();

			// Check that the working plugin still executed
			const configContent = await fs.readFile(join(testOutputDir, 'config.txt'), 'utf-8');
			expect(configContent).toContain('# Working plugin executed');
		});
	});

	describe('Plugin Priority and Order', () => {
		it('should execute plugins in the order they are added', async () => {
			// Create plugins that modify content in sequence
			const firstPlugin: Plugin = {
				filePattern: ['*.md'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content.replace('## Multiple Hooks Test', '## Multiple Hooks Test [FIRST]'),
						targetPath: context.targetPath,
					};
				},
			};

			const secondPlugin: Plugin = {
				filePattern: ['*.md'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content.replace('[FIRST]', '[FIRST] [SECOND]'),
						targetPath: context.targetPath,
					};
				},
			};

			const thirdPlugin: Plugin = {
				filePattern: ['*.md'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					return {
						content: context.content.replace('[SECOND]', '[SECOND] [THIRD]'),
						targetPath: context.targetPath,
					};
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), firstPlugin, secondPlugin, thirdPlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Check that plugins executed in order
			const outputContent = await fs.readFile(join(testOutputDir, 'README.md'), 'utf-8');
			expect(outputContent).toContain('[FIRST] [SECOND] [THIRD]');
		});
	});

	describe('Plugin Context and Data', () => {
		it('should provide correct context to plugins', async () => {
			// Create a plugin that validates the context
			const contextValidationPlugin: Plugin = {
				filePattern: ['*.md'],
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					// Validate context properties
					expect(context.sourcePath).toBeDefined();
					expect(context.targetPath).toBeDefined();
					expect(context.content).toBeDefined();
					expect(context.data).toBeDefined();
					expect(context.data.name).toBe('TestProject');
					expect(context.data.version).toBe('1.0.0');
					expect(context.data.author).toBe('Test Author');

					return {
						content: context.content + `\n<!-- Context validated: ${context.data.name} -->`,
						targetPath: context.targetPath,
					};
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), contextValidationPlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Check that context validation passed
			const outputContent = await fs.readFile(join(testOutputDir, 'README.md'), 'utf-8');
			expect(outputContent).toContain('<!-- Context validated: TestProject -->');
		});

		it('should provide template context to transform hooks', async () => {
			// Create a plugin that uses template context
			const templateContextPlugin: Plugin = {
				filePattern: ['*.md'],
				transform: async (context: FileHookContext): Promise<FileHookResult> => {
					// Transform hooks should have access to allTemplates
					expect(context.allTemplates).toBeDefined();
					if (context.allTemplates) {
						expect(context.allTemplates.length).toBeGreaterThan(0);
					}

					return {
						content:
							context.content + `\n<!-- Templates available: ${context.allTemplates?.length || 0} -->`,
						targetPath: context.targetPath,
					};
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), templateContextPlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Check that template context was provided
			const outputContent = await fs.readFile(join(testOutputDir, 'README.md'), 'utf-8');
			expect(outputContent).toContain('<!-- Templates available: 1 -->');
		});
	});

	describe('Integration with Full Test Suite', () => {
		it('should pass the full plugin architecture test', async () => {
			// Create the complete plugin set for the test
			const completePlugin: Plugin = {
				process: async (context: FileHookContext): Promise<FileHookResult> => {
					let content = context.content;

					// Apply different transformations based on file type
					if (context.targetPath.endsWith('.md')) {
						content = content
							.replace(
								'This content should be modified by the process hook.',
								'This content should be modified by the process hook. [PROCESSED]',
							)
							.replace(
								'This content should be processed by both hooks in sequence.',
								'This content should be processed by both hooks in sequence. [PROCESSED]',
							);
					} else if (context.targetPath.endsWith('.json')) {
						try {
							const jsonData = JSON.parse(content);
							jsonData.pluginProcessed = true;
							content = JSON.stringify(jsonData, null, 2);
						} catch {
							// Keep original content if JSON parsing fails
						}
					} else if (context.targetPath.endsWith('.txt')) {
						content =
							content.replace(
								'# Process hook should add a comment',
								'# Process hook should add a comment [PROCESSED]',
							) + '\n\n# Added by plugin process hook';
					}

					return { content, targetPath: context.targetPath };
				},
				transform: async (context: FileHookContext): Promise<FileHookResult> => {
					let content = context.content;

					// Apply transform-specific changes (executed AFTER process hook)
					if (context.targetPath.endsWith('.md')) {
						content = content
							.replace(
								'This content should be modified by the transform hook with template context.',
								'This content should be modified by the transform hook with template context. [TRANSFORMED]',
							)
							.replace(
								'This content should be processed by both hooks in sequence. [PROCESSED]',
								'This content should be processed by both hooks in sequence. [PROCESSED] [TRANSFORMED]',
							);
					} else if (context.targetPath.endsWith('.txt')) {
						content = content.replace(
							'# Transform hook should modify content',
							'# Transform hook should modify content [TRANSFORMED]',
						);
					}

					return { content, targetPath: context.targetPath };
				},
			};

			await combino.combine({
				include: ['tests/plugin-architecture-test/input/base'],
				outputDir: testOutputDir,
				plugins: [ejs(), completePlugin],
				data: {
					name: 'TestProject',
					version: '1.0.0',
					author: 'Test Author',
				},
			});

			// Compare with expected output
			await assertDirectoriesEqual(testOutputDir, 'tests/plugin-architecture-test/expected');
		});
	});
});
