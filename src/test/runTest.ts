import * as path from 'path';
import * as cp from 'child_process';
const packageJson = require('../../package.json');
import { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');
		const vscodeExecutablePath = await downloadAndUnzipVSCode();
        const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

        if (packageJson.extensionDependencies) {
            for (const extensionId of packageJson.extensionDependencies) {
                cp.spawnSync(cli, [...args, '--install-extension', extensionId], {
                    encoding: 'utf-8',
                    stdio: 'inherit',
                });
            }
		}
		// Download VS Code, unzip it and run the integration test
		const options = {
			"extensionDevelopmentPath": extensionDevelopmentPath,
			"extensionTestsPath": extensionTestsPath

		};
		await runTests(options);
		
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	}
}

main();
