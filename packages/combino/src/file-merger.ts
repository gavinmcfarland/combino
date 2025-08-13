import { ProcessedFile, MergeStrategy } from './types.js';
import { mergeJson } from './mergers/json.js';
import { mergeMarkdown } from './mergers/markdown.js';
import { mergeText } from './mergers/text.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DebugLogger } from './utils/debug.js';

export class FileMerger {
	async mergeFiles(files: ProcessedFile[]): Promise<string> {
		if (files.length === 0) {
			return '';
		}

		if (files.length === 1) {
			return files[0].content;
		}

		// Sort files by priority (later files have higher priority)
		const sortedFiles = [...files].sort((a, b) => {
			// Files from later templates should have higher priority
			return 0; // For now, maintain order as provided
		});

		// Determine file type and merge strategy
		const firstFile = sortedFiles[0];
		const fileExtension = this.getFileExtension(firstFile.targetPath);

		// Determine the merge strategy to use
		// Priority: 1. Non-default strategy from any file, 2. First file's strategy, 3. Default 'replace'
		let strategy: MergeStrategy = 'replace';

		// Look for a non-default merge strategy from any file
		for (const file of sortedFiles) {
			if (file.mergeStrategy && file.mergeStrategy !== 'replace') {
				strategy = file.mergeStrategy;
				break;
			}
		}

		// If no non-default strategy found, use the first file's strategy
		if (strategy === 'replace') {
			strategy = firstFile.mergeStrategy || 'replace';
		}

		// Use appropriate merger based on file type
		let result: string;
		switch (fileExtension) {
			case 'json':
			case 'jsonc':
				result = await this.mergeJsonFiles(sortedFiles, strategy);
				break;
			case 'md':
			case 'markdown':
				result = await this.mergeMarkdownFiles(sortedFiles, strategy);
				break;
			default:
				result = await this.mergeTextFiles(sortedFiles, strategy);
		}

		return result;
	}

	private getFileExtension(filePath: string): string {
		const parts = filePath.split('.');
		return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
	}

	private async mergeJsonFiles(files: ProcessedFile[], strategy: MergeStrategy): Promise<string> {
		DebugLogger.log(`DEBUG: mergeJsonFiles - ${files.length} files, strategy: ${strategy}`);
		files.forEach((file, i) => {
			DebugLogger.log(`DEBUG: File ${i}: ${file.sourcePath}`);
			DebugLogger.log(`DEBUG: Content ${i}: ${file.content.substring(0, 200)}...`);
		});

		if (strategy === 'replace') {
			return files[files.length - 1].content;
		}

		// Use the proper JSON merger for handling JSON with comments
		if (files.length === 2) {
			// For two files, use the standalone JSON merger
			const tempDir = tmpdir();
			const tempFile1 = join(tempDir, `temp1-${Date.now()}.json`);
			const tempFile2 = join(tempDir, `temp2-${Date.now()}.json`);

			try {
				await fs.writeFile(tempFile1, files[0].content);
				await fs.writeFile(tempFile2, files[1].content);

				const result = await mergeJson(tempFile1, tempFile2, strategy);
				DebugLogger.log(`DEBUG: Merge result: ${result.substring(0, 300)}...`);

				// Clean up temp files
				await fs.unlink(tempFile1).catch(() => {});
				await fs.unlink(tempFile2).catch(() => {});

				return result;
			} catch (error) {
				// Clean up temp files on error
				await fs.unlink(tempFile1).catch(() => {});
				await fs.unlink(tempFile2).catch(() => {});
				throw error;
			}
		}

		// For multiple files, merge them sequentially
		let result = files[0].content;
		for (let i = 1; i < files.length; i++) {
			const tempDir = tmpdir();
			const tempFile1 = join(tempDir, `temp1-${Date.now()}-${i}.json`);
			const tempFile2 = join(tempDir, `temp2-${Date.now()}-${i}.json`);

			try {
				await fs.writeFile(tempFile1, result);
				await fs.writeFile(tempFile2, files[i].content);

				result = await mergeJson(tempFile1, tempFile2, strategy);

				// Clean up temp files
				await fs.unlink(tempFile1).catch(() => {});
				await fs.unlink(tempFile2).catch(() => {});
			} catch (error) {
				// Clean up temp files on error
				await fs.unlink(tempFile1).catch(() => {});
				await fs.unlink(tempFile2).catch(() => {});
				throw error;
			}
		}

		return result;
	}

	private async mergeMarkdownFiles(files: ProcessedFile[], strategy: MergeStrategy): Promise<string> {
		if (strategy === 'replace') {
			return files[files.length - 1].content;
		}

		// Use the proper markdown merger for section-based merging
		if (files.length === 2) {
			// For two files, use the standalone markdown merger
			const tempDir = tmpdir();
			const tempFile1 = join(tempDir, `temp1-${Date.now()}.md`);
			const tempFile2 = join(tempDir, `temp2-${Date.now()}.md`);

			try {
				await fs.writeFile(tempFile1, files[0].content);
				await fs.writeFile(tempFile2, files[1].content);

				const result = await mergeMarkdown(tempFile1, tempFile2, strategy);

				// Clean up temp files
				await fs.unlink(tempFile1).catch(() => {});
				await fs.unlink(tempFile2).catch(() => {});

				return result;
			} catch (error) {
				// Clean up temp files on error
				await fs.unlink(tempFile1).catch(() => {});
				await fs.unlink(tempFile2).catch(() => {});
				throw error;
			}
		}

		// For multiple files, merge them sequentially
		let result = files[0].content;
		for (let i = 1; i < files.length; i++) {
			const tempDir = tmpdir();
			const tempFile1 = join(tempDir, `temp1-${Date.now()}-${i}.md`);
			const tempFile2 = join(tempDir, `temp2-${Date.now()}-${i}.md`);

			try {
				await fs.writeFile(tempFile1, result);
				await fs.writeFile(tempFile2, files[i].content);

				result = await mergeMarkdown(tempFile1, tempFile2, strategy);

				// Clean up temp files
				await fs.unlink(tempFile1).catch(() => {});
				await fs.unlink(tempFile2).catch(() => {});
			} catch (error) {
				// Clean up temp files on error
				await fs.unlink(tempFile1).catch(() => {});
				await fs.unlink(tempFile2).catch(() => {});
				throw error;
			}
		}

		return result;
	}

	private async mergeTextFiles(files: ProcessedFile[], strategy: MergeStrategy): Promise<string> {
		if (strategy === 'replace') {
			return files[files.length - 1].content;
		}

		let result = files[0].content;
		for (let i = 1; i < files.length; i++) {
			switch (strategy) {
				case 'append':
					result += '\n' + files[i].content;
					break;
				case 'prepend':
					result = files[i].content + '\n' + result;
					break;
				default:
					result = files[i].content;
			}
		}

		return result;
	}
}
