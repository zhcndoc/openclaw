---
summary: "用于工作流的仅 JSON LLM 任务（可选插件工具）"
read_when:
  - 你想在工作流中使用一个仅输出 JSON 的 LLM 步骤
  - 你需要经过 schema 验证的 LLM 输出用于自动化
title: "LLM 任务"
---

`llm-task` 是一个 **可选的插件工具**，它会运行一个仅输出 JSON 的 LLM 任务，并返回结构化输出（可选地根据 JSON Schema 进行验证）。

这非常适合像 Lobster 这样的工作流引擎：你可以添加一个单独的 LLM 步骤，而无需为每个工作流编写自定义的 OpenClaw 代码。

## 启用插件

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

2. 允许可选工具：

```json
{
  "tools": {
    "alsoAllow": ["llm-task"]
  }
}
```

仅当你想要限制性允许列表模式时，才使用 `tools.allow`。

## 配置（可选）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai",
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.5"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是 `provider/model` 字符串的允许列表。如果设置了它，任何超出该列表的请求都会被拒绝。

## 工具参数

- `prompt`（string，必需）
- `input`（any，可选）
- `schema`（object，可选 JSON Schema）
- `provider`（string，可选）
- `model`（string，可选）
- `thinking`（string，可选）
- `authProfileId`（string，可选）
- `temperature`（number，可选）
- `maxTokens`（number，可选）
- `timeoutMs`（number，可选）

`thinking` 接受标准的 OpenClaw 推理预设，例如 `low` 或 `medium`。

## 输出

返回包含解析后 JSON 的 `details.json`（并在提供 `schema` 时进行验证）。

## 示例：Lobster 工作流步骤

### 重要限制

下面的示例假设 **独立运行的 Lobster CLI** 正在一个环境中运行，在该环境中 `openclaw.invoke` 已经具有正确的网关 URL/身份验证上下文。

对于 OpenClaw 中捆绑的 **嵌入式** Lobster 运行器来说，这种嵌套 CLI 模式 **目前并不可靠**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

在嵌入式 Lobster 还没有为此流程提供受支持的桥接之前，请优先选择以下任一方式：

- 在 Lobster 之外直接调用 `llm-task` 工具，或
- 不依赖嵌套 `openclaw.invoke` 调用的 Lobster 步骤。

独立运行的 Lobster CLI 示例：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "根据输入的邮件，返回意图和草稿。",
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

- 该工具是 **仅 JSON** 的，并会指示模型只输出 JSON（不使用
  代码块，不包含评论）。
- 此次运行不会向模型暴露任何工具。
- 除非你使用 `schema` 进行验证，否则应将输出视为不可信。
- 在任何会产生副作用的步骤（发送、发布、执行）之前先进行审批。

## 相关内容

- [Thinking levels](/tools/thinking)
- [Sub-agents](/tools/subagents)
- [Slash commands](/tools/slash-commands)
