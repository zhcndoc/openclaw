---
summary: "JSON-only LLM 工作流任务（可选插件工具）"
read_when:
  - "您只需要 JSON- 工作流程中的 LLM 步骤"
  - "你需要经过 schema 验证的 LLM 输出用于自动化"
title: "LLM 任务"
---

`llm-task` 是捆绑的 **可选插件工具**，它运行单个 JSON-only LLM 调用并返回结构化输出，可以选择根据 JSON 模式进行验证。它为 Lobster 等工作流引擎提供了 LLM 步骤，而无需每个工作流自定义 OpenClaw 代码。

## <a id="enable"></a> 启用

1. 启用插件：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. 允许该工具：

```json
{
  "tools": {
    "alsoAllow": ["llm-task"]
  }
}
```

`alsoAllow` 会在当前启用的工具配置基础上添加 `llm-task`，而不会限制其他核心工具。仅当你想使用限制性的允许列表模式时，才使用 `tools.allow`。

## <a id="config-(optional)"></a><a id="config-optional"></a> 配置（可选）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "llm": {
          "allowModelOverride": true,
          "allowedCompletionModels": ["openai/gpt-6-astra"],
          "allowAuthProfileOverride": true
        },
        "config": {
          "defaultProvider": "openai",
          "defaultModel": "gpt-6-astra",
          "defaultAuthProfileId": "main",
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`llm` 块由主机负责授权。`allowedCompletionModels` 会限制每次补全，因此请同时包含解析后的代理默认模型以及任何覆盖目标模型。`allowAuthProfileOverride` 允许使用 `defaultAuthProfileId` 和每次调用时的 `authProfileId` 参数。当工具调用省略相应参数时，`config` 中的键将作为选择默认值。

对于旧版本创建的 llm 任务条目运行一次 `openclaw doctor --fix`。 Doctor 授予附带的 model/profile 选择权限，并将任何旧的 `config.allowedModels` 值移动到 `llm.allowedCompletionModels` 中，而不扩大它。

## <a id="tool-parameters"></a> 工具参数

| 参数       | 类型   | 笔记                                                                                                                                         |
| --------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`        | 字符串 | 必需。传给 LLM 的任务指令。                                                                                                       |
| `input`         | 任意    | 可选载荷；会序列化为 JSON 并附加到 prompt。                                                                              |
| `schema`        | 目的 | 可选 JSON Schema，解析后的输出必须符合它。                                                                                 |
| `provider`      | 字符串 | 覆盖 `defaultProvider` / 代理的默认提供方。                                                                                   |
| `model`         | 字符串 | 覆盖 `defaultModel`；接受裸模型 ID、别名或 `provider/model` 引用（重复的提供程序前缀会自动删除）。 |
| `thinking`      | 字符串 | 推理级别（e.g.、`low`、`medium`）；必须是已解析模型支持的模型。                                                          |
| `authProfileId` | 字符串 | 覆盖 `defaultAuthProfileId`。                                                                                                             |
| `temperature`   | 数字 | 尽力而为；并非所有提供方都支持。                                                                                                      |
| `maxTokens`     | 数字 | 输出 token 的尽力而为上限。                                                                                                             |
| `timeoutMs`     | 数字 | 运行超时时间；默认 `30000`。                                                                                                                 |

## <a id="output"></a> 输出

返回 `details.json`（解析并经过 schema 验证的 JSON）以及 `details.provider` 和 `details.model`，用于标明实际运行的内容。

每次调用都会启动一个新的仅提示推理操作。它不会重用调用代理的脚本或本机运行时会话、运行代理生命周期挂钩或将模型输出传递到通道。 OpenClaw 仅使用一次选定的提供程序、模型、身份验证配置文件和运行时；当该所有者无法提供隔离完成时，它不会回退到另一条路线。

代理 API 默认运行受限会话，没有执行程序或提供的工具，但其服务可能保留内置帮助程序。它不能保证字面上的零工具推理。当您的工作流程需要这种保证时，请使用另一个运行时；拒绝工具承载输出无法消除本机辅助效果。

选定的代理工具必须实现隔离完成。否则，调用会在推理之前失败，并出现 `does not support isolated completion` 错误。拒绝呼叫可防止 JSON 任务默默地成为正常的具有工具功能的代理轮次。

CLI 运行时必须提供等效的隔离准备保证。内置的 Claude 和 Gemini CLI 运行时支持此功能；尚未采用此内部契约的其他 CLI 运行时会在其进程启动前失败。

Gemini CLI 隔离完成支持 Gemini API-key 和 Vertex 身份验证。 Google OAuth 和 compute/Code 辅助身份验证被拒绝，因为托管帐户策略可以在加载本地 CLI 设置后添加管理员所需的工具。包含本机 `@path` 的 Gemini 提示或前导 `/command` 也会在推理之前失败，因为 Gemini CLI 没有文字原始输入模式。

## <a id="example%3A-lobster-workflow-step"></a><a id="example-lobster-workflow-step"></a> 示例：Lobster 工作流步骤

### <a id="important-limitation"></a> 重要限制

以下示例假设 **standalone Lobster CLI** 正在运行，其中 `openclaw.invoke` 已具有正确的网关 URL/auth 上下文。

对于 OpenClaw 内捆绑的 **embedded** Lobster 运行器，此嵌套 CLI 模式是 **目前不可靠的**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

在嵌入式 Lobster 为此流程提供受支持的桥接之前，建议采用以下任一方式：

- 在 Lobster 外部直接调用 `llm-task` 工具，或
- 使用不依赖嵌套 `openclaw.invoke` 调用的 Lobster 步骤。

独立 Lobster CLI 示例：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

## <a id="safety-notes"></a> 安全注意事项

- **JSON-only**：指示模型仅返回 JSON 值，没有代码围栏，没有注释。
- **没有提供的工具**：运行时强制执行文字空模型可调用工具表面，记录的代理API本机帮助程序限制除外。 OpenClaw 拒绝工具形状的结果，而不是将其视为任务输出。
- **隔离运行**：运行过程中没有代理记录、会话复用、生命周期钩子、 频道投递或提供商回退。
- 除非使用 `schema` 对输出进行验证，否则应将其视为不受信任。
- 在任何使用该输出并会产生副作用的步骤（发送、发布、执行）之前， 先进行审批。

## <a id="related"></a> 相关内容

- [思维水平](/tools/thinking)
- [子代理](/tools/subagents)
- [斜杠命令](/tools/slash-commands)
