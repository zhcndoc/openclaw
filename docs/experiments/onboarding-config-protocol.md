---
summary: "用于设置向导和配置方案的 RPC 协议笔记"
read_when: "更改设置向导步骤或配置方案端点时"
title: "入职和配置协议"
---

# 入职 + 配置协议

目的：在 CLI、macOS 应用和网页界面之间共享入职和配置相关的接口。

## 组件

- 向导引擎（共享会话 + 提示 + 入职状态）。
- CLI 入职使用与 UI 客户端相同的向导流程。
- 网关 RPC 暴露向导和配置方案端点。
- macOS 入职使用向导步骤模型。
- 网页界面根据 JSON Schema + UI 提示渲染配置表单。

## 网关 RPC

- `wizard.start` 参数：`{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` 参数：`{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` 参数：`{ sessionId }`
- `wizard.status` 参数：`{ sessionId }`
- `config.schema` 参数：`{}`
- `config.schema.lookup` 参数：`{ path }`
  - `path` 接受标准配置段加上以斜杠分隔的插件 ID，例如 `plugins.entries.pack/one.config`。

响应（形态）

- 向导：`{ sessionId, done, step?, status?, error? }`
- 配置方案：`{ schema, uiHints, version, generatedAt }`
- 配置方案查找：`{ path, schema, hint?, hintPath?, children[] }`

## UI 提示

- `uiHints` 以路径为键；可选的元数据（标签/帮助/分组/顺序/高级/敏感/占位符）。
- 敏感字段渲染为密码输入框；无编辑时遮挡层。
- 不支持的方案节点回退到原始 JSON 编辑器。

## 备注

- 本文档是跟踪入职/配置协议重构的唯一来源。
