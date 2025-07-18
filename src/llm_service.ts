import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMResult, LLMSuccessResponse, LLMErrorResponse, LLMErrorType } from './interfaces/llm_response.interface';

/**
 * LLMに送信するプロンプトを組み立てます。
 * @param codeContext ユーザーが選択したコードのコンテキスト。
 * @param userIntent ユーザーが入力した命名の意図（日本語）。
 * @param domainKnowledge ドメイン知識の文字列。
 * @returns 組み立てられたプロンプト文字列。
 */
export function generatePrompt(codeContext: string, userIntent: string, domainKnowledge: string): string {
  return `あなたは開発者が変数名やメソッド名を命名するのを助けるAIアシスタントです。
あなたの目標は、提供された日本語の意図とコードコンテキスト、プロジェクト固有のドメイン知識に基づいて、高品質な名前を提案することです。

以下は、名前を提案してほしい対象のコードコンテキストです。
\`\`\`typescript
${codeContext}
\`\`\`

以下は、プロジェクト固有のドメイン知識です。
\`\`\`
${domainKnowledge}
\`\`\`

以下は、提案してほしい名前の意図を日本語で説明したものです。
\`\`\`
${userIntent}
\`\`\`

上記のコンテキスト、ドメイン知識、そして日本語の意図に基づいて、簡潔で説明的、かつ慣用的な変数名またはメソッド名を3つ提案してください。
提案された各名前について、その選定理由と0.0から1.0の範囲の自信度を記述してください。

あなたの応答は、以下のTypeScriptインターフェースに厳密に準拠したJSON文字列でなければなりません。
'suggestions'配列は、confidence（自信度）の高い順（降順）にソートされている必要があります。

interface LLMSuccessResponse {
  suggestions: {
    name: string;      // 提案された名前
    reason: string;    // その名前を選定した理由
    confidence: number; // 0.0から1.0の範囲の自信度
  }[];
}

例:
{
  "suggestions": [
    {
      "name": "calculateTotalPrice",
      "reason": "ショッピングカート内のアイテムの合計金額を計算します。",
      "confidence": 0.95
    },
    {
      "name": "getTotalPrice",
      "reason": "保存された値から合計金額を取得します。",
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