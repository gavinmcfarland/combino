"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Combino = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const gray_matter_1 = __importDefault(require("gray-matter"));
const json_1 = require("./mergers/json");
const markdown_1 = require("./mergers/markdown");
const text_1 = require("./mergers/text");
class Combino {
    async readFile(filePath) {
        const content = await fs_1.promises.readFile(filePath, "utf-8");
        const { data, content: fileContent } = (0, gray_matter_1.default)(content);
        return {
            content: fileContent,
            config: data,
        };
    }
    async getFilesInTemplate(templatePath) {
        try {
            return await (0, glob_1.glob)("**/*", {
                cwd: templatePath,
                nodir: true,
                ignore: ["node_modules/**"],
            });
        }
        catch (error) {
            throw new Error(`Failed to get files in template: ${error}`);
        }
    }
    getMergeStrategy(filePath, config) {
        if (config?.merge?.strategy) {
            return config.merge.strategy;
        }
        const ext = path_1.default.extname(filePath).toLowerCase();
        switch (ext) {
            case ".json":
                return "deep";
            case ".md":
                return "append";
            default:
                return "replace";
        }
    }
    async mergeFiles(targetPath, sourcePath, strategy) {
        const ext = path_1.default.extname(targetPath).toLowerCase();
        switch (ext) {
            case ".json":
                return (0, json_1.mergeJson)(targetPath, sourcePath, strategy);
            case ".md":
                return (0, markdown_1.mergeMarkdown)(targetPath, sourcePath, strategy);
            default:
                return (0, text_1.mergeText)(targetPath, sourcePath, strategy);
        }
    }
    async combine(options) {
        const { targetDir, templates } = options;
        // Create target directory if it doesn't exist
        await fs_1.promises.mkdir(targetDir, { recursive: true });
        // Process each template in order
        for (const template of templates) {
            const files = await this.getFilesInTemplate(template);
            for (const file of files) {
                const sourcePath = path_1.default.join(template, file);
                const targetPath = path_1.default.join(targetDir, file);
                // Read source file
                const sourceContent = await this.readFile(sourcePath);
                const strategy = this.getMergeStrategy(file, sourceContent.config);
                // If target file exists, merge it
                try {
                    const targetContent = await this.readFile(targetPath);
                    const mergedContent = await this.mergeFiles(targetPath, sourcePath, strategy);
                    await fs_1.promises.writeFile(targetPath, mergedContent);
                }
                catch (error) {
                    // If target doesn't exist, just copy the source
                    await fs_1.promises.mkdir(path_1.default.dirname(targetPath), {
                        recursive: true,
                    });
                    await fs_1.promises.copyFile(sourcePath, targetPath);
                }
            }
        }
    }
}
exports.Combino = Combino;
