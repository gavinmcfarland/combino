import { ResolvedTemplate } from './types.js';
import { ConfigParser } from './config-parser.js';

export class DataCollector {
	private configParser: ConfigParser;

	constructor() {
		this.configParser = new ConfigParser();
	}

	async collectData(templates: ResolvedTemplate[], baseData: Record<string, any>): Promise<Record<string, any>> {
		let globalData = { ...baseData };

		// Collect data from all template configs
		for (const template of templates) {
			if (template.config?.data) {
				// Handle dot notation in config data
				const configData = this.configParser.expandDotNotation(template.config.data);
				globalData = { ...globalData, ...configData };
			}

			// Collect data from companion files (*.json files)
			for (const file of template.files) {
				// Check if this is a companion file (e.g., package.json.json)
				// Companion files have the pattern: filename.json.json
				const isCompanionFile = file.targetPath.match(/\.json\.json$/);

				if (isCompanionFile) {
					try {
						const companionData = JSON.parse(file.content);
						if (companionData.data) {
							// Handle dot notation in companion data
							const expandedData = this.configParser.expandDotNotation(companionData.data);
							globalData = { ...globalData, ...expandedData };
						}
					} catch (error) {
						console.warn(`Failed to parse companion file ${file.sourcePath}:`, error);
					}
				}

				// Collect data from front matter in template files
				const frontMatterData = this.configParser.extractFrontMatter(file.content);
				if (frontMatterData) {
					const expandedData = this.configParser.expandDotNotation(frontMatterData);
					globalData = { ...globalData, ...expandedData };
				}
			}
		}

		return globalData;
	}
}
