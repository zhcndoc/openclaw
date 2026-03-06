---
summary: "使用设备流从 OpenClaw 登录到 GitHub Copilot"
read_when:
  - 您想将 GitHub Copilot 作为模型提供者使用
  - 您需要使用 `openclaw models auth login-github-copilot` 流程
title: "GitHub Copilot"
---

# GitHub Copilot

## 什么是 GitHub Copilot？

GitHub Copilot 是 GitHub 的 AI 编码助手。它为您的 GitHub 账户和计划提供 Copilot 模型访问权限。OpenClaw 可以通过两种不同方式使用 Copilot 作为模型提供者。

## 在 OpenClaw 中使用 Copilot 的两种方式

### 1) 内置的 GitHub Copilot 提供者（`github-copilot`）

使用原生的设备登录流程获取 GitHub 令牌，然后当 OpenClaw 运行时将其交换为 Copilot API 令牌。这是**默认且最简单的方式**，因为它不需要 VS Code。

### 2) Copilot Proxy 插件（`copilot-proxy`）

使用 **Copilot Proxy** VS Code 扩展作为本地桥接。OpenClaw 通过代理的 `/v1` 端点通信，并使用您在该处配置的模型列表。当您已经在 VS Code 中运行 Copilot Proxy 或需要通过它路由时，选择此方式。您必须启用该插件并保持 VS Code 扩展程序运行。

使用 GitHub Copilot 作为模型提供者（`github-copilot`）。登录命令运行 GitHub 设备流，保存认证配置文件，并更新您的配置以使用该配置文件。

## CLI 设置

```bash
openclaw models auth login-github-copilot
```

系统会提示您访问一个 URL 并输入一次性代码。请保持终端开启直到完成。

### 可选参数

```bash
openclaw models auth login-github-copilot --profile-id github-copilot:work
openclaw models auth login-github-copilot --yes
```

## 设置默认模型

```bash
openclaw models set github-copilot/gpt-4o
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } },
}
```

## 注意事项

- 需要交互式 TTY；请直接在终端中运行。
- Copilot 模型的可用性取决于您的计划；如果模型被拒绝，请尝试其他 ID（例如 `github-copilot/gpt-4.1`）。
- 登录时将 GitHub 令牌存储在认证配置文件中，OpenClaw 运行时将其交换为 Copilot API 令牌。
