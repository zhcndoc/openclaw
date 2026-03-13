---
summary: "使用共享的 OpenCode 设置中的 OpenCode Go 目录"
read_when:
  - 您想要使用 OpenCode Go 目录
  - 您需要用于 Go 托管模型的运行时模型引用
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go 是 [OpenCode](/providers/opencode) 中的 Go 目录。
它使用与 Zen 目录相同的 `OPENCODE_API_KEY`，但保留了运行时
提供者 ID `opencode-go`，以确保上游针对每个模型的路由保持正确。

## 支持的模型

- `opencode-go/kimi-k2.5`
- `opencode-go/glm-5`
- `opencode-go/minimax-m2.5`

## CLI 设置

```bash
openclaw onboard --auth-choice opencode-go
# 或者非交互方式
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## 配置示例

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## 路由行为

当模型引用使用 `opencode-go/...` 时，OpenClaw 会自动处理针对每个模型的路由。

## 注意事项

- 使用 [OpenCode](/providers/opencode) 进行共享的登录和目录概览。
- 运行时引用保持明确：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`。
