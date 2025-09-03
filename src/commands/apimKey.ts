import * as vscode from 'vscode';

const APIM_KEY_SECRET_KEY = 'ketname.apim.subscriptionKey';

/**
 * Prompts the user for an APIM subscription key and stores it in SecretStorage.
 * @param context The extension context.
 */
export async function setApimKeyCmd(context: vscode.ExtensionContext): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Azure API Managementのサブスクリプションキーを入力してください',
        ignoreFocusOut: true,
        password: true,
    });
    if (apiKey) {
        await setApimSubscriptionKey(context, apiKey);
        vscode.window.showInformationMessage('APIMサブスクリプションキーを保存しました。');
    }
}

/**
 * Removes the APIM subscription key from SecretStorage.
 * @param context The extension context.
 */
export async function removeApimKeyCmd(context: vscode.ExtensionContext): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
        '本当にAPIMサブスクリプションキーを削除しますか？',
        { modal: true },
        'Yes'
    );
    if (confirmation === 'Yes') {
        await removeApimSubscriptionKey(context);
        vscode.window.showInformationMessage('APIMサブスクリプションキーを削除しました。');
    }
}

/**
 * Retrieves the APIM subscription key from SecretStorage.
 * @param context The extension context.
 * @returns The APIM key, or undefined if not set.
 */
export async function getApimSubscriptionKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    return await context.secrets.get(APIM_KEY_SECRET_KEY);
}

/**
 * Stores the APIM subscription key in SecretStorage.
 * @param context The extension context.
 * @param apiKey The APIM key to store.
 */
async function setApimSubscriptionKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
    await context.secrets.store(APIM_KEY_SECRET_KEY, apiKey);
}

/**
 * Removes the APIM subscription key from SecretStorage.
 * @param context The extension context.
 */
async function removeApimSubscriptionKey(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete(APIM_KEY_SECRET_KEY);
}
