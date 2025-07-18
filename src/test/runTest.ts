import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './extension.spec.js'); // コンパイルされたJSファイルを指定

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: ['--no-sandbox', '--enable-proposed-api'], // Electronに--no-sandboxと--enable-proposed-apiを渡す
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
