import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, it, beforeAll } from "vitest";
import { Combino } from "../../src/index.js";
import { assertDirectoriesEqual } from "../utils/directory-compare.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Text Merge Test Suite", () => {
	const testDir = __dirname;
	const inputDirs = ["base", "typescript"].map((dir) =>
		join(testDir, "input", dir),
	);
	const outputDir = join(testDir, "output");
	const expectedDir = join(testDir, "expected");
	const configFile = join(testDir, "input", ".combino");

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
			data: {
				framework: "react",
			},
			config: configFile,
		});
	});

	describe("Text file merging", () => {
		it("should correctly merge text files from multiple input folders", () => {
			// Compare the entire output directory with the expected directory
			assertDirectoriesEqual(outputDir, expectedDir, {
				ignoreWhitespace: true,
				parseJson: true,
			});
		});
	});
});
