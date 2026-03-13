---
summary: "使用 OpenCode Zen 和 Go 目录搭配 OpenClaw"
read_when:
  - 你想使用 OpenCode 托管的模型访问
  - 你想在 Zen 和 Go 目录中进行选择
title: "OpenCode"
---

# OpenCode

OpenCode 在 OpenClaw 中提供了两个托管目录：

- `opencode/...` 对应 **Zen** 目录
- `opencode-go/...` 对应 **Go** 目录

两个目录都使用相同的 OpenCode API 密钥。OpenClaw 保持运行时提供者 ID 的分离，以确保上游的逐模型路由保持正确，但入门和文档将它们视为一个 OpenCode 设置。

## CLI 设置

### Zen catalog

```bash
openclaw onboard --auth-choice opencode-zen
openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

### Go 目录

```bash
openclaw onboard --auth-choice opencode-go
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 目录

### Zen

- 运行时提供者：`opencode`
- 示例模型：`opencode/claude-opus-4-6`、`opencode/gpt-5.2`、`opencode/gemini-3-pro`
- 适合想要使用 OpenCode 精选多模型代理的用户

### Go

- 运行时提供者：`opencode-go`
- 示例模型：`opencode-go/kimi-k2.5`、`opencode-go/glm-5`、`opencode-go/minimax-m2.5`
- 适合想要使用 OpenCode 托管的 Kimi/GLM/MiniMax 系列模型的用户

## 备注

- 也支持使用 `OPENCODE_ZEN_API_KEY`。
- 在入门过程中输入一个 OpenCode 密钥后，会存储两个运行时提供者的凭据。
- 你需要登录 OpenCode，添加计费信息，然后复制你的 API 密钥。
- 计费和目录可用性都由 OpenCode 仪表盘管理。
