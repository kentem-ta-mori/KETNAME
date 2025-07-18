import * as vscode from 'vscode';
import { getApiKey, getDomainKnowledgePaths, getDomainKnowledgeContent, setApiKey } from './config_manager';
import { getNamingContext } from './context_provider';
import { generatePrompt, callGeminiApi } from './llm_service';
import { showNamingSuggestions, promptForNamingIntent, showContextSizeWarning } from './ui_provider';
import { LLMSuccessResponse } from './interfaces/llm_response.interface';

const MAX_CONTEXT_LENGTH = 3000;

export async function handleSuggestName(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('アクティブなテキストエディタが見つかりません。');
        return;
    }

    // 1. コンテキストの取得
    const codeContext = getNamingContext();
    if (!codeContext) {
        vscode.window.showInformationMessage('命名のコンテキストとなるコードが見つかりません。');
        return;
    }

    // 2. コンテキストの文字数チェックと警告
    if (codeContext.length > MAX_CONTEXT_LENGTH) {
        const proceed = await showContextSizeWarning(codeContext.length);
        if (!proceed) {
            return;
        }
    }

    // 3. 日本語の意図の取得
    const userIntent = await promptForNamingIntent();
    if (!userIntent) {
        vscode.window.showInformationMessage('命名の意図が入力されませんでした。');
        return;
    }

    // APIキーの取得と設定（初回のみ）
    let apiKey = await getApiKey(context);
    if (!apiKey) {
        vscode.window.showErrorMessage('Gemini API Keyが設定されていません。VSCode Secret Storageに設定してください。');
        const inputApiKey = await vscode.window.showInputBox({
            prompt: 'Gemini API Keyを入力してください',
            ignoreFocusOut: true,
        });
        if (inputApiKey) {
            await setApiKey(context, inputApiKey);
            apiKey = inputApiKey;
        } else {
            return;
        }
    }

    // ドメイン知識の取得
    const domainKnowledgePaths = getDomainKnowledgePaths();
    const domainKnowledge = await getDomainKnowledgeContent(domainKnowledgePaths);

    // プレースホルダーの判定
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

    // プロンプト生成とAPI呼び出し
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "命名候補を生成中...",
        cancellable: false
    }, async (progress) => {
        try {
            const prompt = generatePrompt(codeContext, userIntent, domainKnowledge);
            const llmResult = await callGeminiApi(apiKey!, prompt);

            if (!llmResult.success) {
                vscode.window.showErrorMessage(`AIからの命名候補取得中にエラーが発生しました: ${llmResult.error.message}`);
                return;
            }

            const llmResponse: LLMSuccessResponse = llmResult.data;

            // 命名候補の表示と選択
            const selectedName = await showNamingSuggestions(llmResponse);

            if (selectedName) {
                // プレースホルダーの置換
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
