import { fetch } from 'undici';
import { LLMProvider, ChatMessage } from './types';

export class AzureApimProvider implements LLMProvider {
    constructor(private opts: {
        baseUrl: string;
        subscriptionKey: string;
        model: string;
        defaultTemperature?: number;
        defaultMaxTokens?: number;
    }) { }

    async chat(messages: ChatMessage[], params?: { temperature?: number; maxTokens?: number }): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const res = await fetch(`${this.opts.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.opts.subscriptionKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.opts.model,
                    messages,
                    temperature: params?.temperature ?? this.opts.defaultTemperature ?? 0.2,
                    max_tokens: params?.maxTokens ?? this.opts.defaultMaxTokens ?? 512
                }),
                signal: controller.signal
            });

            if (!res.ok) {
                const errorText = await res.text().catch(() => '');
                throw new Error(`APIM request failed with status ${res.status}: ${errorText}`);
            }

            const json: any = await res.json();
            const content = json?.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('No content in upstream response or unexpected response format.');
            }

            return content;
        } finally {
            clearTimeout(timeout);
        }
    }
}
