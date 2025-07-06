const { spawn } = require('child_process');

console.log('Testing TypeScript stripping fix...');

const child = spawn('node', ['index.js'], {
	stdio: ['pipe', 'pipe', 'pipe'],
});

// Send the input
child.stdin.write('svelte\n');
child.stdin.write('plugin\n');
child.stdin.write('basic\n');
child.stdin.write('n\n');
child.stdin.write('test-plugin\n');
child.stdin.end();

let output = '';
let errorOutput = '';

child.stdout.on('data', (data) => {
	output += data.toString();
});

child.stderr.on('data', (data) => {
	errorOutput += data.toString();
});

child.on('close', (code) => {
	console.log('Process completed with code:', code);

	// Count the number of "Processing TypeScript string with Babel" occurrences
	const tsProcessingCount = (output.match(/Processing TypeScript string with Babel/g) || []).length;
	const strippedCount = (output.match(/🔄 Stripped TypeScript from/g) || []).length;

	console.log(`\nResults:`);
	console.log(`- TypeScript processing calls: ${tsProcessingCount}`);
	console.log(`- Files stripped: ${strippedCount}`);

	if (tsProcessingCount <= 10) {
		console.log('✅ Fix appears to be working - reduced processing calls');
	} else {
		console.log('❌ Still too many processing calls');
	}

	// Show first few lines of output
	console.log('\nFirst 10 lines of output:');
	console.log(output.split('\n').slice(0, 10).join('\n'));
});
