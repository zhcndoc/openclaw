---
summary: "社区代理，将 Claude 订阅凭证以 OpenAI 兼容端点方式暴露"
read_when:
  - 你想用 Claude Max 订阅套餐通过 OpenAI 兼容工具
  - 你想要一个包装 Claude Code CLI 的本地 API 服务器
  - 你想评估基于订阅和基于 API 密钥的 Anthropic 访问方式
title: "Claude Max API 代理"
---

# Claude Max API 代理

**claude-max-api-proxy** 是一个社区工具，将你的 Claude Max/Pro 订阅以 OpenAI 兼容的 API 端点形式暴露出来。这样，你可以用任何支持 OpenAI API 格式的工具来使用你的订阅。

<Warning>
此方案仅提供技术兼容性。Anthropic 过去曾阻止部分订阅在 Claude Code 之外使用。你需要自行判断是否使用，并在依赖该方案前确认 Anthropic 当前的条款。
</Warning>

## 为什么使用它？

| 方案                 | 费用                                               | 适用场景                                    |
| -------------------- | ------------------------------------------------- | ------------------------------------------- |
| Anthropic API        | 按 token 计费（Opus 约 15 美元/百万输入，75 美元/百万输出） | 生产环境应用，高流量                         |
| Claude Max 订阅套餐  | 每月 200 美元固定费用                              | 个人使用，开发，无限制使用                   |

如果你有 Claude Max 订阅并想通过 OpenAI 兼容工具使用，本代理可以在某些工作流中降低成本。生产环境仍推荐使用 API 密钥，以符合更清晰的政策要求。

## 工作原理

```
你的应用 → claude-max-api-proxy → Claude Code CLI → Anthropic（通过订阅登陆）
     （OpenAI 格式）           （格式转换）                 （使用你的登陆）
```

代理：

1. 在 `http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式请求
2. 转换为 Claude Code CLI 命令
3. 以 OpenAI 格式返回响应（支持流式）

## 安装

```bash
# 需要 Node.js 20+ 和 Claude Code CLI
npm install -g claude-max-api-proxy

# 确认 Claude CLI 已认证
claude --version
```

## 使用

### 启动服务器

```bash
claude-max-api
# 服务器运行在 http://localhost:3456
```

### 测试

```bash
# 健康检查
curl http://localhost:3456/health

# 列出模型
curl http://localhost:3456/v1/models

# 聊天补全
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 配合 OpenClaw 使用

你可以将 OpenClaw 指向此代理作为自定义 OpenAI 兼容端点：

```json5
{
  env: {
    OPENAI_API_KEY: "not-needed",
    OPENAI_BASE_URL: "http://localhost:3456/v1",
  },
  agents: {
    defaults: {
      model: { primary: "openai/claude-opus-4" },
    },
  },
}
```

## 可用模型

| 模型 ID            | 映射到           |
| ------------------ | ---------------- |
| `claude-opus-4`    | Claude Opus 4    |
| `claude-sonnet-4`  | Claude Sonnet 4  |
| `claude-haiku-4`   | Claude Haiku 4   |

## macOS 下自动启动

创建一个 LaunchAgent 让代理自动运行：

```bash
cat > ~/Library/LaunchAgents/com.claude-max-api.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-max-api</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist
```

## 链接

- **npm:** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub:** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **问题反馈:** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## 注意事项

- 这是一个**社区工具**，非 Anthropic 或 OpenClaw 官方支持
- 需要一个活跃的 Claude Max/Pro 订阅，并已通过 Claude Code CLI 认证
- 代理运行于本地，不会将数据传送给任何第三方服务器
- 完全支持流式响应

## 参见

- [Anthropic provider](/providers/anthropic) - OpenClaw 原生集成支持 Claude setup-token 或 API 密钥
- [OpenAI provider](/providers/openai) - 面向 OpenAI/Codex 订阅
