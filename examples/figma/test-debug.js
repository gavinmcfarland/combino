import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testDebug() {
    const combino = new Combino();

    await combino.combine({
        outputDir: path.join(__dirname, 'output/debug-test'),
        include: [
            path.join(__dirname, 'templates/examples/plugin/basic')
        ],
        data: {
            framework: 'svelte',
            language: 'ts',
            name: 'debug-test',
            description: 'Debug test',
            typescript: true
        }
    });
}

testDebug().catch(console.error);
