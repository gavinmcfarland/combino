import { PluginManager } from './types.js';
import { Options } from './types.js';
import { ConfigParser } from './config-parser.js';
import { FileProcessor } from './file-processor.js';
import { FileMerger } from './file-merger.js';
import { DataCollector } from './data-collector.js';
import { TemplateResolver } from './template-resolver.js';
import { FileTransformer } from './file-transformer.js';
import { FileFormatter } from './file-formatter.js';
import { FileWriter } from './file-writer.js';
import { DebugLogger } from './utils/debug.js';
import ejsProcessConfig from './plugins/ejs-process-config.js';

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

		// Add default plugins that are always available
		this.pluginManager.addPlugin(ejsProcessConfig());

		this.configParser = new ConfigParser();
		this.fileProcessor = new FileProcessor(configFileName);
		this.fileMerger = new FileMerger();
		this.dataCollector = new DataCollector();
		this.templateResolver = new TemplateResolver(configFileName, true); // Default to enabled
		this.fileTransformer = new FileTransformer();
		this.fileFormatter = new FileFormatter();
		this.fileWriter = new FileWriter();
	}

	async build(options: Options): Promise<void> {
		// Step 1: Configure warnings
		if (options.warnings !== undefined) {
			DebugLogger.setWarningsEnabled(options.warnings);
		}

		// Step 2: Add plugins to the manager
		if (options.plugins) {
			this.pluginManager.addPlugins(options.plugins);
		}

		// Step 3: Update config filename and feature flags if provided
		if (options.configFileName || options.enableConditionalIncludePaths !== undefined) {
			this.fileProcessor = new FileProcessor(options.configFileName);
			this.templateResolver = new TemplateResolver(
				options.configFileName,
				options.enableConditionalIncludePaths !== undefined ? options.enableConditionalIncludePaths : true,
			);
		}

		// Step 4: Parse global config if provided
		let globalConfig;
		if (options.config) {
			globalConfig =
				typeof options.config === 'string'
					? await this.configParser.parseConfigFile(
							options.config,
							this.pluginManager,
							options.data || {},
							options.configFileName,
						)
					: options.config;
		}

		// Step 5: Resolve all templates with plugin manager and initial data
		const resolvedTemplates = await this.templateResolver.resolveTemplates(
			options.include,
			options.config,
			options.exclude,
			this.pluginManager,
			options.data || {},
		);

		// Step 6: Collect all data from config files (now with preprocessed configs)
		const globalData = await this.dataCollector.collectData(resolvedTemplates, options.data || {});

		// Step 7: Compile all files with plugins (single compile hook)
		const compiledFiles = await this.fileProcessor.compileFiles(
			resolvedTemplates,
			globalData,
			this.pluginManager,
			globalConfig,
		);

		// Step 8: Merge files (without formatting)
		const mergedFiles = await this.fileWriter.mergeFiles(compiledFiles);

		// Step 9: Assemble files with plugins (assemble hook)
		const assembledFiles = await this.fileProcessor.assembleFiles(mergedFiles, globalData, this.pluginManager);

		// Step 10: Format merged files with Prettier (centralized formatting)
		const formattedFiles = await this.fileFormatter.formatFiles(assembledFiles);

		// Step 11: Write formatted files to output
		await this.fileWriter.writeFiles(formattedFiles, options.outputDir, this.pluginManager, globalData);
	}
}

export { PluginManager } from './types.js';
export type {
	Plugin,
	PluginOptions,
	FileHookContext,
	FileHookResult,
	FileHook,
	DiscoverContext,
	DiscoverResult,
	DiscoverHook,
} from './types.js';
export type {
	Options,
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
