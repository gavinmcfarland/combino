import { PluginManager } from './plugins/types.js';
import { TemplateOptions } from './types.js';
import { ConfigParser } from './config-parser.js';
import { FileProcessor } from './file-processor.js';
import { FileMerger } from './file-merger.js';
import { DataCollector } from './data-collector.js';
import { TemplateResolver } from './template-resolver.js';
import { FileTransformer } from './file-transformer.js';
import { FileFormatter } from './file-formatter.js';
import { FileWriter } from './file-writer.js';

export class Combino {
	private pluginManager: PluginManager;
	private configParser: ConfigParser;
	private fileProcessor: FileProcessor;
	private fileMerger: FileMerger;
	private dataCollector: DataCollector;
	private templateResolver: TemplateResolver;
	private fileTransformer: FileTransformer;
	private fileFormatter: FileFormatter;
	private fileWriter: FileWriter;

	constructor() {
		this.pluginManager = new PluginManager();
		this.configParser = new ConfigParser();
		this.fileProcessor = new FileProcessor();
		this.fileMerger = new FileMerger();
		this.dataCollector = new DataCollector();
		this.templateResolver = new TemplateResolver();
		this.fileTransformer = new FileTransformer();
		this.fileFormatter = new FileFormatter();
		this.fileWriter = new FileWriter();
	}

	async combine(options: TemplateOptions): Promise<void> {
		// Step 1: Add plugins to the manager
		if (options.plugins) {
			this.pluginManager.addPlugins(options.plugins);
		}

		// Step 2: Resolve all templates and collect data
		const resolvedTemplates = await this.templateResolver.resolveTemplates(
			options.include,
			options.config,
			options.exclude,
		);

		// Step 3: Collect all data from config files
		const globalData = await this.dataCollector.collectData(resolvedTemplates, options.data || {});

		// Step 4: Process all files with plugins (process hook)
		const processedFiles = await this.fileProcessor.processFiles(resolvedTemplates, globalData, this.pluginManager);

		// Step 5: Transform files with plugins (transform hook)
		const transformedFiles = await this.fileTransformer.transformFiles(
			processedFiles,
			resolvedTemplates,
			globalData,
			this.pluginManager,
		);

		// Step 6: Merge files (without formatting)
		const mergedFiles = await this.fileWriter.mergeFiles(transformedFiles);

		// Step 7: Format merged files with Prettier (centralized formatting)
		const formattedFiles = await this.fileFormatter.formatFiles(mergedFiles);

		// Step 8: Write formatted files to output
		await this.fileWriter.writeFiles(formattedFiles, options.outputDir);
	}
}

export { PluginManager } from './plugins/types.js';
export type { Plugin, FileHookContext, FileHookResult } from './plugins/types.js';
export type { TemplateOptions, CombinoConfig, MergeStrategy, FileHook } from './types.js';
