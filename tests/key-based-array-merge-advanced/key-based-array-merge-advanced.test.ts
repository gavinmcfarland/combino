import { readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Advanced Key-based Array Merge Test Suite", () => {
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

	describe("Advanced key-based array merging", () => {
		it("should merge arrays of objects based on multiple key fields", () => {
			const outputPath = join(outputDir, "package.json");
			const expectedPath = join(expectedDir, "package.json");

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

			expect(output).toEqual(expected);
		});

		it("should merge dependencies by name key", () => {
			const outputPath = join(outputDir, "package.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			// Check that react was updated with new version and peer property
			const reactDep = output.dependencies.find(
				(dep: any) => dep.name === "react"
			);
			expect(reactDep).toBeDefined();
			expect(reactDep.version).toBe("^18.2.0");
			expect(reactDep.peer).toBe(true);

			// Check that react-dom was added
			const reactDomDep = output.dependencies.find(
				(dep: any) => dep.name === "react-dom"
			);
			expect(reactDomDep).toBeDefined();
			expect(reactDomDep.version).toBe("^18.2.0");

			// Check that typescript was preserved
			const typescriptDep = output.dependencies.find(
				(dep: any) => dep.name === "typescript"
			);
			expect(typescriptDep).toBeDefined();
			expect(typescriptDep.version).toBe("^5.0.0");
		});

		it("should merge devDependencies by name key", () => {
			const outputPath = join(outputDir, "package.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			// Check that vite was updated with new version and config
			const viteDep = output.devDependencies.find(
				(dep: any) => dep.name === "vite"
			);
			expect(viteDep).toBeDefined();
			expect(viteDep.version).toBe("^4.5.0");
			expect(viteDep.config.port).toBe(3000);

			// Check that @types/react was added
			const typesReactDep = output.devDependencies.find(
				(dep: any) => dep.name === "@types/react"
			);
			expect(typesReactDep).toBeDefined();
			expect(typesReactDep.version).toBe("^18.0.0");

			// Check that jest was preserved
			const jestDep = output.devDependencies.find(
				(dep: any) => dep.name === "jest"
			);
			expect(jestDep).toBeDefined();
			expect(jestDep.version).toBe("^29.0.0");
		});

		it("should merge configurations by id key", () => {
			const outputPath = join(outputDir, "package.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			// Check that development config was updated
			const devConfig = output.configurations.find(
				(config: any) => config.id === "development"
			);
			expect(devConfig).toBeDefined();
			expect(devConfig.features).toContain("eslint");
			expect(devConfig.port).toBe(3000);

			// Check that production config was preserved
			const prodConfig = output.configurations.find(
				(config: any) => config.id === "production"
			);
			expect(prodConfig).toBeDefined();
			expect(prodConfig.env).toBe("production");
			expect(prodConfig.debug).toBe(false);

			// Check that staging config was added
			const stagingConfig = output.configurations.find(
				(config: any) => config.id === "staging"
			);
			expect(stagingConfig).toBeDefined();
			expect(stagingConfig.env).toBe("staging");
			expect(stagingConfig.features).toContain("analytics");
		});

		it("should preserve non-array properties", () => {
			const outputPath = join(outputDir, "package.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			expect(output.name).toBe("advanced-test");
			expect(output.version).toBe("1.0.0");
			expect(output.scripts.build).toBe("tsc");
			expect(output.scripts.test).toBe("jest");
			expect(output.scripts.dev).toBe("vite");
		});
	});
});
