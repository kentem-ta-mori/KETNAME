export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMProvider {
    chat(messages: ChatMessage[], params?: { [key: string]: any }): Promise<string>;
}
