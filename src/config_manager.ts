// src/config_manager.ts

import * as vscode from 'vscode';

/**
 * APIキーをVSCodeのSecretStorageから安全に取得します。
 * @returns 取得したAPIキー、または未設定の場合はundefinedを返します。
 */
export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return await context.secrets.get('geminiApiKey');
}

/**
 * APIキーをVSCodeのSecretStorageに安全に保存します。
 * @param context 拡張機能のコンテキスト
 * @param apiKey 保存するAPIキー
 */
export async function setApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
  await context.secrets.set('geminiApiKey', apiKey);
}
