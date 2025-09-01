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

/**
 * 命名のコンテキストとなるコードを取得します。
 * ユーザーがテキストを選択している場合はその選択範囲を、
 * 選択していない場合は現在開いているファイル全体を返します。
 * @returns コンテキストとなるコード文字列、またはエディタが開かれていない場合はundefined
 */
export function getNamingContext(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return undefined;
    }

    const selectedText = getSelectedText();
    if (selectedText) {
        return selectedText;
    } else {
        return editor.document.getText();
    }
}
