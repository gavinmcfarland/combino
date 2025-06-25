import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";
import { assertDirectoriesEqual } from "../utils/directory-compare.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Include Target Ignore Edge Case Test Suite", () => {
	const testDir = __dirname;
	const baseDir = join(testDir, "input", "base");
	const frameworkDir = join(testDir, "input", "framework");
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
		// This simulates the figma example where both templates are passed programmatically
		await combino.combine({
			outputDir: outputDir,
			templates: [baseDir, frameworkDir],
		});
	});

	describe("Template passed programmatically and included with target", () => {
		it("should correctly handle template passed programmatically and included with target", () => {
			// Compare the entire output directory with the expected directory
			assertDirectoriesEqual(outputDir, expectedDir, {
				ignoreWhitespace: true,
				parseJson: true,
			});
		});
	});
});
