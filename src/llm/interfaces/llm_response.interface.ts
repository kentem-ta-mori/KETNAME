// src/interfaces/llm_response.interface.ts

export interface LLMSuccessResponse {
  suggestions: {
    name: string;        // 提案された名前
    reason: string;      // その名前を選定した理由
    confidence: number;  // 0.0から1.0の範囲の自信度
  }[];
}

export type LLMErrorType = 'API_ERROR' | 'PARSING_ERROR' | 'UNKNOWN_ERROR';

export interface LLMErrorResponse {
  type: LLMErrorType;
  message: string;
}

export type LLMResult = { success: true; data: LLMSuccessResponse } | { success: false; error: LLMErrorResponse };