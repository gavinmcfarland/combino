import { readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Ignore Test Suite", () => {
	const testDir = __dirname;
	const inputDirs = ["base", "typescript"].map((dir) =>
		join(testDir, "input", dir)
	);
	const outputDir = join(testDir, "output");
	const expectedDir = join(testDir, "expected");

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

	describe("File ignoring", () => {
		it("should ignore files specified in .combino", () => {
			// The package.json file should not be in the output because it's listed in .combino
			const outputPath = join(outputDir, "package.json");
			expect(() => readFileSync(outputPath, "utf-8")).toThrow();
		});

		it("should still process non-ignored files", () => {
			const outputPath = join(outputDir, "README.md");
			const expectedPath = join(expectedDir, "README.md");

			const output = readFileSync(outputPath, "utf-8");
			const expected = readFileSync(expectedPath, "utf-8");

			expect(output).toBe(expected);
		});
	});
});
