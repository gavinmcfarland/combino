import { TemplateOptions } from "./types.js";
import { TemplateEngine } from "./template-engines/index.js";
export declare class Combino {
    private data;
    private templateEngine;
    constructor(templateEngine?: TemplateEngine);
    private readFile;
    private readCombinoConfig;
    private readConfigFile;
    private processTemplate;
    private evaluateCondition;
    private getFilesInTemplate;
    private getMergeStrategy;
    private mergeFiles;
    private getCallerFileLocation;
    combine(options: TemplateOptions): Promise<void>;
}
