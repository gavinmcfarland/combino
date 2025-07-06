import { ProcessedFile, MergeStrategy } from './types.js';
import { mergeJson } from './mergers/json.js';
import { mergeMarkdown } from './mergers/markdown.js';
import { mergeText } from './mergers/text.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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
		const strategy = firstFile.mergeStrategy || 'replace';
		const fileExtension = this.getFileExtension(firstFile.targetPath);

		// Use appropriate merger based on file type
		switch (fileExtension) {
			case 'json':
			case 'jsonc':
				return this.mergeJsonFiles(sortedFiles, strategy);
			case 'md':
			case 'markdown':
				return this.mergeMarkdownFiles(sortedFiles, strategy);
			default:
				return this.mergeTextFiles(sortedFiles, strategy);
		}
	}

	private getFileExtension(filePath: string): string {
		const parts = filePath.split('.');
		return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
	}

	private async mergeJsonFiles(files: ProcessedFile[], strategy: MergeStrategy): Promise<string> {
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
