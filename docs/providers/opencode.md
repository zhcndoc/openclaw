---
summary: "使用 OpenCode Zen（精选模型）搭配 OpenClaw"
read_when:
  - 你想使用 OpenCode Zen 访问模型
  - 你想要一个精选的适合编码的模型列表
title: "OpenCode Zen"
---

# OpenCode Zen

OpenCode Zen 是 OpenCode 团队推荐的**精选模型列表**，适用于编码代理。
这是一条可选的托管模型访问路径，使用 API 密钥和 `opencode` 提供者。
Zen 目前处于测试阶段。

## CLI 设置

```bash
openclaw onboard --auth-choice opencode-zen
# 或非交互式
openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 备注

- 也支持使用 `OPENCODE_ZEN_API_KEY`。
- 你需要登录 Zen，添加计费信息，然后复制你的 API 密钥。
- OpenCode Zen 按请求计费；详细信息请查看 OpenCode 仪表盘。
