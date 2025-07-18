// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { handleSuggestName } from './command_handler';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "ketname" is now active!');

	let disposable = vscode.commands.registerCommand('ketname.suggestName', async () => {
		await handleSuggestName(context);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
