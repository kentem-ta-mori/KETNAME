import * as vscode from 'vscode';
import { getApimSubscriptionKey } from '../commands/apimKey';
import { generatePrompt } from '../generatePrompt';
import { AzureApimProvider } from './providers/azureApimProvider';
import { LLMResult, LLMSuccessResponse, LLMErrorResponse, LLMErrorType } from './interfaces/llm_response.interface';
import { ChatMessage } from './providers/types';

export async function callApimForSuggestions(context: vscode.ExtensionContext, codeContext: string, userIntent: string, domainKnowledge: string): Promise<LLMResult> {
    const config = vscode.workspace.getConfiguration('ketname');
    const baseUrl = 'https://apim-ketname.azure-api.net/llm';
    const model = 'Phi-4-mini-reasoning';
    const maxTokens = config.get<number>('apim.maxTokens');
    const temperature = config.get<number>('apim.temperature');

    const subscriptionKey = await getApimSubscriptionKey(context);
    if (!subscriptionKey) {
        vscode.window.showErrorMessage('APIMサブスクリプションキーが設定されていません。');
        return { success: false, error: { type: 'API_ERROR', message: 'APIMサブスクリプションキーが設定されていません。' } };
    }

    // The prompt from generatePrompt is a detailed instruction for an LLM, which we can use as the user message.
    const systemPrompt = "";
    const userPrompt = generatePrompt(codeContext, userIntent, domainKnowledge);

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    try {
        const provider = new AzureApimProvider({
            baseUrl,
            subscriptionKey,
            model,
            defaultMaxTokens: maxTokens,
            defaultTemperature: temperature
        });

        let text = await provider.chat(messages);

        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
            text = match[1];
        }

        const parsedResponse: LLMSuccessResponse = JSON.parse(text);

        if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
            parsedResponse.suggestions.sort((a, b) => b.confidence - a.confidence);
        } else {
            throw new Error("Invalid response format: 'suggestions' property is missing or not an array.");
        }

        return { success: true, data: parsedResponse };

    } catch (error) {
        console.error("Error calling APIM or parsing response:", error);

        let errorType: LLMErrorType = 'UNKNOWN_ERROR';
        let message = 'An unknown error occurred while getting suggestions.';

        if (error instanceof SyntaxError) {
            errorType = 'PARSING_ERROR';
            message = 'Failed to parse the response from the AI. The format was invalid.';
        } else if (error instanceof Error) {
            errorType = 'API_ERROR';
            message = `An error occurred while communicating with the AI: ${error.message}`;
        }

        const errorResponse: LLMErrorResponse = { type: errorType, message };
        return { success: false, error: errorResponse };
    }
}
