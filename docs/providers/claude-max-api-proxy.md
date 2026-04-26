---
summary: "社区代理，将 Claude 订阅凭证以 OpenAI 兼容端点方式暴露"
read_when:
  - 你想将 Claude Max 订阅与 OpenAI 兼容工具一起使用
  - 你想要一个封装了 Claude Code CLI 的本地 API 服务器
  - 你想评估基于订阅的 Anthropic 访问与基于 API 密钥的 Anthropic 访问
title: "Claude Max API 代理"
---

**claude-max-api-proxy** 是一个社区工具，它将你的 Claude Max/Pro 订阅以 OpenAI 兼容的 API 端点形式暴露出来。这样你就可以在任何支持 OpenAI API 格式的工具中使用你的订阅。

<Warning>
此方案仅提供技术兼容性。Anthropic 过去曾阻止部分订阅在 Claude Code 之外使用。你需要自行判断是否使用，并在依赖该方案前确认 Anthropic 当前的条款。
</Warning>

## 为什么使用这个？

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

## 快速开始

<Steps>
  <Step title="安装代理">
    需要 Node.js 20+ 和 Claude Code CLI。

    ```bash
    npm install -g claude-max-api-proxy

    # 验证 Claude CLI 已认证
    claude --version
    ```

  </Step>
  <Step title="启动服务器">
    ```bash
    claude-max-api
    # 服务器运行于 http://localhost:3456
    ```
  </Step>
  <Step title="测试代理">
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

  </Step>
  <Step title="配置 OpenClaw">
    将 OpenClaw 指向代理作为自定义 OpenAI 兼容端点：

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

  </Step>
</Steps>

## 内置目录

| 模型 ID            | 映射到           |
| ------------------ | ---------------- |
| `claude-opus-4`    | Claude Opus 4    |
| `claude-sonnet-4`  | Claude Sonnet 4  |
| `claude-haiku-4`   | Claude Haiku 4   |

## 高级配置

<AccordionGroup>
  <Accordion title="代理式 OpenAI 兼容说明">
    此路径使用与其他自定义 `/v1` 后端相同的代理式 OpenAI 兼容路由：

    - 原生仅 OpenAI 的请求塑造不适用
    - 无 `service_tier`，无 Responses `store`，无 prompt-cache 提示，且无
      OpenAI reasoning-compat 负载塑造
    - 隐藏的 OpenClaw 归属头（`originator`, `version`, `User-Agent`）
      不会注入到代理 URL 中

  </Accordion>

  <Accordion title="在 macOS 上使用 LaunchAgent 自动启动">
    创建一个 LaunchAgent 以自动运行代理：

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

  </Accordion>
</AccordionGroup>

## 链接

- **npm:** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub:** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **问题反馈:** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## 注意事项

- 这是一个**社区工具**，非 Anthropic 或 OpenClaw 官方支持
- 需要一个活跃的 Claude Max/Pro 订阅，并已通过 Claude Code CLI 认证
- 代理运行于本地，不会将数据传送给任何第三方服务器
- 完全支持流式响应

<Note>
对于与 Claude CLI 或 API 密钥的原生 Anthropic 集成，请参阅 [Anthropic 提供商](/providers/anthropic)。对于 OpenAI/Codex 订阅，请参阅 [OpenAI 提供商](/providers/openai)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="Anthropic 提供商" href="/providers/anthropic" icon="bolt">
    与 Claude CLI 或 API 密钥的原生 OpenClaw 集成。
  </Card>
  <Card title="OpenAI 提供商" href="/providers/openai" icon="robot">
    适用于 OpenAI/Codex 订阅。
  </Card>
  <Card title="Model selection" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为概览。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
