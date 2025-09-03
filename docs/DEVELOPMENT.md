# KETNAME: APIM経由のマネージド推論 切替実装方針

このドキュメントは、既存の **Gemini 実装**をコンテキストに保持したまま、**Azure AI Foundry（Serverless API）+ API Management(APIM)** を**既定のプロバイダ**として組み込むための実装方針です。コーディングエージェントがそのまま着手できるよう、**具体ファイル/責務/受け入れ基準**まで落とし込みます。

---

## 目的

* 既存の `generatePrompt()`／結果パース（\`\`\`json 抜き出し→`LLMSuccessResponse`）は**変更せず**に再利用。
* 呼び出し先を設定で **apim / gemini** 切替可能にする（**デフォルト＝apim**）。
* **APIM サブスクリプションキー**は VS Code **SecretStorage**に保存（平文で設定ファイルに残さない）。
* 依存関係最小（**HTTPは `undici` の fetch**、ストリーミング不要）。
* エラーを既存の `LLMResult` へ正しくマッピング（`API_ERROR` / `PARSING_ERROR` / `UNKNOWN_ERROR`）。

---

## 全体構成（概要）
As-Is
src
├── command_handler.ts
├── config_manager.ts
├── context_provider.ts
├── extension.ts
├── interfaces
│   └── llm_response.interface.ts
├── llm_service.ts
└── ui_provider.ts

To-BE
```
src/
├─ commands/
│   └─ apimKey.ts              # APIMキーの設定/削除コマンド（SecretStorage）
├─ llm/
│   ├─ interfaces/llm_response.interface.ts  # 既存：LLMResult 型群
│   ├─ providers/
│   │   ├─ types.ts            # ChatMessage/LLMProvider インターフェース
│   │   └─ azureApimProvider.ts# APIM 実装（/llm/chat に POST）
│   ├─ callApim.ts             # 既存フロー互換の呼出ラッパ（JSON抽出/パース込み）
│   └─ callGemini.ts           # 既存：Gemini 呼出（現状維持）
├─ generatePrompt.ts           # 既存：プロンプト生成
└─ extension.ts                # コマンド登録（APIMキー設定など）
```

**外部API流れ**：
VSCode拡張 → **APIM**（`Ocp-Apim-Subscription-Key`）→ **Foundry**（APIM Inboundで `api-key` 付与、URIを `/chat/completions` に書換）

---

## 仕様（最重要ポイント）

### 1) 設定スキーマ（`package.json`）

* `ketname.provider`: `"apim"` / `"gemini"`（**既定 `"apim"`**）
* `ketname.apim.baseUrl`: 例 `https://apim-ketname.azure-api.net/llm`
* `ketname.apim.model`: 例 `Phi-4-mini-reasoning`（**Foundry のデプロイ名と一致**）
* `ketname.apim.maxTokens`: 既定 `512`
* `ketname.apim.temperature`: 既定 `0.2`

### 2) シークレット管理

* コマンド：`KETNAME: APIMキーを設定` / `…削除`
* SecretStorage キー名：`ketname.apim.subscriptionKey`
* 実行時に SecretStorage から取り出し、HTTP ヘッダ `Ocp-Apim-Subscription-Key` に付与。

### 3) リクエスト/レスポンス形

* **POST** `${baseUrl}/chat`
* **Body（OpenAI互換）**：

  ```json
  {
    "model": "Phi-4-mini-reasoning",
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ],
    "temperature": 0.2,
    "max_tokens": 512
  }
  ```
* **期待レス**：`choices[0].message.content`（文字列）。
  既存と同様、**`json … ` 抜き出し → `LLMSuccessResponse` に `JSON.parse` → `suggestions` を自信度降順にソート**。

### 4) エラーハンドリング

* HTTP 非 2xx → `API_ERROR`
* JSON パース失敗 → `PARSING_ERROR`
* それ以外 → `UNKNOWN_ERROR`
* 表示メッセージは **既存 UI と同等**に（ユーザーが原因を判断できる最小情報）。

### 5) タイムアウト/リトライ

* `undici` + `AbortController` で **デフォルト 30s タイムアウト**。
* リトライは **行わない**（APIM 側のレート制限/ログで把握しやすくするため）。

---

## 実装タスク（コーディング順）

1. **依存追加**

   * `npm i undici`

2. **設定スキーマ追加（`package.json`）**

   * contributes.configuration（前述キー群）
   * contributes.commands：
     `ketname.setApimKey`, `ketname.removeApimKey`

3. **SecretStorage コマンド実装（`src/commands/apimKey.ts`）**

   * `setApimKeyCmd`：入力ボックス → SecretStorage 保存
   * `removeApimKeyCmd`：SecretStorage 削除
   * `getApimKey`：呼び出し側から取得用

4. **Provider 抽象化（`src/llm/providers/types.ts`）**

   * `ChatMessage`
   * `LLMProvider.chat(messages, params?) => Promise<string>`

5. **APIM 実装（`src/llm/providers/azureApimProvider.ts`）**

   * `AzureApimProvider`：`fetch` で `${baseUrl}/chat` に POST
   * ヘッダ `Ocp-Apim-Subscription-Key` / `Content-Type: application/json`
   * `choices[0].message.content` を返却

