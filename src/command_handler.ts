import * as vscode from 'vscode';
import { getDomainKnowledgePaths, getDomainKnowledgeContent, getGeminiApiKey, setGeminiApiKey } from './config_manager';
import { getNamingContext } from './context_provider';
import { showNamingSuggestions, promptForNamingIntent, showContextSizeWarning } from './ui_provider';
import { LLMSuccessResponse, LLMResult } from './llm/interfaces/llm_response.interface';
import { callApimForSuggestions } from './llm/callApim';
import { callGeminiApi } from './llm/callGemini';
import { generatePrompt } from './generatePrompt';

const MAX_CONTEXT_LENGTH = 3000;

export async function handleSuggestName(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('アクティブなテキストエディタが見つかりません。');
        return;
    }

    const codeContext = getNamingContext();
    if (!codeContext) {
        vscode.window.showInformationMessage('命名のコンテキストとなるコードが見つかりません。');
        return;
    }

    if (codeContext.length > MAX_CONTEXT_LENGTH) {
        const proceed = await showContextSizeWarning(codeContext.length);
        if (!proceed) {
            return;
        }
    }

    const userIntent = await promptForNamingIntent();
    if (!userIntent) {
        vscode.window.showInformationMessage('命名の意図が入力されませんでした。');
        return;
    }

    const domainKnowledgePaths = getDomainKnowledgePaths();
    const domainKnowledge = await getDomainKnowledgeContent(domainKnowledgePaths);

    const documentText = editor.document.getText();
    let placeholder: string | undefined;
    if (documentText.includes('KV')) {
        placeholder = 'KV';
    } else if (documentText.includes('KM')) {
        placeholder = 'KM';
    } else {
        vscode.window.showInformationMessage('ファイル内にプレースホルダー (KV または KM) が見つかりませんでした。');
        return;
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "命名候補を生成中...",
        cancellable: false
    }, async (progress) => {
        try {
            const config = vscode.workspace.getConfiguration('ketname');
            const provider = config.get<string>('provider');

            let llmResult: LLMResult;

            if (provider === 'apim') {
                llmResult = await callApimForSuggestions(context, codeContext, userIntent, domainKnowledge);
            } else if (provider === 'gemini') {
                let apiKey = await getGeminiApiKey(context);
                if (!apiKey) {
                    const inputApiKey = await vscode.window.showInputBox({
                        prompt: 'Gemini API Keyを入力してください',
                        ignoreFocusOut: true,
                    });
                    if (inputApiKey) {
                        await setGeminiApiKey(context, inputApiKey);
                        apiKey = inputApiKey;
                    } else {
                        vscode.window.showErrorMessage('Gemini API Keyが設定されていません。');
                        return;
                    }
                }
                const prompt = generatePrompt(codeContext, userIntent, domainKnowledge);
                llmResult = await callGeminiApi(apiKey, prompt);
            } else {
                vscode.window.showErrorMessage(`無効なプロバイダーが設定されています: ${provider}`);
                return;
            }

            if (!llmResult.success) {
                vscode.window.showErrorMessage(`AIからの命名候補取得中にエラーが発生しました: ${llmResult.error.message}`);
                return;
            }

            const llmResponse: LLMSuccessResponse = llmResult.data;

            const selectedName = await showNamingSuggestions(llmResponse);

            if (selectedName) {
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(documentText.length));
                const text = editor.document.getText(fullRange);
                const regex = new RegExp(placeholder!, 'g');
                const newText = text.replace(regex, selectedName);
                edit.replace(editor.document.uri, fullRange, newText);
                await vscode.workspace.applyEdit(edit);
                vscode.window.showInformationMessage(`'${placeholder}' を '${selectedName}' に置換しました。`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`命名候補取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
