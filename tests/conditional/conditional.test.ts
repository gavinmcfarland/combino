import { promises as fs } from "fs";
import { join, dirname } from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputDir = join(__dirname, "input");
const outputDir = join(__dirname, "output");
const expectedDir = join(__dirname, "expected");

// Single scenario for all tests
const scenarioData = { framework: "react", language: "ts", type: "web" };

describe("Conditional Folder Test Suite", () => {
	beforeEach(async () => {
		await fs.rm(outputDir, { recursive: true, force: true });
		await fs.mkdir(outputDir, { recursive: true });
	});

	it("should match the expected output exactly", async () => {
		const combino = new Combino();
		await combino.combine({
			outputDir: outputDir,
			templates: [join(inputDir, "base")],
			data: scenarioData,
		});
		await compareDirectories(outputDir, expectedDir);
	});

	it("should have the correct App.tsx", async () => {
		const combino = new Combino();
		await combino.combine({
			outputDir: outputDir,
			templates: [join(inputDir, "base")],
			data: scenarioData,
		});
		const appFile = join(outputDir, "App.tsx");
		const expectedAppFile = join(expectedDir, "App.tsx");
		if (existsSync(expectedAppFile)) {
			expect(existsSync(appFile)).toBe(true);
			expect(readFileSync(appFile, "utf-8")).toBe(
				readFileSync(expectedAppFile, "utf-8")
			);
		} else {
			expect(existsSync(appFile)).toBe(false);
		}
	});

	// Add more tests here, all using scenarioData and expectedDir
});

async function compareDirectories(dir1: string, dir2: string) {
	const files1 = await fs.readdir(dir1);
	const files2 = await fs.readdir(dir2);

	// Check if both directories have the same files
	expect(files1.sort()).toEqual(files2.sort());

	// Recursively compare each file/directory
	for (const file of files1) {
		const path1 = join(dir1, file);
		const path2 = join(dir2, file);
		const stat1 = await fs.stat(path1);
		const stat2 = await fs.stat(path2);

		// Check if both paths are of the same type (file/directory)
		expect(stat1.isDirectory()).toBe(stat2.isDirectory());

		if (stat1.isDirectory()) {
			// Recursively compare subdirectories
			await compareDirectories(path1, path2);
		} else {
			// Compare file contents
			const content1 = await fs.readFile(path1, "utf-8");
			const content2 = await fs.readFile(path2, "utf-8");

			if (file.endsWith(".json")) {
				// For JSON files, parse and compare objects
				const obj1 = JSON.parse(content1);
				const obj2 = JSON.parse(content2);
				expect(obj1).toEqual(obj2);
			} else {
				// For other files, compare content directly
				try {
					expect(content1).toBe(content2);
				} catch (error) {
					throw new Error(
						`Files differ at ${path1}:\nExpected: ${content2}\nReceived: ${content1}`
					);
				}
			}
		}
	}
}
