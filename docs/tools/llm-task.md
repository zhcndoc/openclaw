---
summary: "用于工作流的仅 JSON LLM 任务（可选插件工具）"
read_when:
  - 你想在工作流中使用一个仅输出 JSON 的 LLM 步骤
  - 你需要经过 schema 验证的 LLM 输出用于自动化
title: "LLM 任务"
---

`llm-task` 是一个捆绑的 **可选插件工具**，它会执行一次仅输出 JSON 的
LLM 调用，并返回结构化输出，可选择按 JSON
Schema 进行验证。它为像 Lobster 这样的工作流引擎提供一个 LLM 步骤，而无需为每个工作流编写自定义的 OpenClaw 代码。

## 启用

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

## 配置（可选）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "llm": {
          "allowModelOverride": true,
          "allowedCompletionModels": ["openai/gpt-5.6-sol"],
          "allowAuthProfileOverride": true
        },
        "config": {
          "defaultProvider": "openai",
          "defaultModel": "gpt-5.6-sol",
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

对于由旧版本创建的 llm-task 条目，请运行一次 `openclaw doctor --fix`。Doctor 会授予随附的模型/配置文件选择权限，并将任何旧版 `config.allowedModels` 值迁移到 `llm.allowedCompletionModels`，且不会扩大其范围。

## 工具参数

| 参数            | 类型   | 说明                                                                                                                                            |
| --------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`        | string | 必需。传给 LLM 的任务指令。                                                                                                                      |
| `input`         | any    | 可选载荷；会序列化为 JSON 并附加到 prompt。                                                                                                      |
| `schema`        | object | 可选 JSON Schema，解析后的输出必须符合它。                                                                                                       |
| `provider`      | string | 覆盖 `defaultProvider` / 代理的默认提供方。                                                                                                      |
| `model`         | string | 覆盖 `defaultModel`；可接受裸模型 ID、别名，或 `provider/model` 引用（重复的 provider 前缀会自动去除）。                                           |
| `thinking`      | string | 推理级别（例如 `low`、`medium`）；必须是所解析模型支持的级别之一。                                                                                 |
| `authProfileId`  | string | 覆盖 `defaultAuthProfileId`。                                                                                                                     |
| `temperature`    | number | 尽力而为；并非所有提供方都支持。                                                                                                                   |
| `maxTokens`      | number | 输出 token 的尽力而为上限。                                                                                                                       |
| `timeoutMs`      | number | 运行超时时间；默认 `30000`。                                                                                                                       |

## 输出

返回 `details.json`（解析并经过 schema 验证的 JSON）以及 `details.provider`
和 `details.model`，用于标明实际运行的内容。

每次调用都会启动一个全新的、仅基于提示词的推理操作。它不会复用调用方代理的对话记录或原生运行时会话，不会运行代理生命周期钩子，也不会将模型输出传递到某个通道。OpenClaw 会严格使用所选的提供商、模型、身份验证配置和运行时一次；当该所有者无法提供字面意义上的零工具调用时，不会回退到其他路径。

所选代理工具框架必须实现隔离式补全。否则，调用会在推理前失败，并返回 `does not support isolated completion` 错误。这种失败即关闭的行为可防止 JSON 任务无提示地变成普通的、具备工具调用能力的代理轮次。

CLI 运行时必须提供等效的隔离准备保证。内置的 Claude 和 Gemini CLI 运行时支持此功能；尚未采用此内部契约的其他 CLI 运行时会在其进程启动前失败。

Gemini CLI 的隔离式补全支持 Gemini API 密钥和 Vertex 身份验证。Google OAuth 和 compute/Code Assist 身份验证会被拒绝，因为托管账户策略可能会在加载本地 CLI 设置后添加管理员要求的工具。包含原生 `@path` 引用或以 `/command` 开头的 Gemini 提示词也会在推理前失败，因为 Gemini CLI 没有字面意义上的原始输入模式。

## 示例：Lobster 工作流步骤

### 重要限制

以下示例假设正在运行**独立的 Lobster CLI**，并且
`openclaw.invoke` 已经具有正确的网关 URL/身份验证上下文。

对于 OpenClaw 内置的 **嵌入式** Lobster 运行器，这种嵌套 CLI
模式目前**并不可靠**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

在嵌入式 Lobster 为此流程提供受支持的桥接之前，建议采用以下任一方式：

- 在 Lobster 外部直接调用 `llm-task` 工具，或
- 使用不依赖嵌套 `openclaw.invoke` 调用的 Lobster 步骤。

独立 Lobster CLI 示例：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Based on the input email, return the intent and a draft.",
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

## 安全说明

- **仅限 JSON**：指示模型仅返回 JSON 值，不得包含代码
  围栏或评论。
- **无工具**：所选运行时必须提供一个字面意义上的空模型可调用
  工具接口。OpenClaw 会拒绝工具形式的结果，而不是将其视为
  任务输出。
- **隔离运行**：运行过程中没有代理记录、会话复用、生命周期钩子、
  频道投递或提供商回退。
- 除非使用 `schema` 对输出进行验证，否则应将其视为不受信任。
- 在任何使用该输出并会产生副作用的步骤（发送、发布、执行）之前，
  先进行审批。

## 相关内容

- [思考层级](/tools/thinking)
- [子代理](/tools/subagents)
- [斜杠命令](/tools/slash-commands)
