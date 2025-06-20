import { TemplateOptions } from "./types.js";
export declare class Combino {
    private data;
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
