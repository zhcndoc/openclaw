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

`allowedModels` 是 `provider/model` 字符串的允许列表；对任何其他模型的请求都会被拒绝。所有其他键都是按调用提供的回退值，当工具调用省略该参数时会使用这些值。

## 工具参数

| 参数            | 类型   | 说明                                                                                                                                            |
| --------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`        | string | 必需。传给 LLM 的任务指令。                                                                                                                      |
| `input`          | any    | 可选载荷；会序列化为 JSON 并附加到 prompt。                                                                                                      |
| `schema`         | object | 可选 JSON Schema，解析后的输出必须符合它。                                                                                                       |
| `provider`       | string | 覆盖 `defaultProvider` / 代理的默认提供方。                                                                                                      |
| `model`          | string | 覆盖 `defaultModel`；可接受裸模型 ID、别名，或 `provider/model` 引用（重复的 provider 前缀会自动去除）。                                           |
| `thinking`       | string | 推理级别（例如 `low`、`medium`）；必须是所解析模型支持的级别之一。                                                                                 |
| `authProfileId`  | string | 覆盖 `defaultAuthProfileId`。                                                                                                                     |
| `temperature`    | number | 尽力而为；并非所有提供方都支持。                                                                                                                   |
| `maxTokens`      | number | 输出 token 的尽力而为上限。                                                                                                                       |
| `timeoutMs`      | number | 运行超时时间；默认 `30000`。                                                                                                                       |

## 输出

返回 `details.json`（解析并经过 schema 验证的 JSON）以及 `details.provider`
和 `details.model`，用于标明实际运行的内容。

## 示例：Lobster 工作流步骤

### 重要限制

下面的示例假设 **独立运行的 Lobster CLI** 正在运行，其中
`openclaw.invoke` 已经具有正确的网关 URL/认证上下文。

对于 OpenClaw 内部捆绑的 **嵌入式** Lobster 运行器，此嵌套 CLI
模式 **目前并不可靠**：

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

## 安全说明

- **仅限 JSON**：模型被指示只返回一个 JSON 值，不要代码
  围栏，不要评论。
- **无工具**：底层运行已禁用工具，因此模型无法在任务中途调用
  外部资源。
- 在使用 `schema` 验证之前，将输出视为不可信。
- 在任何会产生副作用并消耗此输出的步骤（send、post、exec）之前，先进行审批。

## 相关内容

- [思考层级](/tools/thinking)
- [子代理](/tools/subagents)
- [斜杠命令](/tools/slash-commands)
