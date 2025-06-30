import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { Combino } from "../src/index.js";
import { ejs } from "../src/plugins/ejs.js";
import { handlebars } from "../src/plugins/handlebars.js";
import { mustache } from "../src/plugins/mustache.js";

describe("Plugin Architecture", () => {
	const testDir = path.join(
		process.cwd(),
		"test-output",
		"plugin-architecture",
	);
	const templatesDir = path.join(testDir, "templates");

	beforeEach(async () => {
		// Clean up and create test directories
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {}
		await fs.mkdir(testDir, { recursive: true });
		await fs.mkdir(templatesDir, { recursive: true });
	});

	afterEach(async () => {
		// Clean up
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {}
	});

	it("should create plugins using factory functions", () => {
		const ejsPluginInstance = ejs({ patterns: ["*.ejs"] });
		const hbsPluginInstance = handlebars({ patterns: ["*.hbs"] });
		const mustachePluginInstance = mustache({ priority: 10 });

		expect(ejsPluginInstance.engine).toBeTruthy();
		expect(hbsPluginInstance.options.patterns).toEqual(["*.hbs"]);
		expect(mustachePluginInstance.options.priority).toBe(10);
	});

	it("should process different file types with appropriate plugins", async () => {
		// Create test templates
		await fs.writeFile(
			path.join(templatesDir, "ejs-template.ejs"),
			"Hello <%= name %>!",
		);
		await fs.writeFile(
			path.join(templatesDir, "handlebars-template.hbs"),
			"Hello {{name}}!",
		);
		await fs.writeFile(
			path.join(templatesDir, "mustache-template.mustache"),
			"Hello {{name}}!",
		);

		const combino = new Combino();

		await combino.combine({
			outputDir: path.join(testDir, "output"),
			include: [templatesDir],
			plugins: [
				ejs({ patterns: ["*.ejs"] }),
				handlebars({ patterns: ["*.hbs"] }),
				mustache({ patterns: ["*.mustache"] }),
			],
			data: { name: "World" },
		});

		// Check that files were processed correctly
		const ejsOutput = await fs.readFile(
			path.join(testDir, "output", "ejs-template.ejs"),
			"utf-8",
		);
		expect(ejsOutput).toBe("Hello World!");

		const hbsOutput = await fs.readFile(
			path.join(testDir, "output", "handlebars-template.hbs"),
			"utf-8",
		);
		expect(hbsOutput).toBe("Hello World!");

		const mustacheOutput = await fs.readFile(
			path.join(testDir, "output", "mustache-template.mustache"),
			"utf-8",
		);
		expect(mustacheOutput).toBe("Hello World!");
	});

	it("should handle content-based detection when no patterns match", async () => {
		// Create test templates with different syntax
		await fs.writeFile(
			path.join(templatesDir, "ejs-content.txt"),
			"Hello <%= name %>!",
		);
		await fs.writeFile(
			path.join(templatesDir, "handlebars-content.txt"),
			"Hello {{name}}!",
		);

		const combino = new Combino();

		await combino.combine({
			outputDir: path.join(testDir, "output"),
			include: [templatesDir],
			plugins: [ejs({ priority: 5 }), handlebars({ priority: 5 })],
			data: { name: "World" },
		});

		// Check that content was detected correctly
		const ejsOutput = await fs.readFile(
			path.join(testDir, "output", "ejs-content.txt"),
			"utf-8",
		);
		expect(ejsOutput).toBe("Hello World!");

		const hbsOutput = await fs.readFile(
			path.join(testDir, "output", "handlebars-content.txt"),
			"utf-8",
		);
		expect(hbsOutput).toBe("Hello World!");
	});

	it("should respect priority when multiple plugins could handle a file", async () => {
		// Create a file that could be handled by multiple plugins
		await fs.writeFile(
			path.join(templatesDir, "mixed-syntax.txt"),
			"Hello <%= name %> and {{other}}!",
		);

		const combino = new Combino();

		await combino.combine({
			outputDir: path.join(testDir, "output"),
			include: [templatesDir],
			plugins: [
				ejs({ patterns: ["*.txt"], priority: 10 }),
				handlebars({ priority: 5 }),
			],
			data: { name: "World", other: "Universe" },
		});

		// Should use EJS due to higher priority pattern match
		const output = await fs.readFile(
			path.join(testDir, "output", "mixed-syntax.txt"),
			"utf-8",
		);
		expect(output).toBe("Hello World and {{other}}!");
	});

	it("should maintain backward compatibility with plugins", async () => {
		// Create test template
		await fs.writeFile(
			path.join(templatesDir, "template.ejs"),
			"Hello <%= name %>!",
		);

		const combino = new Combino();

		await combino.combine({
			outputDir: path.join(testDir, "output"),
			include: [templatesDir],
			plugins: [ejs()], // Use EJS plugin
			data: { name: "World" },
		});

		const output = await fs.readFile(
			path.join(testDir, "output", "template.ejs"),
			"utf-8",
		);
		expect(output).toBe("Hello World!");
	});

	it("should support custom options in plugins", async () => {
		// Create test template
		await fs.writeFile(
			path.join(templatesDir, "template.ejs"),
			"Hello <%= name %>!",
		);

		const combino = new Combino();

		await combino.combine({
			outputDir: path.join(testDir, "output"),
			include: [templatesDir],
			plugins: [
				ejs({
					patterns: ["*.ejs"],
					priority: 10,
					customOption: "test-value",
				}),
			],
			data: { name: "World" },
		});

		const output = await fs.readFile(
			path.join(testDir, "output", "template.ejs"),
			"utf-8",
		);
		expect(output).toBe("Hello World!");
	});

	it("should leave files unprocessed when no plugin matches", async () => {
		// Create a file that doesn't match any plugin
		await fs.writeFile(
			path.join(templatesDir, "plain-text.txt"),
			"Hello World!",
		);

		const combino = new Combino();

		await combino.combine({
			outputDir: path.join(testDir, "output"),
			include: [templatesDir],
			plugins: [
				ejs({ patterns: ["*.ejs"] }),
				handlebars({ patterns: ["*.hbs"] }),
			],
			data: { name: "World" },
		});

		// File should be left as-is
		const output = await fs.readFile(
			path.join(testDir, "output", "plain-text.txt"),
			"utf-8",
		);
		expect(output).toBe("Hello World!");
	});
});
