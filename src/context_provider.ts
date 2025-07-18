// src/context_provider.ts

import * as vscode from 'vscode';

/**
 * VSCodeエディタでユーザーが選択している範囲のソースコードを取得します。
 * @returns 選択範囲のコード文字列、または選択されていない場合はundefinedを返します。
 */
export function getSelectedText(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return undefined;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        return undefined;
    }

    return editor.document.getText(selection);
}