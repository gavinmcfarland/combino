import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ProcessedFile } from './types.js';
import { FileMerger } from './file-merger.js';

export class FileWriter {
	private fileMerger: FileMerger;

	constructor() {
		this.fileMerger = new FileMerger();
	}

	async mergeAndWriteFiles(files: ProcessedFile[], outputDir: string): Promise<void> {
		// Group files by target path for merging
		const fileGroups = new Map<string, ProcessedFile[]>();

		for (const file of files) {
			const key = file.targetPath;
			if (!fileGroups.has(key)) {
				fileGroups.set(key, []);
			}
			fileGroups.get(key)!.push(file);
		}

		// Process each group
		for (const [targetPath, fileGroup] of fileGroups) {
			if (fileGroup.length === 1) {
				// Single file, no merging needed
				const file = fileGroup[0];
				await this.writeFile(join(outputDir, targetPath), file.content);
			} else {
				// Multiple files, merge them
				const mergedContent = await this.fileMerger.mergeFiles(fileGroup);
				await this.writeFile(join(outputDir, targetPath), mergedContent);
			}
		}
	}

	private async writeFile(filePath: string, content: string): Promise<void> {
		await fs.mkdir(dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, content, 'utf-8');
	}
}
