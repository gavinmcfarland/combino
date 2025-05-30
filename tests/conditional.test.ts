import { readFileSync, rmSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { Combino } from "../src";

describe("Conditional Folder Test Suite", () => {
	const testDir = join(__dirname, "conditional");
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
			data: {
				framework: "react",
			},
			targetDir: outputDir,
			templates: inputDirs,
		});
	});

	function compareDirectories(outputPath: string, expectedPath: string) {
		const outputStats = statSync(outputPath);
		const expectedStats = statSync(expectedPath);

		// Check if both paths are files or both are directories
		expect(outputStats.isDirectory()).toBe(expectedStats.isDirectory());

		if (outputStats.isDirectory()) {
			const outputFiles = readdirSync(outputPath);
			const expectedFiles = readdirSync(expectedPath);

			// Check if both directories have the same files
			expect(outputFiles.sort()).toEqual(expectedFiles.sort());

			// Recursively compare each file/directory
			for (const file of outputFiles) {
				compareDirectories(
					join(outputPath, file),
					join(expectedPath, file)
				);
			}
		} else {
			// Compare file contents
			const outputContent = readFileSync(outputPath, "utf-8");
			const expectedContent = readFileSync(expectedPath, "utf-8");

			// Special handling for JSON files
			if (outputPath.endsWith(".json")) {
				const outputJson = JSON.parse(outputContent);
				const expectedJson = JSON.parse(expectedContent);
				expect(outputJson).toEqual(expectedJson);
			} else {
				expect(outputContent).toBe(expectedContent);
			}
		}
	}

	it("should match the expected output exactly", () => {
		compareDirectories(outputDir, expectedDir);
	});

	describe("Conditional folder processing", () => {
		it("should include files from matching conditional folders", () => {
			// The file should exist directly in the output directory since the conditional folder is removed
			const reactFile = join(outputDir, "App.tsx");
			const expectedFile = join(expectedDir, "App.tsx");
			expect(existsSync(reactFile)).toBe(true);
			expect(readFileSync(reactFile, "utf-8")).toBe(
				readFileSync(expectedFile, "utf-8")
			);
		});

		it("should exclude files from non-matching conditional folders", () => {
			const vueFile = join(outputDir, "App.vue");
			expect(existsSync(vueFile)).toBe(false);
		});

		it("should keep base folder names when condition is part of the name", () => {
			// If we have a folder like "src[?framework=react]", it should become "src"
			const srcFile = join(outputDir, "src", "index.tsx");
			const expectedFile = join(expectedDir, "src", "index.tsx");
			expect(existsSync(srcFile)).toBe(true);
			expect(readFileSync(srcFile, "utf-8")).toBe(
				readFileSync(expectedFile, "utf-8")
			);
		});
	});

	describe("EJS template processing", () => {
		it("should process package.json with data from .combino", () => {
			const outputPath = join(outputDir, "package.json");
			const expectedPath = join(expectedDir, "package.json");

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

			expect(output).toEqual(expected);
		});

		it("should process README.md with data from .combino", () => {
			const outputPath = join(outputDir, "README.md");
			const expectedPath = join(expectedDir, "README.md");

			const output = readFileSync(outputPath, "utf-8");
			const expected = readFileSync(expectedPath, "utf-8");

			expect(output).toBe(expected);
		});
	});
});
