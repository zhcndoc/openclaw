---
summary: "OpenClaw 中 Codex、Claude 和 Cursor 包的统一包格式指南"
read_when:
  - 你想安装或调试一个兼容 Codex、Claude 或 Cursor 的包
  - 你需要了解 OpenClaw 如何将包内容映射为原生功能
  - 你在文档中说明包的兼容性或当前支持限制
title: "插件包"
---

# 插件包

OpenClaw 支持一种共享的外部插件包类别：**包插件（bundle plugins）**。

目前，这指的是三个紧密相关的生态系统：

- Codex 包
- Claude 包
- Cursor 包

OpenClaw 在 `openclaw plugins list` 中将它们全部显示为 `Format: bundle`。
详细输出和 `openclaw plugins info <id>` 也显示子类型（`codex`、`claude` 或 `cursor`）。

相关内容：

- 插件系统概述：[Plugins](/tools/plugin)
- CLI 安装/列表流程：[plugins](/cli/plugins)
- 原生 manifest 规范：[Plugin manifest](/plugins/manifest)

## 什么是包

包是一个**内容/元数据包**，不是原生的 OpenClaw 进程内插件。

目前，OpenClaw **不会**在进程内执行包的运行时代码。
它会检测已知的包文件，读取元数据，并将支持的包内容映射为原生 OpenClaw 表面，比如技能（skills）、钩子包（hook packs）、MCP 配置和内置 Pi 设置。

这就是主要的信任边界：

- 原生 OpenClaw 插件：运行时模块在进程内执行
- 包：元数据/内容包，选择性特性映射

## 共享的包模型

Codex、Claude 和 Cursor 包足够相似，OpenClaw 将它们视为一个统一标准模型。

共同思想：

- 一个小型 manifest 文件，或默认目录布局
- 一个或多个内容根，比如 `skills/` 或 `commands/`
- 可选的工具/运行时元数据，如 MCP、hooks、agents 或 LSP
- 以目录或压缩包形式安装，然后在正常插件列表中启用

OpenClaw 的常见行为：

- 检测包的子类型
- 规范化为一个内部包记录
- 将支持的部分映射为原生 OpenClaw 功能
- 报告作为检测到但未连接的能力的未支持部分

实际使用中，大多数用户无需优先考虑厂商特定格式。
更有用的问题是：OpenClaw 目前映射了哪些包表面？

## 检测顺序

OpenClaw 优先原生 OpenClaw 插件/包布局，再处理包。

实际效果：

- `openclaw.plugin.json` 优先于包检测
- 包安装时若有有效的 `package.json` + `openclaw.extensions`，采用原生安装路径
- 若目录含原生和包元数据，OpenClaw 首先视为原生插件

避免了将双格式包部分安装为包，后续又以原生插件加载。

## 当前工作情况

OpenClaw 规范化包元数据为内部包记录，然后将支持的表面映射为现有原生行为。

### 当前支持

#### 技能内容

- 包技能根目录视为正常的 OpenClaw 技能根
- Claude `commands` 根目录视作额外技能根
- Cursor `.cursor/commands` 根目录视作额外技能根

这意味着 Claude 的 Markdown 命令文件通过正常 OpenClaw 技能加载器工作。
Cursor 的命令 Markdown 也通过相同路径处理。

#### 钩子包

- 包的钩子根目录**仅**在使用正常 OpenClaw 钩子包布局时工作。当前主要是 Codex 兼容场景：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### 用于 CLI 后端的 MCP

- 启用的包可贡献 MCP 服务器配置
- 当前运行时布线由 `claude-cli` 后端使用
- OpenClaw 将包的 MCP 配置合并至后端的 `--mcp-config` 文件

#### 内置 Pi 设置

- Claude 的 `settings.json` 在启用包时导入为默认内置 Pi 设置
- OpenClaw 在应用前会清理 shell 覆盖键值

被清理的键：

- `shellPath`
- `shellCommandPrefix`

### 检测到但未执行

这些表面被检测到，在包能力中显示，也可能出现在诊断/信息输出，但 OpenClaw 目前不执行：

