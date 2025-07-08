import { PluginManager } from './types.js';
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

	constructor(configFileName?: string) {
		this.pluginManager = new PluginManager();
		this.configParser = new ConfigParser();
		this.fileProcessor = new FileProcessor(configFileName);
		this.fileMerger = new FileMerger();
		this.dataCollector = new DataCollector();
		this.templateResolver = new TemplateResolver(configFileName);
		this.fileTransformer = new FileTransformer();
		this.fileFormatter = new FileFormatter();
		this.fileWriter = new FileWriter();
	}

	async combine(options: TemplateOptions): Promise<void> {
		// Step 1: Add plugins to the manager
		if (options.plugins) {
			this.pluginManager.addPlugins(options.plugins);
		}

		// Step 2: Update config filename if provided
		if (options.configFileName) {
			this.fileProcessor = new FileProcessor(options.configFileName);
			this.templateResolver = new TemplateResolver(options.configFileName);
		}

		// Step 3: Resolve all templates and collect data
		const resolvedTemplates = await this.templateResolver.resolveTemplates(
			options.include,
			options.config,
			options.exclude,
			options.data,
		);

		// Step 4: Collect all data from config files
		const globalData = await this.dataCollector.collectData(resolvedTemplates, options.data || {});

		// Step 5: Compile all files with plugins (single compile hook)
		const compiledFiles = await this.fileProcessor.compileFiles(resolvedTemplates, globalData, this.pluginManager);

		// Step 6: Merge files (without formatting)
		const mergedFiles = await this.fileWriter.mergeFiles(compiledFiles);

		// Step 7: Assemble files with plugins (assemble hook)
		const assembledFiles = await this.fileProcessor.assembleFiles(mergedFiles, globalData, this.pluginManager);

		// Step 8: Format merged files with Prettier (centralized formatting)
		const formattedFiles = await this.fileFormatter.formatFiles(assembledFiles);

		// Step 9: Write formatted files to output
		await this.fileWriter.writeFiles(formattedFiles, options.outputDir);
	}
}

export { PluginManager } from './types.js';
export type { Plugin, PluginOptions, FileHookContext, FileHookResult, FileHook } from './types.js';
export type {
	TemplateOptions,
	CombinoConfig,
	MergeStrategy,
	MergeConfig,
	IncludeConfig,
	IncludeItem,
	TemplateConfig,
	FileContent,
	ConfigFile,
	TemplateInfo,
	ResolvedTemplate,
	ResolvedFile,
	ProcessedFile,
} from './types.js';
