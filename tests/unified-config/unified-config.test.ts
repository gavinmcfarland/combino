import { describe, it, expect } from "vitest";
import { Combino } from "../../src/index.js";
import path from "path";
import fs from "fs/promises";

describe("Unified Configuration", () => {
	it("should work with programmatic config object", async () => {
		const combino = new Combino();
		const testDir = path.join(__dirname, "output");

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

		// Verify the output was generated
		const packageJson = await fs.readFile(
			path.join(testDir, "package.json"),
			"utf-8",
		);
		const parsed = JSON.parse(packageJson);

		expect(parsed.name).toBe("te-t project");
		expect(parsed.version).toBe("1.0.0");
	});

	it("should work with .combino config file", async () => {
		const combino = new Combino();
		const testDir = path.join(__dirname, "output-file");

		// Clean up
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {}

		await combino.combine({
			templates: [path.join(__dirname, "input/base")],
			outputDir: testDir,
			config: path.join(__dirname, "input/config.combino"),
		});

		// Verify the output was generated
		const packageJson = await fs.readFile(
			path.join(testDir, "package.json"),
			"utf-8",
		);
		const parsed = JSON.parse(packageJson);

		expect(parsed.name).toBe("config project");
		expect(parsed.version).toBe("2.0.0");
	});
});