- Claude 的 `agents`
- Claude 的 `hooks.json` 自动化
- Claude 的 `lspServers`
- Claude 的 `outputStyles`
- Cursor 的 `.cursor/agents`
- Cursor 的 `.cursor/hooks.json`
- Cursor 的 `.cursor/rules`
- Cursor `mcpServers` 位于当前映射的运行时路径之外
- Codex 内联/应用元数据（仅限于能力报告）

## 能力报告

`openclaw plugins info <id>` 显示规范化包记录中的包能力。

支持的能力默默加载。
不支持的能力会产生类似以下的警告：

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

当前例外：

- Claude 的 `commands` 被视为支持，因为它映射为技能
- Claude 的 `settings` 被视为支持，因为它映射为内置 Pi 设置
- Cursor 的 `commands` 被视为支持，因为它映射为技能
- 包的 MCP 被视为支持，只要 OpenClaw 实际导入了它
- Codex 的 `hooks` 仅在 OpenClaw 钩子包布局中视为支持

## 格式差异

格式相近，但不是字节完全相同。
这些是 OpenClaw 中实际有意义的差异。

### Codex

典型标识：

- `.codex-plugin/plugin.json`
- 可选 `skills/`
- 可选 `hooks/`
- 可选 `.mcp.json`
- 可选 `.app.json`

Codex 包在使用技能根和 OpenClaw 风格钩子包目录时与 OpenClaw 最匹配。

### Claude

OpenClaw 支持两种：

- 基于 manifest 的 Claude 包：`.claude-plugin/plugin.json`
- 无 manifest 的 Claude 包，使用默认 Claude 布局

OpenClaw 识别的默认 Claude 布局标识：

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Claude 特定说明：

- `commands/` 视为技能内容
- `settings.json` 导入为内置 Pi 设置
- `hooks/hooks.json` 被检测到，但不作为 Claude 自动化执行

### Cursor

典型标识：

- `.cursor-plugin/plugin.json`
- 可选 `skills/`
- 可选 `.cursor/commands/`
- 可选 `.cursor/agents/`
- 可选 `.cursor/rules/`
- 可选 `.cursor/hooks.json`
- 可选 `.mcp.json`

Cursor 特定说明：

- `.cursor/commands/` 视为技能内容
- `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 目前仅检测

## Claude 自定义路径

Claude 包的 manifest 可以声明自定义组件路径。OpenClaw 视这些路径为**附加的**，不会替换默认路径。

当前支持的自定义路径键：

- `skills`
- `commands`
- `agents`
- `hooks`
- `mcpServers`
- `lspServers`
- `outputStyles`

示例：

- 默认 `commands/` 加上 manifest `commands: "extra-commands"` =>
  OpenClaw 会扫描两个目录
- 默认 `skills/` 加上 manifest `skills: ["team-skills"]` =>
  OpenClaw 会扫描两个目录

## 安全模型

包的支持刻意比原生插件支持更严格。

当前行为：

- 通过边界检查读取插件根目录内文件进行包发现
- 技能和钩子包路径必须位于插件根目录内
- 读取包设置文件时做相同边界检查
- OpenClaw 不在进程内执行任意包运行时代码

这使得包支持默认比原生插件模块更安全，但你仍应将第三方包视为对其公开功能的可信内容。

## 安装示例

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
openclaw plugins info my-bundle
```

如果目录是原生 OpenClaw 插件/包，原生安装路径仍优先。

对于 Claude 市场名称，OpenClaw 会读取本地 Claude 知名市场注册表 `~/.claude/plugins/known_marketplaces.json`。
市场条目可以解析为兼容包的目录/压缩包，或原生插件源；解析后，仍遵循正常安装规则。

## 故障排查

### 发现包但能力不运行

检查 `openclaw plugins info <id>`。

如果能力列出但 OpenClaw 说尚未连接，这是真实的产品限制，而非安装失败。

### Claude 命令文件不出现

确保启用了该包，且 Markdown 文件在检测到的 `commands` 根目录或 `skills` 根目录内。

### Claude 设置不生效

当前支持仅限于从 `settings.json` 导入的内置 Pi 设置。
OpenClaw 不将包设置视为原生 OpenClaw 配置补丁。

### Claude 钩子不执行

`hooks/hooks.json` 目前仅检测，不执行。

若需可运行的包钩子，推荐使用 Codex 钩子根的正常 OpenClaw 钩子包布局，或发布原生 OpenClaw 插件。
