---
summary: "子代理看到了多少对话，它对返回记忆的渴望程度如何，以及它的模型是如何解决的。"
read_when:
  - "您正在针对延迟调整召回质量"
  - "您需要专用的快速召回模型"
title: "查询模式、提示和模型"
---

## <a id="query-modes"></a> 查询模式

`config.queryMode` 控制阻塞子代理能看到多少对话内容。请选择仍能很好回答后续问题的最小模式；随着上下文大小增加，相应增大 `timeoutMs`，从 `message` 到 `recent` 再到 `full`。

<Tabs>
  <Tab id="message" title="信息">
    只发送最新的用户消息。

    ```text
    Latest user message only
    ```

    当您想要最快的行为、对稳定偏好回忆的最强偏见以及后续轮流不需要对话上下文时使用。对于 `config.timeoutMs`，在 `3000`-`5000` 毫秒左右开始。

  </Tab>

  <Tab id="recent" title="最近的">
    最新的用户消息加上一小段最近的对话尾部。

    ```text
    Recent conversation tail:
    user: ...
    assistant: ...
    user: ...

    Latest user message:
    ...
    ```

    适用于在速度和对话依据之间取得平衡的场景，尤其是后续问题经常依赖最近几轮对话时。建议从大约 `15000` 毫秒开始。

  </Tab>

  <Tab id="full" title="满的">
    将完整对话发送给阻塞子代理。

    ```text
    Full conversation context:
    user: ...
    assistant: ...
    user: ...
    ...
    ```

    当回忆质量比延迟更重要，或者重要的设置内容在对话较早位置时使用。根据线程大小，建议从 `15000` 毫秒或更高开始。

  </Tab>
</Tabs>

## <a id="prompt-styles"></a> 提示词样式

`config.promptStyle` 控制子代理在返回记忆时的积极程度或严格程度。

| 样式             | 行为                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| `balanced`        | `recent` 模式下的通用默认值                                  |
| `strict`          | 最不积极；与附近上下文的轻微混淆最少                             |
| `contextual`      | 最注重连续性；对话历史更重要                |
| `recall-heavy`    | 在较弱但仍合理的匹配下也会展示记忆                      |
| `precision-heavy` | 除非匹配非常明显，否则强烈偏向 `NONE`                    |
| `preference-only` | 针对偏好、习惯、例行事项、口味、重复出现的个人事实进行优化 |

当未设置 `config.promptStyle` 时的默认映射：

```text
message -> strict
recent -> balanced
full -> contextual
```

显式设置的 `config.promptStyle` 始终会覆盖该映射。

## <a id="model-fallback-policy"></a> 模型回退策略

如果 `config.model` 未设置，active memory 会按以下顺序解析模型：

```text
explicit plugin model (config.model)
-> current session model
-> agent primary model
-> optional configured fallback model (config.modelFallback)
```

```json5
modelFallback: "google/gemini-3-flash"
```

如果该链中没有解决任何问题，则主动记忆会跳过该回合的调用。 `config.modelFallbackPolicy` 是为旧配置保留的兼容性字段，在 v2026.4.12 中已弃用；它不再改变运行时行为 - `modelFallback` 严格来说是上述链中的最后手段，而不是在解决一个错误时交换到另一个模型的运行时故障转移。

### <a id="speed-recommendations"></a> 速度建议

保留 `config.model` 未设置（继承会话模型）是最稳妥的默认方式：它会沿用你现有的提供商、认证和模型偏好。若想降低延迟，建议改用专门的快速模型——recall 的质量很重要，但在这里延迟更重要，因为主回答路径之外的工具面很窄（只有 memory recall 工具）。

推荐的快速模型选项：

- `cerebras/gpt-oss-120b`，专用于低延迟 recall 的模型
- `google/gemini-3-flash`，在不更改主聊天模型的情况下提供低延迟回退
- 通过保留 `config.model` 未设置，继续使用你的常规会话模型

#### <a id="cerebras-setup"></a> Cerebras 配置

```json5
{
  models: {
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [{ id: "gpt-oss-120b", name: "GPT OSS 120B (Cerebras)" }],
      },
    },
  },
  plugins: {
    entries: {
      "active-memory": {
        enabled: true,
        config: { model: "cerebras/gpt-oss-120b" },
      },
    },
  },
}
```

请确认 Cerebras API key 对所选模型拥有 `chat/completions` 访问权限——仅能看到 `/v1/models` 并不能保证这一点。
