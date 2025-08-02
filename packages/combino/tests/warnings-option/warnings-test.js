import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testWarningsOption() {
    const combino = new Combino();
    const inputDir = path.join(__dirname, 'input/base');
    const outputDir = path.join(__dirname, 'output');

    console.log('=== Testing with warnings enabled (default) ===');
    try {
        await combino.build({
            outputDir: outputDir + '-with-warnings',
            include: [inputDir],
            data: {
                framework: 'react',
                language: 'ts'
            }
        });
        console.log('✅ Build completed with warnings enabled');
    } catch (error) {
        console.error('❌ Build failed with warnings enabled:', error.message);
    }

    console.log('\n=== Testing with warnings disabled ===');
    try {
        await combino.build({
            outputDir: outputDir + '-without-warnings',
            include: [inputDir],
            data: {
                framework: 'react',
                language: 'ts'
            },
            warnings: false
        });
        console.log('✅ Build completed with warnings disabled');
    } catch (error) {
        console.error('❌ Build failed with warnings disabled:', error.message);
    }
}

testWarningsOption().catch(console.error);
