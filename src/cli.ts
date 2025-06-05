#!/usr/bin/env node

import { Command } from "commander";
import { Combino } from "./index";
import { TemplateOptions } from "./types";
import * as fs from "fs";
import * as path from "path";
import * as ini from "ini";

const program = new Command();

program
	.name("combino")
	.description(
		"Combine multiple template folders to generate custom file and folder structures"
	)
	.version("0.1.0")
	.argument(
		"<templates...>",
		"One or more template folders (first has lowest priority, last wins)"
	)
	.option(
		"-o, --output <dir>",
		"Output directory for the generated result",
		"./output"
	)
	.option(
		"-c, --config <path>",
		"Path to a .combino config file (INI or JSON)"
	)
	.option(
		"-d, --data <key=value>",
		"Inline key-value data to use for templating, conditions, and naming",
		collectData
	)
	.action(async (templates: string[], options: any) => {
		try {
			const combino = new Combino();
			const config: any = {};

			// Load config file if specified
			if (options.config) {
				const configPath = path.resolve(options.config);
				if (!fs.existsSync(configPath)) {
					console.error(`Config file not found: ${configPath}`);
					process.exit(1);
				}
				const configContent = fs.readFileSync(configPath, "utf-8");
				Object.assign(config, ini.parse(configContent));
			}

			// Merge command line data with config data
			if (options.data) {
				config.data = { ...config.data, ...options.data };
			}

			const templateOptions: TemplateOptions = {
				targetDir: options.output,
				templates: templates,
				config: config.merge,
				data: config.data,
			};

			await combino.combine(templateOptions);

			console.log(`Successfully generated output in ${options.output}`);
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error("Error:", error.message);
			} else {
				console.error("An unknown error occurred");
			}
			process.exit(1);
		}
	});

function collectData(value: string, previous: Record<string, string> = {}) {
	const [key, val] = value.split("=");
	if (!key || !val) {
		throw new Error(`Invalid data format: ${value}. Expected key=value`);
	}
	return { ...previous, [key]: val };
}

program.parse();