6. **呼出ラッパ（`src/llm/callApim.ts`）**

   * 設定値を読み取り（`ketname.provider` が `apim` でなければエラー返却）
   * SecretStorage からキー取得（無い場合は案内メッセージ）
   * `generatePrompt()` を用い、`AzureApimProvider.chat()` 実行
   * 返却文字列から \`\`\`json 抜き出し → `JSON.parse` → 型検証 → ソート → `LLMResult` を返す

7. **既存コマンドの呼び替え**

   * 既存の Gemini 呼出箇所を **`callApimForSuggestions(context, prompt)`** に差し替え
   * ※ 設定 `ketname.provider` が `"gemini"` の場合は既存 `callGeminiApi()` で動作させる**二択**実装でもOK
     （`ProviderFactory` で分岐しても良い）

8. **ログ最小化**

   * `console.error` は **スタック + ステータス**程度（プロンプト全文やPIIはログしない）

9. **README 追記**

   * APIM キー設定コマンドの説明
   * 設定項目（baseUrl/model など）の説明
   * トラブルシューティング（403/400/404 の定石）

---

## 疎通・受け入れ基準（Acceptance Criteria）

* 設定が `apim` のとき、**コマンド実行で候補一覧が QuickPick に表示**される。
* 候補は **`LLMSuccessResponse.suggestions`** に沿って整形表示（名前／理由／自信度）。
* 選択すると、既存と同様に **`KV`/`KM` プレースホルダ置換**が行われる。
* **キー未設定**の場合、**ガイダンスを表示**して処理を中断する。
* **HTTPエラー**は `API_ERROR`、**パース失敗**は `PARSING_ERROR` で返却され、ユーザーへ通知。
* **Gemini**へ切替（`ketname.provider = "gemini"`）時は**従来通り**動作する（リグレッションなし）。

---

## 既知の落とし穴（実装で防止）

* **モデル名**：Foundry の“**Deployment name**”（例 `Phi-4-mini-reasoning`）と一致させる。カタログ名ではない。
* **APIM ルーティング**：APIM 側 Inbound が `/chat/completions` へ **rewrite** されていること（`/models` は **backend URL** 側に含める設計）。
* **`api-version`**：APIM でクエリに強制付与（`2024-05-01-preview` 等）。
* **403**：APIM で `api-key` を Named value から付与する設定ミスに注意。IP制限が早すぎてもNG。
* **JSON抜き出し**：モデルがコードブロック付きで返す想定に対応（\`\`\`json 抜き出し → フォールバックは生文字列 `JSON.parse`）。

---

## セキュリティ/運用

* **キーは SecretStorage のみ**。問題解析時も**キー値をログ出力しない**。
* **プロンプト内容や選択コード**はログしない（要約したメトリクスのみ必要なら後日）。
* **APIM 側**：`rate-limit`、`ip-filter` は Inbound に設定済みであることが前提。
* 将来的に **Entra ID 認証**や **Private Link**へ段階的に移行可能（拡張側は変更なし）。

---

## 変更差分（要点）

* 新規：`commands/apimKey.ts`, `llm/providers/types.ts`, `llm/providers/azureApimProvider.ts`, `llm/callApim.ts`
* 変更：`package.json`（contributes.commands + contributes.configuration）、`extension.ts`（コマンド登録）、既存コマンドの呼び先差替え
* 依存：`undici` 追加

---

## 実装メモ（スニペット）

**APIM プロバイダ（要点のみ）**

```ts
import { fetch } from 'undici';
export class AzureApimProvider {
  constructor(private opts: { baseUrl: string; subscriptionKey: string; model: string; defaultTemperature?: number; defaultMaxTokens?: number; }) {}
  async chat(messages: {role:'system'|'user'|'assistant';content:string}[], p?: {temperature?:number;maxTokens?:number}) {
    const res = await fetch(`${this.opts.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.opts.subscriptionKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.opts.model,
        messages,
        temperature: p?.temperature ?? this.opts.defaultTemperature ?? 0.2,
        max_tokens: p?.maxTokens ?? this.opts.defaultMaxTokens ?? 512
      })
    });
    if (!res.ok) throw new Error(`APIM ${res.status}: ${await res.text().catch(()=> '')}`);
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in upstream response.');
    return content;
  }
}
```

**JSON 抜き出し**

````ts
let text = content;
const m = text.match(/```json\s*([\s\S]*?)\s*```/);
if (m) text = m[1];
const parsed = JSON.parse(text);
````

---

## ロールバック方針

* `ketname.provider = "gemini"` に戻すだけで、既存の Gemini 実装に即時切替。
* コード差分は**追加中心**で、既存を壊さない構成。

---

## 今後の拡張（任意）

* **ProviderFactory** で `apim` / `gemini` / `local-ollama` 等の差替えを一元化。
* **プロンプト最適化**：会話要約によるトークン抑制、`max_tokens` の自動調整。
* **テレメトリ**：成功/失敗、レイテンシ、出力量などを匿名集計（ユーザー同意のもと）。
* **スロットリング**：APIM 429 を UX 良く扱う（指数バックオフ or 再試行ガイダンス）。

