---
summary: "插件清单 + JSON 模式要求（严格的配置验证）"
read_when:
  - 你正在构建一个 OpenClaw 插件
  - 你需要发布插件配置模式或调试插件验证错误
title: "插件清单"
---

# 插件清单（openclaw.plugin.json）

本页仅适用于**原生 OpenClaw 插件清单**。

有关兼容的捆绑布局，请参见 [插件捆绑](/plugins/bundles)。

兼容的捆绑格式使用不同的清单文件：

- Codex 捆绑：`.codex-plugin/plugin.json`
- Claude 捆绑：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件布局
- Cursor 捆绑：`.cursor-plugin/plugin.json`

OpenClaw 也能自动检测这些捆绑布局，但不会针对本文档中描述的 `openclaw.plugin.json` 模式进行验证。

对于兼容捆绑，当布局符合 OpenClaw 运行时预期时，OpenClaw 当前会读取捆绑元数据以及声明的技能根目录、Claude 命令根目录、Claude 捆绑的 `settings.json` 默认值和支持的挂钩包。

每个原生 OpenClaw 插件**必须**在**插件根目录**下包含一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单验证配置，**不执行插件代码**。缺失或无效的清单会被视为插件错误，阻止配置验证。

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

- `kind` (字符串)：插件类型（示例：`"memory"`，`"context-engine"`）。
- `channels` (数组)：该插件注册的频道 ID（示例：`["matrix"]`）。
- `providers` (数组)：该插件注册的提供者 ID。
- `providerAuthEnvVars` (对象)：以提供者 ID 作为键的认证环境变量。当 OpenClaw 需要从环境变量解析提供者凭据而不加载插件运行时使用。
- `providerAuthChoices` (数组)：以提供者+认证方法键控的廉价入门/认证选择元数据。当 OpenClaw 需要显示提供者在认证选择器、首选提供者解析和命令行帮助中而不加载插件运行时时使用。
- `skills` (数组)：要加载的技能目录（相对于插件根目录）。
- `name` (字符串)：插件的显示名称。
- `description` (字符串)：插件简短描述。
- `uiHints` (对象)：用于 UI 渲染的配置字段标签、占位符、敏感标记。
- `version` (字符串)：插件版本（仅供参考）。

### `providerAuthChoices` 结构

每个条目可以声明：

- `provider`：提供者 ID
- `method`：认证方法 ID
- `choiceId`：稳定的入门/认证选择 ID
- `choiceLabel` / `choiceHint`：选择器标签 + 简短提示
- `groupId` / `groupLabel` / `groupHint`：分组入门桶元数据
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription`：可选的一键 CLI 绑定，适用于 API 密钥等简单认证流程

示例：

```json
{
  "providerAuthChoices": [
    {
      "provider": "openrouter",
      "method": "api-key",
      "choiceId": "openrouter-api-key",
      "choiceLabel": "OpenRouter API 密钥",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API 密钥"
    }
  ]
}
```

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

- 清单是**原生 OpenClaw 插件**（包括本地文件系统加载）的**必需品**。
- 运行时仍然单独加载插件模块；清单仅用于发现和验证。
- `providerAuthEnvVars` 是用于认证探测、环境标记验证及类似提供者认证场景的廉价元数据路径，无需启动插件运行时就可检查环境变量名称。
- `providerAuthChoices` 是用于认证选择器、`--auth-choice` 解析、首选提供者映射及简单入门 CLI 标志注册的廉价元数据路径，位于提供者运行时加载之前。
- 独占插件类型通过 `plugins.slots.*` 选择。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine` 选择（默认：内置 `legacy`）。
- 如果你的插件依赖本地模块，请说明构建步骤及任何包管理器白名单需求（例如，pnpm 的 `allow-build-scripts` - `pnpm rebuild <package>`）。
