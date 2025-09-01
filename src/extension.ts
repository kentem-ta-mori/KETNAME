import * as vscode from 'vscode';
import { handleSuggestName } from './command_handler';
import { setApiKey, removeApiKey } from './config_manager';

export function activate(context: vscode.ExtensionContext) {

	console.log('拡張機能「KETNAME」が有効化されました。');

	const suggestNameDisposable = vscode.commands.registerCommand('ketname.suggestName', async () => {
		await handleSuggestName(context);
	});

	const setApiKeyDisposable = vscode.commands.registerCommand('ketname.setApiKey', async () => {
		const inputApiKey = await vscode.window.showInputBox({
			prompt: 'Gemini APIキーを入力してください',
			ignoreFocusOut: true,
			password: true
		});

		if (inputApiKey) {
			await setApiKey(context, inputApiKey);
			vscode.window.showInformationMessage('Gemini APIキーを正常に設定しました。');
		}
	});

	const removeApiKeyDisposable = vscode.commands.registerCommand('ketname.removeApiKey', async () => {
		const confirmation = await vscode.window.showWarningMessage(
			'本当にGemini APIキーを削除しますか？',
			{ modal: true },
			'Yes'
		);

		if (confirmation === 'Yes') {
			await removeApiKey(context);
			vscode.window.showInformationMessage('Gemini APIキーを削除しました。');
		}
	});

	context.subscriptions.push(
		suggestNameDisposable,
		setApiKeyDisposable,
		removeApiKeyDisposable
	);
}

export function deactivate() {}
