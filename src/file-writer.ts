import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ProcessedFile } from './types.js';
import { FileMerger } from './file-merger.js';

export class FileWriter {
	private fileMerger: FileMerger;

	constructor() {
		this.fileMerger = new FileMerger();
	}

	async mergeFiles(files: ProcessedFile[]): Promise<ProcessedFile[]> {
		// Group files by target path for merging
		const fileGroups = new Map<string, ProcessedFile[]>();

		for (const file of files) {
			const key = file.targetPath;
			if (!fileGroups.has(key)) {
				fileGroups.set(key, []);
			}
			fileGroups.get(key)!.push(file);
		}

		const mergedFiles: ProcessedFile[] = [];

		// Process each group
		for (const [targetPath, fileGroup] of fileGroups) {
			if (fileGroup.length === 1) {
				// Single file, no merging needed
				mergedFiles.push(fileGroup[0]);
			} else {
				// Multiple files, merge them
				const mergedContent = await this.fileMerger.mergeFiles(fileGroup);
				// Use the first file as the base and update its content
				mergedFiles.push({
					...fileGroup[0],
					content: mergedContent,
				});
			}
		}

		return mergedFiles;
	}

	async writeFiles(files: ProcessedFile[], outputDir: string): Promise<void> {
		for (const file of files) {
			await this.writeFile(join(outputDir, file.targetPath), file.content);
		}
	}

	async mergeAndWriteFiles(files: ProcessedFile[], outputDir: string): Promise<void> {
		const mergedFiles = await this.mergeFiles(files);
		await this.writeFiles(mergedFiles, outputDir);
	}

	private async writeFile(filePath: string, content: string): Promise<void> {
		await fs.mkdir(dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, content, 'utf-8');
	}
}
