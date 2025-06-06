import { readFileSync, rmSync } from "fs";
import { join } from "path";
import { Combino } from "../../src";

describe("Data Processing Test Suite", () => {
	const testDir = __dirname;
	const inputDirs = ["base", "typescript"].map((dir) =>
		join(testDir, "input", dir)
	);
	const outputDir = join(testDir, "output");

	beforeAll(async () => {
		// Clean up output directory before running tests
		try {
			rmSync(outputDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore error if directory doesn't exist
		}

		const combino = new Combino();
		await combino.combine({
			outputDir: outputDir,
			templates: inputDirs,
		});
	});

	describe("EJS template processing", () => {
		it("should process package.json with data from .combino", () => {
			const outputPath = join(outputDir, "package.json");
			const expectedPath = join(testDir, "expected", "package.json");

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

			expect(output).toEqual(expected);
		});

		it("should process README.md with data from .combino", () => {
			const outputPath = join(outputDir, "README.md");
			const expectedPath = join(testDir, "expected", "README.md");

			const output = readFileSync(outputPath, "utf-8");
			const expected = readFileSync(expectedPath, "utf-8");

			expect(output).toBe(expected);
		});
	});
});
