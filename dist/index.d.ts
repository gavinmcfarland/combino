import { TemplateOptions } from "./types";
export declare class Combino {
    private readFile;
    private getFilesInTemplate;
    private getMergeStrategy;
    private mergeFiles;
    combine(options: TemplateOptions): Promise<void>;
}
