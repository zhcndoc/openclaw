---
summary: "OpenClaw 入职选项和流程概述"
read_when:
  - 选择入职路径时
  - 设置新环境时
title: "入职概述"
sidebarTitle: "入职概述"
---

# 入职概述

OpenClaw 支持多种入职路径，具体取决于 Gateway 的运行位置以及你希望如何配置提供者。

## 选择你的入职路径

- **适用于 macOS、Linux 和 Windows（通过 WSL2）的 CLI 入职**
- **适用于 Apple silicon 或 Intel Mac 的 macOS 应用引导式首次运行**

## CLI 入职

在终端运行入职流程：

```bash
openclaw onboard
```

当你想完全控制 Gateway、工作区、频道和技能时，使用 CLI 入职。文档：

- [入职（CLI）](/start/wizard)
- [`openclaw onboard` 命令](/cli/onboard)

## macOS 应用入职

想要在 macOS 上获得全程引导设置时，使用 OpenClaw 应用。文档：

- [入职（macOS 应用）](/start/onboarding)

## 自定义提供者

如果你需要的端点不在列表中，包括暴露标准 OpenAI 或 Anthropic API 的托管提供者，请在 CLI 入职时选择 **自定义提供者**。系统会要求你：

- 选择 OpenAI 兼容、Anthropic 兼容，或 **未知**（自动检测）。
- 输入基础 URL 和 API 密钥（如果提供者需要）。
- 提供模型 ID 和可选别名。
- 选择一个端点 ID，以便多个自定义端点可以共存。

详细步骤请参阅上述 CLI 入职文档。
