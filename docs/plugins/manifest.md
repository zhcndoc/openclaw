---
summary: "插件清单 + JSON 模式要求（严格的配置验证）"
read_when:
  - 你正在构建一个 OpenClaw 插件
  - 你需要发布插件配置模式或调试插件验证错误
title: "插件清单"
---

# 插件清单（openclaw.plugin.json）

每个插件**必须**在**插件根目录**中提供一个 `openclaw.plugin.json` 文件。
OpenClaw 使用此清单在**不执行插件代码**的情况下验证配置。
缺失或无效的清单将被视为插件错误，并阻止配置验证。

查看完整插件系统指南：[插件](/tools/plugin)。

## 必填字段

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

必填键：

- `id`（字符串）：插件的规范 ID。
- `configSchema`（对象）：插件配置的 JSON Schema（内联）。

可选键：

- `kind`（字符串）：插件类型（示例：“memory”）。
- `channels`（数组）：该插件注册的频道 ID（示例：`["matrix"]`）。
- `providers`（数组）：该插件注册的提供者 ID。
- `skills`（数组）：要加载的技能目录（相对于插件根目录）。
- `name`（字符串）：插件的显示名称。
- `description`（字符串）：插件简短摘要。
- `uiHints`（对象）：用于 UI 渲染的配置字段标签/占位符/敏感标志。
- `version`（字符串）：插件版本（仅供参考）。

## JSON Schema 要求

- **每个插件必须提供 JSON Schema**，即使它不接受任何配置。
- 空模式是允许的（例如，`{ "type": "object", "additionalProperties": false }`）。
- 模式在配置读取/写入时验证，而非运行时。

## 验证行为

- 除非频道 ID 被插件清单声明，否则未知的 `channels.*` 键是**错误**。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必须引用**可发现**的插件 ID。未知 ID 是**错误**。
- 如果插件已安装但清单或模式损坏或缺失，验证失败，Doctor 会报告插件错误。
- 如果存在插件配置但插件**被禁用**，配置会被保留，并在 Doctor 和日志中显示**警告**。

## 注意事项

- 清单**对所有插件都是必需的**，包括本地文件系统加载的插件。
- 运行时仍会单独加载插件模块；清单仅用于发现和验证。
- 如果你的插件依赖本地模块，请记录构建步骤和任何包管理器的允许列表要求（例如，pnpm 的 `allow-build-scripts` - `pnpm rebuild <package>`）。
