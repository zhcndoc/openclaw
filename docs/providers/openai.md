---
summary: "在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - 你想在 OpenClaw 中使用 OpenAI 模型
  - 你想用 Codex 订阅认证代替 API 密钥
title: "OpenAI"
---

# OpenAI

OpenAI 提供了 GPT 模型的开发者 API。Codex 支持 **ChatGPT 登录** 以获取订阅访问或 **API 密钥** 登录以按使用量计费。Codex 云端需要 ChatGPT 登录。OpenAI 明确支持在外部工具/工作流（如 OpenClaw）中使用订阅 OAuth。

## 选项 A：OpenAI API 密钥（OpenAI 平台）

**适用场景：** 直接使用 API 并按使用量计费。  
从 OpenAI 控制台获取你的 API 密钥。

### CLI 配置

```bash
openclaw onboard --auth-choice openai-api-key
# 或非交互式
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### 配置示例

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

OpenAI 当前 API 模型文档中列出了用于直接调用 OpenAI API 的 `gpt-5.4` 和 `gpt-5.4-pro` 模型。OpenClaw 会通过 `openai/*` Responses 路径转发这两个模型。OpenClaw 有意屏蔽了过时的 `openai/gpt-5.3-codex-spark` 这一行，因为在实际流量中，直接调用 OpenAI API 会拒绝该模型。

OpenClaw **不** 在直接 OpenAI API 路径上暴露 `openai/gpt-5.3-codex-spark`。`pi-ai` 仍然内置了该模型行，但当前的实时 OpenAI API 请求会拒绝它。Spark 在 OpenClaw 中被视为仅限 Codex 使用。

## 选项 B：OpenAI Code (Codex) 订阅

**适用场景：** 使用 ChatGPT/Codex 订阅访问代替 API 密钥。  
Codex 云端需要 ChatGPT 登录，Codex CLI 支持 ChatGPT 或 API 密钥登录。

### CLI 配置（Codex OAuth）

```bash
# 在向导中运行 Codex OAuth
openclaw onboard --auth-choice openai-codex

# 或直接运行 OAuth
openclaw models auth login --provider openai-codex
```

### 配置示例（Codex 订阅）

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

OpenAI 当前 Codex 文档中列出的当前 Codex 模型为 `gpt-5.4`。OpenClaw 将其映射为 `openai-codex/gpt-5.4` 用于 ChatGPT/Codex OAuth 访问。

如果您的 Codex 账号有资格使用 Codex Spark，OpenClaw 也支持：

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw 将 Codex Spark 视为仅限 Codex 使用。它不会暴露直接的 `openai/gpt-5.3-codex-spark` API-key 路径。

当 `pi-ai` 发现 `openai-codex/gpt-5.3-codex-spark` 时，OpenClaw 也会保留它。将其视为依赖资格且处于实验阶段：Codex Spark 独立于 GPT-5.4 的 `/fast`，其可用性依赖于已登录的 Codex / ChatGPT 账号。

### 传输默认设置

OpenClaw 使用 `pi-ai` 进行模型流式传输。对于 `openai/*` 和 `openai-codex/*`，默认传输方式为 `"auto"`（优先 WebSocket，失败后降级到 SSE）。

你可以设置 `agents.defaults.models.<provider/model>.params.transport`：

- `"sse"`：强制使用 SSE
- `"websocket"`：强制使用 WebSocket
- `"auto"`：尝试 WebSocket，失败后降级至 SSE

对于 `openai/*`（Responses API），当使用 WebSocket 传输时，OpenClaw 还默认启用 WebSocket 预热 (`openaiWsWarmup: true`)。

相关 OpenAI 文档：

- [实时 API（WebSocket）](https://platform.openai.com/docs/guides/realtime-websocket)
- [流式响应 API（SSE）](https://platform.openai.com/docs/guides/streaming-responses)

```json5
{
  agents: {
    defaults: {
      model: { primary: "openai-codex/gpt-5.4" },
      models: {
        "openai-codex/gpt-5.4": {
          params: {
            transport: "auto",
          },
        },
      },
    },
  },
}
```

### OpenAI WebSocket 预热

OpenAI 文档中描述的预热是可选的。OpenClaw 对 `openai/*` 默认启用此功能，以在使用 WebSocket 传输时降低首次响应延迟。

### 禁用预热

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: false,
          },
        },
      },
    },
  },
}
```

### 显式启用预热

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: true,
          },
        },
      },
    },
  },
}
```

### OpenAI 优先级处理

OpenAI 的 API 支持通过 `service_tier=priority` 来开启优先级处理。在 OpenClaw 中，设置 `agents.defaults.models["openai/<model>"].params.serviceTier` 可在直接使用 `openai/*` Responses 请求时传递该字段。

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

支持的取值包括 `auto`、`default`、`flex` 和 `priority`。

### OpenAI 快速模式

OpenClaw 为 `openai/*` 和 `openai-codex/*` 会话暴露了一个共享的快速模式切换：

- 聊天/UI: `/fast status|on|off`
- 配置: `agents.defaults.models["<provider>/<model>"].params.fastMode`

启用快速模式时，OpenClaw 会应用低延迟的 OpenAI 配置：

- 当请求体未指定推理级别时，设置 `reasoning.effort = "low"`
- 当请求体未指定冗长度时，设置 `text.verbosity = "low"`
- 对于直接调用 `openai/*` Responses 到 `api.openai.com`，设置 `service_tier = "priority"`

示例：

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
        "openai-codex/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
      },
    },
  },
}
```

会话覆盖优先于配置。清除会话 UI 中的会话覆盖后，会话将恢复为配置的默认值。

### OpenAI Responses 服务器端压缩

对于直接的 OpenAI Responses 模型（使用 `api: "openai-responses"` 并且 `baseUrl` 指向 `api.openai.com` 的 `openai/*`），OpenClaw 现在默认启用 OpenAI 服务器端压缩 payload 提示：

- 强制开启 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
- 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`

默认情况下，`compact_threshold` 是模型的 `contextWindow` 的 `70%`（若不可用则为 `80000`）。

### 显式启用服务器端压缩

当你需要强制注入 `context_management`（例如 Azure OpenAI Responses 兼容模型）时使用：

```json5
{
  agents: {
    defaults: {
      models: {
        "azure-openai-responses/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
          },
        },
      },
    },
  },
}
```

### 使用自定义阈值启用

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
            responsesCompactThreshold: 120000,
          },
        },
      },
    },
  },
}
```

### 禁用服务器端压缩

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: false,
          },
        },
      },
    },
  },
}
```

`responsesServerCompaction` 仅控制 `context_management` 注入。直接使用的 OpenAI Responses 模型仍然会强制 `store: true`，除非兼容设置了 `supportsStore: false`。

## 注意事项

- 模型引用始终使用 `provider/model` 格式（参见 [/concepts/models](/concepts/models)）。
- 认证细节及复用规则见 [/concepts/oauth](/concepts/oauth)。
