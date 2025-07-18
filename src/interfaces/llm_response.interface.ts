// src/interfaces/llm_response.interface.ts

export interface LLMResponse {
  suggestions: {
    name: string;        // 提案された名前
    reason: string;      // その名前を選定した理由
    confidence: number;  // 0.0から1.0の範囲の自信度
  }[];
}
