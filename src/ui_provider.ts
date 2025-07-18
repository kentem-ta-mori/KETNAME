import * as vscode from 'vscode';
import { LLMSuccessResponse } from './interfaces/llm_response.interface';

/**
 * 日本語での命名意図をユーザーに尋ねる入力ボックスを表示します。
 * @returns ユーザーが入力した文字列、またはキャンセルされた場合はundefined
 */
export async function promptForNamingIntent(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
        prompt: '提案してほしい名前の意図を日本語で入力してください (例: ユーザー情報を格納する変数)',
        placeHolder: '例: ユーザー情報を格納する変数',
        ignoreFocusOut: true,
    });
}

/**
 * Gemini APIからの命名提案をQuick Pickで表示し、ユーザーの選択を待ちます。
 * @param llmResponse LLMからの成功レスポンス
 * @returns ユーザーが選択した名前、またはキャンセルされた場合はundefined
 */
export async function showNamingSuggestions(llmResponse: LLMSuccessResponse): Promise<string | undefined> {
    if (llmResponse.suggestions.length === 0) {
        vscode.window.showInformationMessage('命名の提案が見つかりませんでした。');
        return undefined;
    }

    const quickPickItems: vscode.QuickPickItem[] = llmResponse.suggestions.map(s => ({
        label: s.name,
        detail: s.reason,
        description: `Confidence: ${(s.confidence * 100).toFixed(0)}%`
    }));

    const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: '提案された名前を選択してください',
        ignoreFocusOut: true,
    });

    return selectedItem ? selectedItem.label : undefined;
}

/**
 * コンテキストが巨大な場合に警告を表示し、続行するか確認します。
 * @param contextLength コンテキストの文字数
 * @returns ユーザーが続行を選択した場合はtrue、キャンセルした場合はfalse
 */
export async function showContextSizeWarning(contextLength: number): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
        `選択されたコンテキストが${contextLength}文字と大きすぎます。AIの応答に時間がかかったり、精度が低下する可能性があります。続行しますか？`,
        { modal: true },
        '続行',
        'キャンセル'
    );
    return result === '続行';
}
