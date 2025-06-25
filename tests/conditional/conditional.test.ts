import { promises as fs, readFileSync } from "fs";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";
import { assertDirectoriesEqual } from "../utils/directory-compare.js";

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
		assertDirectoriesEqual(outputDir, expectedDir, {
			ignoreWhitespace: true,
			parseJson: true,
		});
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
				readFileSync(expectedAppFile, "utf-8"),
			);
		} else {
			expect(existsSync(appFile)).toBe(false);
		}
	});

	// Add more tests here, all using scenarioData and expectedDir
});
