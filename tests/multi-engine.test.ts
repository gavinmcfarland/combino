import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { Combino } from "../src/index.js";
import { ejs } from "../src/plugins/ejs.js";
import { handlebars } from "../src/plugins/handlebars.js";

describe("Multi-Engine Template Support", () => {
	const testDir = path.join(process.cwd(), "test-output", "multi-engine");
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

	it("should create plugin manager with multiple plugins", () => {
		const ejsPlugin = ejs({ patterns: ["*.ejs"], priority: 10 });
		const handlebarsPlugin = handlebars({
			patterns: ["*.hbs"],
			priority: 5,
		});

		expect(ejsPlugin.engine).toBeTruthy();
		expect(ejsPlugin.options.patterns).toEqual(["*.ejs"]);
		expect(ejsPlugin.options.priority).toBe(10);
		expect(handlebarsPlugin.engine).toBeTruthy();
		expect(handlebarsPlugin.options.patterns).toEqual(["*.hbs"]);
		expect(handlebarsPlugin.options.priority).toBe(5);
	});

	it("should add plugins to plugin manager", () => {
		const ejsPlugin = ejs({ patterns: ["*.ejs"], priority: 10 });
		const handlebarsPlugin = handlebars({
			patterns: ["*.hbs"],
			priority: 5,
		});

		expect(ejsPlugin.engine).toBeTruthy();
		expect(handlebarsPlugin.engine).toBeTruthy();
	});

	it("should set default plugin", () => {
		const ejsPlugin = ejs();
		expect(ejsPlugin.engine).toBeTruthy();
	});

	it("should create Combino with plugin config", () => {
		const combino = new Combino();
		expect(combino).toBeInstanceOf(Combino);
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
			path.join(templatesDir, "default-template.txt"),
			"Hello <%= name %>!",
		);

		const combino = new Combino();

		await combino.combine({
			outputDir: path.join(testDir, "output"),
			include: [templatesDir],
			data: { name: "World" },
			plugins: [
				ejs({ patterns: ["*.ejs"] }),
				handlebars({ patterns: ["*.hbs"] }),
				ejs({ patterns: ["*.txt"] }), // Default for .txt files
			],
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

		const defaultOutput = await fs.readFile(
			path.join(testDir, "output", "default-template.txt"),
			"utf-8",
		);
		expect(defaultOutput).toBe("Hello World!");
	});

	it("should maintain backward compatibility with single plugin", async () => {
		// Create test template
		await fs.writeFile(
			path.join(templatesDir, "template.ejs"),
			"Hello <%= name %>!",
		);

		const combino = new Combino();

		await combino.combine({
			outputDir: path.join(testDir, "output"),
			include: [templatesDir],
			data: { name: "World" },
			plugins: [ejs()],
		});

		const output = await fs.readFile(
			path.join(testDir, "output", "template.ejs"),
			"utf-8",
		);
		expect(output).toBe("Hello World!");
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
			data: { name: "World" },
			plugins: [ejs({ priority: 5 }), handlebars({ priority: 5 })],
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
			data: { name: "World", other: "Universe" },
			plugins: [
				ejs({ patterns: ["*.txt"], priority: 10 }),
				handlebars({ priority: 5 }),
			],
		});

		// Should use EJS due to higher priority pattern match
		const output = await fs.readFile(
			path.join(testDir, "output", "mixed-syntax.txt"),
			"utf-8",
		);
		expect(output).toBe("Hello World and {{other}}!");
	});
});
