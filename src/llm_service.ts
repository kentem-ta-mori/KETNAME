// src/llm_service.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMResponse } from './interfaces/llm_response.interface';

/**
 * LLMに送信するプロンプトを組み立てます。
 * @param codeContext ユーザーが選択したコードのコンテキスト。
 * @param domainKnowledge ドメイン知識の文字列。
 * @returns 組み立てられたプロンプト文字列。
 */
export function generatePrompt(codeContext: string, domainKnowledge: string): string {
  return `You are an AI assistant that helps developers name variables and methods.
Your goal is to suggest high-quality names based on the provided Japanese comments and project-specific domain knowledge.

Here is the code context:
```
${codeContext}
```

Here is the project-specific domain knowledge:
```
${domainKnowledge}
```

Based on the above context and domain knowledge, please suggest 3 variable/method names that are concise, descriptive, and idiomatic for the given code. Provide a reason for each suggestion and a confidence score between 0.0 and 1.0.

Your response must be a JSON string strictly adhering to the following TypeScript interface:

interface LLMResponse {
  suggestions: {
    name: string;        // Suggested name
    reason: string;      // Reason for the suggestion
    confidence: number;  // Confidence score from 0.0 to 1.0
  }[];
}

The suggestions array must be sorted in descending order of confidence.

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
 * Gemini APIにプロンプトを送信し、結果のJSON文字列を受け取ります。
 * @param apiKey Gemini APIキー。
 * @param prompt 送信するプロンプト文字列。
 * @returns LLMResponseインターフェースに準拠した結果オブジェクト。
 * @throws API通信エラーやレスポンスのパースエラーが発生した場合。
 */
export async function callGeminiApi(apiKey: string, prompt: string): Promise<LLMResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // LLMResponseインターフェースに厳密に準拠しているか検証
    const parsedResponse: LLMResponse = JSON.parse(text);

    // suggestions配列がconfidenceの高い順にソートされているか検証
    parsedResponse.suggestions.sort((a, b) => b.confidence - a.confidence);

    return parsedResponse;
  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    throw new Error(`Failed to get naming suggestions from AI: ${error instanceof Error ? error.message : String(error)}`);
  }
}
