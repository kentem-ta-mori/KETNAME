// src/config_manager.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

/**
 * VSCodeの設定からドメイン知識ファイルのパスリストを取得します。
 * @returns ドメイン知識ファイルのパスの文字列配列。
 */
export function getDomainKnowledgePaths(): string[] {
  const config = vscode.workspace.getConfiguration('ketname');
  const paths = config.get<string[]>('domainKnowledgePaths', []);
  return paths;
}

/**
 * 指定されたパスのファイル内容を結合し、単一の文字列として取得します。
 * @param filePaths ファイルパスの文字列配列。
 * @returns 結合されたドメイン知識の文字列。
 */
export async function getDomainKnowledgeContent(filePaths: string[]): Promise<string> {
  let content = '';
  for (const filePath of filePaths) {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(vscode.workspace.rootPath || '', filePath);
      const fileContent = await fs.promises.readFile(absolutePath, 'utf8');
      content += fileContent + '\n';
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read domain knowledge file: ${filePath}. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return content;
}
