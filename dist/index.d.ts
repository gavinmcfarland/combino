import { TemplateOptions } from "./types";
export declare class Combino {
    private readFile;
    private readCombinoConfig;
    private readConfigFile;
    private processTemplate;
    private evaluateCondition;
    private getFilesInTemplate;
    private getMergeStrategy;
    private mergeFiles;
    combine(options: TemplateOptions): Promise<void>;
}
