// src/llm_service.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
// 修正: 改訂版のシステム憲法に準拠したインターフェースをインポートします
import { LLMResult, LLMSuccessResponse, LLMErrorResponse, LLMErrorType } from './interfaces/llm_response.interface';

/**
 * LLMに送信するプロンプトを組み立てます。
 * @param codeContext ユーザーが選択したコードのコンテキスト。
 * @param domainKnowledge ドメイン知識の文字列。
 * @returns 組み立てられたプロンプト文字列。
 */
export function generatePrompt(codeContext: string, domainKnowledge: string): string {
  // 修正: テンプレートリテラル内でバッククオートを使用するため、\`\`\` のようにエスケープします。
  // また、プロンプト内のインターフェース定義を改訂版の憲法に合わせます。
  return `You are an AI assistant that helps developers name variables and methods.
Your goal is to suggest high-quality names based on the provided Japanese comments and project-specific domain knowledge.

Here is the code context:
\`\`\`typescript
${codeContext}
\`\`\`

Here is the project-specific domain knowledge:
\`\`\`
${domainKnowledge}
\`\`\`

Based on the above context and domain knowledge, please suggest 3 variable/method names that are concise, descriptive, and idiomatic for the given code. Provide a reason for each suggestion and a confidence score between 0.0 and 1.0.

Your response must be a JSON string strictly adhering to the following TypeScript interface. The 'suggestions' array must be sorted in descending order of confidence.

interface LLMSuccessResponse {
  suggestions: {
    name: string;      // Suggested name
    reason: string;    // Reason for the suggestion
    confidence: number; // Confidence score from 0.0 to 1.0
  }[];
}

Example:
{
  "suggestions": [
    {
      "name": "calculateTotalPrice",
      "reason": "Calculates the total price of items in the shopping cart.",
      "confidence": 0.95
    },
    {
      "name": "getTotalPrice",
      "reason": "Retrieves the total price from a stored value.",
      "confidence": 0.8
    }
  ]
}
`;
}

/**
 * Gemini APIにプロンプトを送信し、結果をLLMResult型で受け取ります。
 * @param apiKey Gemini APIキー。
 * @param prompt 送信するプロンプト文字列。
 * @returns 成功または失敗を示すLLMResultオブジェクト。
 */
export async function callGeminiApi(apiKey: string, prompt: string): Promise<LLMResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // AIがMarkdown形式で応答を返す場合があるため、JSON部分のみを抽出する
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      // マッチした場合、JSON部分（キャプチャグループの1番目）をtextに再代入
      text = match[1];
    }

    // 修正: レスポンスをパースし、LLMSuccessResponseとして扱います
    const parsedResponse: LLMSuccessResponse = JSON.parse(text);

    // 憲法の要件ですが、念のためクライアントサイドでもソートを実行し、堅牢性を高めます。
    if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
        parsedResponse.suggestions.sort((a, b) => b.confidence - a.confidence);
    } else {
        // suggestionsがない、または配列でない場合はパースエラーと見なします
        throw new Error("Invalid response format: 'suggestions' property is missing or not an array.");
    }

    // 修正: 憲法に従い、成功オブジェクトを返します
    return { success: true, data: parsedResponse };
  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);

    // 修正: 憲法に従い、エラーの種類を判別して失敗オブジェクトを返します
    let errorType: LLMErrorType = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred while getting suggestions.';

    if (error instanceof SyntaxError) {
      errorType = 'PARSING_ERROR';
      message = 'Failed to parse the response from the AI. The format was invalid.';
    } else if (error instanceof Error) {
      // APIからのエラーやネットワークエラーなどを包括的に扱います
      errorType = 'API_ERROR';
      message = `An error occurred while communicating with the AI: ${error.message}`;
    }

    const errorResponse: LLMErrorResponse = { type: errorType, message };
    return { success: false, error: errorResponse };
  }
}