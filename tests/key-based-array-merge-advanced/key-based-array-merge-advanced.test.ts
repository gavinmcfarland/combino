import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";
import { assertDirectoriesEqual } from "../utils/directory-compare.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Advanced Key-based Array Merge Test Suite", () => {
	const testDir = __dirname;
	const inputDirs = ["base", "override"].map((dir) =>
		join(testDir, "input", dir),
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

	describe("Advanced key-based array merging", () => {
		it("should correctly merge arrays of objects based on multiple key fields", () => {
			// Compare the entire output directory with the expected directory
			assertDirectoriesEqual(outputDir, expectedDir, {
				ignoreWhitespace: true,
				parseJson: true,
			});
		});
	});
});
