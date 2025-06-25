#!/usr/bin/env node
import { Command } from "commander";
import { Combino } from "./index.js";
import * as fs from "fs";
import * as path from "path";
import * as ini from "ini";
const program = new Command();
program
    .name("combino")
    .description("Combine multiple template folders to generate custom file and folder structures")
    .version("0.1.0")
    .argument("<templates...>", "One or more template folders (first has lowest priority, last wins)")
    .option("-o, --output <dir>", "Output directory for the generated result", "./output")
    .option("-c, --config <path>", "Path to a .combino config file (INI or JSON)")
    .option("--data <key=value>", "Inline key-value data to use for templating, conditions, and naming", collectData)
    .option("--template-engine <engine>", "Template engine to use (ejs, handlebars, mustache)", "ejs")
    .action(async (templates, options) => {
    try {
        const combino = new Combino();
        let templateData = {};
        // Load config file if specified
        if (options.config) {
            const configPath = path.resolve(options.config);
            if (!fs.existsSync(configPath)) {
                console.error(`Config file not found: ${configPath}`);
                process.exit(1);
            }
            const configContent = fs.readFileSync(configPath, "utf-8");
            const parsedConfig = ini.parse(configContent);
            // Extract data section and structure it properly
            if (parsedConfig.data) {
                // Convert flat data structure to nested
                Object.entries(parsedConfig.data).forEach(([key, value]) => {
                    const keys = key.split(".");
                    let current = templateData;
                    for (let i = 0; i < keys.length - 1; i++) {
                        current[keys[i]] = current[keys[i]] || {};
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = value;
                });
            }
        }
        // Merge command line data with config data
        if (options.data) {
            Object.entries(options.data).forEach(([key, value]) => {
                const keys = key.split(".");
                let current = templateData;
                for (let i = 0; i < keys.length - 1; i++) {
                    current[keys[i]] = current[keys[i]] || {};
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = value;
            });
        }
        const templateOptions = {
            outputDir: options.output,
            templates: templates,
            config: options.config || undefined,
            data: templateData,
            templateEngine: options.templateEngine,
        };
        await combino.combine(templateOptions);
        console.log(`Successfully generated output in ${options.output}`);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        }
        else {
            console.error("An unknown error occurred");
        }
        process.exit(1);
    }
});
function collectData(value, previous = {}) {
    // Try to parse as JSON first
    try {
        const jsonData = JSON.parse(value);
        if (typeof jsonData === "object" && jsonData !== null) {
            return { ...previous, ...jsonData };
        }
    }
    catch {
        // If not valid JSON, try key=value format
        const [key, val] = value.split("=");
        if (!key || !val) {
            throw new Error(`Invalid data format: ${value}. Expected key=value or valid JSON object`);
        }
        return { ...previous, [key]: val };
    }
    throw new Error(`Invalid data format: ${value}. Expected key=value or valid JSON object`);
}
program.parse();
