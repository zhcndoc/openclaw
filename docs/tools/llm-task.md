---
summary: "仅使用 JSON 的 LLM 任务，用于工作流（可选插件工具）"
read_when:
  - 你想在工作流中使用仅支持 JSON 的 LLM 步骤
  - 你需要符合 schema 验证的 LLM 输出以实现自动化
title: "LLM 任务"
---

# LLM 任务

`llm-task` 是一个**可选插件工具**，它运行仅返回 JSON 的 LLM 任务并返回结构化输出（可选择基于 JSON Schema 验证）。

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
          "defaultModel": "gpt-5.4",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.4"],
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
- `authProfileId`（字符串，可选）
- `temperature`（数字，可选）
- `maxTokens`（数字，可选）
- `timeoutMs`（数字，可选）

## 输出

返回包含解析后的 JSON 的 `details.json` 文件（如果提供 `schema`，则会进行验证）。

## 示例：Lobster 工作流程步骤

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
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

## 安全注意事项

- 该工具**仅支持 JSON**，会指示模型仅输出 JSON（无代码块，无评论）。
- 本次运行不会向模型暴露任何工具。
- 除非通过 `schema` 验证，否则请将输出视为不可信。
- 在执行任何有副作用的步骤（发送、发布、执行）之前，请设置审批。
