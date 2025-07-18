// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getApiKey, getDomainKnowledgePaths, getDomainKnowledgeContent, setApiKey } from './config_manager';
import { getSelectedText } from './context_provider';
import { generatePrompt, callGeminiApi } from './llm_service';
import { LLMResponse } from './interfaces/llm_response.interface';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "ketname" is now active!');

	let disposable = vscode.commands.registerCommand('ketname.suggestName', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active text editor found.');
			return;
		}

		const selectedText = getSelectedText();
		if (!selectedText) {
			vscode.window.showInformationMessage('Please select some code to suggest names.');
			return;
		}

		let apiKey = await getApiKey(context);
		if (!apiKey) {
			vscode.window.showErrorMessage('Gemini API Key is not set. Please set it in VSCode Secret Storage.');
			// Optionally, prompt the user to set the API key
			const inputApiKey = await vscode.window.showInputBox({
				prompt: 'Enter your Gemini API Key',
				ignoreFocusOut: true,
			});
			if (inputApiKey) {
				await setApiKey(context, inputApiKey);
				apiKey = inputApiKey;
			} else {
				return;
			}
		}

		const domainKnowledgePaths = getDomainKnowledgePaths();
		const domainKnowledge = await getDomainKnowledgeContent(domainKnowledgePaths);

		const prompt = generatePrompt(selectedText, domainKnowledge);

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Generating naming suggestions...",
			cancellable: false
		}, async (progress) => {
			try {
				const llmResponse: LLMResponse = await callGeminiApi(apiKey!, prompt);

				if (llmResponse.suggestions.length === 0) {
					vscode.window.showInformationMessage('No naming suggestions found.');
					return;
				}

				const quickPickItems: vscode.QuickPickItem[] = llmResponse.suggestions.map(s => ({
					label: s.name,
					detail: s.reason,
				}));

				const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
					placeHolder: 'Select a naming suggestion',
					ignoreFocusOut: true,
				});

				if (selectedItem) {
					editor.edit(editBuilder => {
						editBuilder.replace(editor.selection, selectedItem.label);
					});
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Error getting naming suggestions: ${error instanceof Error ? error.message : String(error)}`);
			}
		});
	});

	context.subscriptions.push(disposable);

	// Also register the helloWorld command as it was in the original extension.ts
	const helloWorldDisposable = vscode.commands.registerCommand('ketname.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from KETNAME!');
	});
	context.subscriptions.push(helloWorldDisposable);
}

export function deactivate() {}
