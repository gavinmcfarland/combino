import { ProcessedFile, ResolvedTemplate, TemplateInfo } from './types.js';
import { PluginManager } from './plugins/types.js';

export class FileTransformer {
	async transformFiles(
		processedFiles: ProcessedFile[],
		templates: ResolvedTemplate[],
		data: Record<string, any>,
		pluginManager: PluginManager,
	): Promise<ProcessedFile[]> {
		const transformedFiles: ProcessedFile[] = [];

		// Convert templates to TemplateInfo format for plugin context
		const templateInfos: TemplateInfo[] = templates.map((template) => ({
			path: template.path,
			targetDir: template.targetDir,
			files: template.files.map((file) => ({
				sourcePath: file.sourcePath,
				targetPath: file.targetPath,
				content: file.content,
			})),
		}));

		for (const file of processedFiles) {
			// Transform file content with plugins (transform hook)
			const context = {
				sourcePath: file.sourcePath,
				targetPath: file.targetPath,
				content: file.content,
				data,
				allTemplates: templateInfos,
			};

			const result = await pluginManager.transformWithTemplates(context, templateInfos);

			transformedFiles.push({
				...file,
				targetPath: result.targetPath || file.targetPath,
				content: result.content,
			});
		}

		return transformedFiles;
	}
}
