import { describe, it, expect } from "vitest";
import { Combino } from "../../src/index.js";
import { assertDirectoriesEqual } from "../utils/directory-compare.js";
import path from "path";
import fs from "fs/promises";

describe("Unified Configuration", () => {
	it("should work with programmatic config object", async () => {
		const combino = new Combino();
		const testDir = path.join(__dirname, "output");
		const expectedDir = path.join(__dirname, "expected-programmatic");

		// Clean up
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {}

		const config = {
			data: {
				project: {
					name: "Test Project",
					version: "1.0.0",
				},
			},
			merge: {
				"*.json": { strategy: "deep" },
				"*.md": { strategy: "replace" },
			},
		};

		await combino.combine({
			templates: [path.join(__dirname, "input/base")],
			outputDir: testDir,
			config,
		});

		// Compare the entire output directory with the expected directory
		assertDirectoriesEqual(testDir, expectedDir, {
			ignoreWhitespace: true,
			parseJson: true,
		});
	});

	it("should work with .combino config file", async () => {
		const combino = new Combino();
		const testDir = path.join(__dirname, "output-file");
		const expectedDir = path.join(__dirname, "expected-file");

		// Clean up
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {}

		await combino.combine({
			templates: [path.join(__dirname, "input/base")],
			outputDir: testDir,
			config: path.join(__dirname, "input/config.combino"),
		});

		// Compare the entire output directory with the expected directory
		assertDirectoriesEqual(testDir, expectedDir, {
			ignoreWhitespace: true,
			parseJson: true,
		});
	});
});
