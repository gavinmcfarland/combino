import { readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Companion File Test Suite", () => {
	const testDir = __dirname;
	const inputDirs = ["base", "override"].map((dir) =>
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

	describe("Companion file processing", () => {
		it("should correctly process companion .combino files", () => {
			const outputPath = join(outputDir, "package.json");
			const expectedPath = join(expectedDir, "package.json");

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

			expect(output).toEqual(expected);
		});
	});
});
