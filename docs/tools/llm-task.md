---
summary: "仅使用 JSON 的 LLM 任务，用于工作流（可选插件工具）"
read_when:
  - 你想在工作流中使用仅 JSON 的 LLM 步骤
  - 你需要用于自动化的经 schema 验证的 LLM 输出
title: "LLM 任务"
---

`llm-task` 是一个**可选的插件工具**，它会运行一个仅 JSON 的 LLM 任务，并
返回结构化输出（可选地根据 JSON Schema 进行验证）。

这非常适合像 Lobster 这样的工作流引擎：你可以添加单个 LLM 步骤，而无需为每个工作流编写自定义 OpenClaw 代码。

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

2. 将工具加入白名单（它以 `optional: true` 注册）：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

## 配置（可选）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是一个 `provider/model` 字符串的白名单。如果设置，则请求中任何不在列表里的模型都会被拒绝。

## 工具参数

- `prompt`（字符串，必填）
- `input`（任意类型，可选）
- `schema`（对象，可选的 JSON Schema）
- `provider`（字符串，可选）
- `model`（字符串，可选）
- `thinking`（字符串，可选）
- `authProfileId`（字符串，可选）
- `temperature`（数字，可选）
- `maxTokens`（数字，可选）
- `timeoutMs`（数字，可选）

`thinking` 支持标准的 OpenClaw 推理预设，例如 `low` 或 `medium`。

## 输出

返回包含解析后的 JSON 的 `details.json` 文件（如果提供 `schema`，则会进行验证）。

## 示例：Lobster 工作流程步骤

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "给定输入邮件，返回意图和草稿。",
  "thinking": "low",
  "input": {
    "subject": "你好",
    "body": "你能帮忙吗？"
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

## 安全注意事项

- 该工具是**仅 JSON**的，并会指示模型仅输出 JSON（不包含
  代码块，不包含评论）。
- 本次运行不会向模型暴露任何工具。
- 在未使用 `schema` 验证之前，应将输出视为不可信。
- 在任何会产生副作用的步骤（发送、发布、执行）之前加入审批。

## 相关内容

- [Thinking levels](/tools/thinking)
- [Sub-agents](/tools/subagents)
- [Slash commands](/tools/slash-commands)
