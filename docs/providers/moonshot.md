---
summary: "配置 Moonshot K2 与 Kimi Coding（独立提供商 + 密钥）"
read_when:
  - 你想设置 Moonshot K2（Moonshot 开放平台）与 Kimi Coding
  - 你需要了解独立的端点、密钥和模型引用
  - 你想要复制粘贴任一提供商的配置
title: "Moonshot AI"
---

# Moonshot AI（Kimi）

Moonshot 提供兼容 OpenAI 接口的 Kimi API。配置提供商并将默认模型设置为 `moonshot/kimi-k2.5`，或者使用 Kimi Coding 的 `kimi-coding/k2p5`。

当前 Kimi K2 模型 ID：

<!-- markdownlint-disable MD037 -->

{/_ moonshot-kimi-k2-ids:start _/ && null}

<!-- markdownlint-enable MD037 -->

- `kimi-k2.5`
- `kimi-k2-0905-preview`
- `kimi-k2-turbo-preview`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
  <!-- markdownlint-disable MD037 -->
  {/_ moonshot-kimi-k2-ids:end _/ && null}
  <!-- markdownlint-enable MD037 -->

```bash
openclaw onboard --auth-choice moonshot-api-key
```

Kimi Coding：

```bash
openclaw onboard --auth-choice kimi-code-api-key
```

注意：Moonshot 和 Kimi Coding 是独立的提供商。密钥不通用，端点不同，模型引用也不同（Moonshot 使用 `moonshot/...`，Kimi Coding 使用 `kimi-coding/...`）。

## 配置代码片段（Moonshot API）

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: {
        // moonshot-kimi-k2-aliases:start
        "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
        "moonshot/kimi-k2-0905-preview": { alias: "Kimi K2" },
        "moonshot/kimi-k2-turbo-preview": { alias: "Kimi K2 Turbo" },
        "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
        "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
        // moonshot-kimi-k2-aliases:end
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          // moonshot-kimi-k2-models:start
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-0905-preview",
            name: "Kimi K2 0905 预览",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-turbo-preview",
            name: "Kimi K2 Turbo",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-thinking",
            name: "Kimi K2 Thinking",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-thinking-turbo",
            name: "Kimi K2 Thinking Turbo",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          // moonshot-kimi-k2-models:end
        ],
      },
    },
  },
}
```

## Kimi Coding

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-coding/k2p5" },
      models: {
        "kimi-coding/k2p5": { alias: "Kimi K2.5" },
      },
    },
  },
}
```

## 注意事项

- Moonshot 的模型引用使用 `moonshot/<modelId>`。Kimi Coding 的模型引用使用 `kimi-coding/<modelId>`。
- 如有需要，可在 `models.providers` 中覆盖定价和上下文元数据。
- 如果 Moonshot 发布了不同的模型上下文限制，请相应调整 `contextWindow`。
- 国际端点使用 `https://api.moonshot.ai/v1`，中国端点使用 `https://api.moonshot.cn/v1`。

## 原生思考模式（Moonshot）

Moonshot Kimi 支持二进制原生思考：

- `thinking: { type: "enabled" }`
- `thinking: { type: "disabled" }`

通过 `agents.defaults.models.<provider/model>.params` 为每个模型单独配置：

```json5
{
  agents: {
    defaults: {
      models: {
        "moonshot/kimi-k2.5": {
          params: {
            thinking: { type: "disabled" },
          },
        },
      },
    },
  },
}
```

OpenClaw 还为 Moonshot 映射了运行时的 `/think` 级别：

- `/think off` -> `thinking.type=disabled`
- 任何非关闭的思考级别 -> `thinking.type=enabled`

当 Moonshot 思考模式启用时，`tool_choice` 必须设置为 `auto` 或 `none`。OpenClaw 会将不兼容的 `tool_choice` 值标准化为 `auto` 以保证兼容性。
