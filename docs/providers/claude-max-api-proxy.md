---
summary: "用于将 Claude 订阅凭证暴露为 OpenAI 兼容端点的社区代理"
read_when:
  - 你想将 Claude Max 订阅与 OpenAI 兼容工具一起使用
  - 你想要一个封装 Claude Code CLI 的本地 API 服务器
  - 你想评估基于订阅与基于 API 密钥的 Anthropic 访问方式
title: "Claude Max API 代理"
---

**claude-max-api-proxy** 是一个社区工具，它将你的 Claude Max/Pro 订阅暴露为一个 OpenAI 兼容的 API 端点。这样你就可以在任何支持 OpenAI API 格式的工具中使用你的订阅。

<Warning>
此路径仅用于技术兼容。Anthropic 过去曾阻止 Claude Code 之外的一些订阅用法。你必须自行决定是否使用它，并在依赖之前核实 Anthropic 当前的计费规则。

Anthropic 当前的支持文档将 `claude -p` 视为 Agent SDK/编程式用法。自 2026 年 6 月 15 日起，订阅计划下的 `claude -p` 用量会先从单独的每月 Agent SDK 额度中扣除；如果启用了用量额度，则再按标准 API 费率从用量额度中扣除。
</Warning>

## 为什么要使用这个？

| Approach                  | Cost route                                      | Best for                                   |
| ------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Anthropic API             | 通过 Claude Console 或云服务按 token 付费       | 生产应用、共享自动化、批量使用             |
| Claude subscription proxy | Claude Code / `claude -p` 计划与额度规则        | 与兼容工具一起进行个人实验                 |

如果你有 Claude Max 或 Pro 订阅，并希望将它用于 OpenAI 兼容工具，这个代理可能适合某些个人工作流。它不是无限固定费率的路径。对于生产用途，API 密钥仍然是更清晰的政策与计费路径。

## 工作原理

```
Your App → claude-max-api-proxy → Claude Code CLI / claude -p → Anthropic
     (OpenAI format)              (converts format)          (uses your login)
```

该代理：

1. 接收位于 `http://localhost:3456/v1/chat/completions` 的 OpenAI 格式请求
2. 将它们转换为 Claude Code CLI 命令
3. 以 OpenAI 格式返回响应（支持流式输出）

## 开始使用

<Steps>
  <Step title="安装代理">
    需要 Node.js 22+ 和 Claude Code CLI。

    ```bash
    npm install -g claude-max-api-proxy

    # 验证 Claude CLI 已通过身份验证
    claude --version
    ```

  </Step>
  <Step title="启动服务器">
    ```bash
    claude-max-api
    # 服务器运行在 http://localhost:3456
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
    将 OpenClaw 指向该代理，作为自定义的 OpenAI 兼容端点：

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

| 模型 ID           | 映射到           |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## 高级配置

<AccordionGroup>
  <Accordion title="代理风格的 OpenAI 兼容说明">
    这条路径使用与其他自定义
    `/v1` 后端相同的代理风格 OpenAI 兼容路由：

    - 不适用原生仅 OpenAI 的请求形状处理
    - 没有 `service_tier`、没有 Responses `store`、没有 prompt-cache 提示，也没有
      OpenAI 推理兼容负载形状处理
    - 隐藏的 OpenClaw 归属标头（`originator`、`version`、`User-Agent`）
      不会在代理 URL 上注入

  </Accordion>

  <Accordion title="在 macOS 上使用 LaunchAgent 自动启动">
    创建一个 LaunchAgent 来自动运行该代理：

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

## 说明

- 这是一个 **社区工具**，并非 Anthropic 或 OpenClaw 官方支持
- 需要已通过 Claude Code CLI 身份验证的有效 Claude Max/Pro 订阅
- 继承 Claude Code `claude -p` 的计费、用量额度和速率限制行为
- 该代理在本地运行，不会将数据发送到任何第三方服务器
- 完全支持流式响应

<Note>
如需通过 Claude CLI 或 API 密钥进行原生 Anthropic 集成，请参阅 [Anthropic 提供方](/providers/anthropic)。如需 OpenAI/Codex 订阅，请参阅 [OpenAI 提供方](/providers/openai)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="Anthropic 提供方" href="/providers/anthropic" icon="bolt">
    使用 Claude CLI 或 API 密钥的原生 OpenClaw 集成。
  </Card>
  <Card title="OpenAI 提供方" href="/providers/openai" icon="robot">
    适用于 OpenAI/Codex 订阅。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供方、模型引用和故障转移行为概览。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
