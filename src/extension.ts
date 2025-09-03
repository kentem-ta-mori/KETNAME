import * as vscode from 'vscode';
import { handleSuggestName } from './command_handler';
import { setGeminiApiKey, removeGeminiApiKey } from './config_manager';
import { setApimKeyCmd, removeApimKeyCmd } from './commands/apimKey';

export function activate(context: vscode.ExtensionContext) {

	console.log('拡張機能「KETNAME」が有効化されました。');

	// Register Commands
	const suggestNameDisposable = vscode.commands.registerCommand('ketname.suggestName', async () => {
		await handleSuggestName(context);
	});

	// APIM Commands
	const setApimKeyDisposable = vscode.commands.registerCommand('ketname.setApimKey', async () => {
		await setApimKeyCmd(context);
	});

	const removeApimKeyDisposable = vscode.commands.registerCommand('ketname.removeApimKey', async () => {
		await removeApimKeyCmd(context);
	});

	// (Legacy) Gemini Commands
	const setGeminiApiKeyDisposable = vscode.commands.registerCommand('ketname.setGeminiApiKey', async () => {
		const inputApiKey = await vscode.window.showInputBox({
			prompt: 'Gemini APIキーを入力してください',
			ignoreFocusOut: true,
			password: true
		});

		if (inputApiKey) {
			await setGeminiApiKey(context, inputApiKey);
			vscode.window.showInformationMessage('Gemini APIキーを正常に設定しました。');
		}
	});

	const removeGeminiApiKeyDisposable = vscode.commands.registerCommand('ketname.removeGeminiApiKey', async () => {
		const confirmation = await vscode.window.showWarningMessage(
			'本当にGemini APIキーを削除しますか？',
			{ modal: true },
			'Yes'
		);

		if (confirmation === 'Yes') {
			await removeGeminiApiKey(context);
			vscode.window.showInformationMessage('Gemini APIキーを削除しました。');
		}
	});

	context.subscriptions.push(
		suggestNameDisposable,
		setApimKeyDisposable,
		removeApimKeyDisposable,
		setGeminiApiKeyDisposable,
		removeGeminiApiKeyDisposable
	);
}

export function deactivate() {}
