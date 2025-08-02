import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ProcessedFile, PluginManager, FileHookContext } from './types.js';
import { FileMerger } from './file-merger.js';

export class FileWriter {
	private fileMerger: FileMerger;

	constructor() {
		this.fileMerger = new FileMerger();
	}

	async mergeFiles(files: ProcessedFile[]): Promise<ProcessedFile[]> {
		console.log('DEBUG: FileWriter.mergeFiles - Input files:');
		files.forEach((file) => {
			console.log(`  - ${file.sourcePath} -> ${file.targetPath} (strategy: ${file.mergeStrategy || 'replace'})`);
		});

		// Group files by target path for merging
		const fileGroups = new Map<string, ProcessedFile[]>();

		for (const file of files) {
			const key = file.targetPath;
			if (!fileGroups.has(key)) {
				fileGroups.set(key, []);
			}
			fileGroups.get(key)!.push(file);
		}

		console.log('DEBUG: FileWriter.mergeFiles - File groups:');
		for (const [targetPath, fileGroup] of fileGroups) {
			console.log(`  - ${targetPath}: ${fileGroup.length} files`);
			fileGroup.forEach((file) => {
				console.log(`    - ${file.sourcePath} (strategy: ${file.mergeStrategy || 'replace'})`);
			});
		}

		const mergedFiles: ProcessedFile[] = [];

		// Process each group
		for (const [targetPath, fileGroup] of fileGroups) {
			// Filter out duplicate files by sourcePath
			const uniqueFiles = Array.from(new Map(fileGroup.map((f) => [f.sourcePath, f])).values());
			if (uniqueFiles.length === 1) {
				mergedFiles.push(uniqueFiles[0]);
			} else {
				const mergedContent = await this.fileMerger.mergeFiles(uniqueFiles);
				mergedFiles.push({
					...uniqueFiles[0],
					content: mergedContent,
				});
			}
		}

		// console.log('DEBUG: FileWriter.mergeFiles - Final merged files:');
		mergedFiles.forEach((file) => {
			// console.log(`  - ${file.targetPath}`);
		});
		// console.log(
		// 	'DEBUG: FileWriter.mergeFiles - Full mergedFiles:',
		// 	mergedFiles.map((f) => ({ targetPath: f.targetPath, sourcePath: f.sourcePath })),
		// );
		return mergedFiles;
	}

	async writeFiles(
		files: ProcessedFile[],
		outputDir: string,
		pluginManager?: PluginManager,
		data?: Record<string, any>,
	): Promise<void> {
		for (const file of files) {
			const filePath = join(outputDir, file.targetPath);
			// console.log('DEBUG: FileWriter.writeFiles - Writing file:', filePath);
			await this.writeFile(filePath, file.content);

			// Call output hook after file is written
			if (pluginManager) {
				const context: FileHookContext = {
					sourcePath: file.sourcePath,
					id: file.targetPath,
					content: file.content,
					data: data || {},
				};
				await pluginManager.output(context);
			}
		}
	}

	async mergeAndWriteFiles(
		files: ProcessedFile[],
		outputDir: string,
		pluginManager?: PluginManager,
		data?: Record<string, any>,
	): Promise<void> {
		const mergedFiles = await this.mergeFiles(files);
		await this.writeFiles(mergedFiles, outputDir, pluginManager, data);
	}

	private async writeFile(filePath: string, content: string): Promise<void> {
		await fs.mkdir(dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, content, 'utf-8');
	}
}
