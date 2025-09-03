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