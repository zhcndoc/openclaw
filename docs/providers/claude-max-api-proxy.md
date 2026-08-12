---
summary: "用于将 Claude 订阅凭证暴露为 OpenAI 兼容端点的社区代理"
read_when:
  - 你想将 Claude Max 订阅与 OpenAI 兼容工具一起使用
  - 你想要一个封装 Claude Code CLI 的本地 API 服务器
  - 你想评估基于订阅与基于 API 密钥的 Anthropic 访问方式
title: "Claude Max API 代理"
---

**claude-max-api-proxy** 是一个社区 npm 包（不是 OpenClaw 插件），它将 Claude Max/Pro 订阅暴露为一个与 OpenAI 兼容的 API 端点，因此你可以将任何兼容 OpenAI 的工具指向你的订阅，而不是 Anthropic API 密钥。

<Warning>
仅兼容技术层面，并非官方认可的路径。Anthropic 过去曾阻止在 Claude Code 之外的一些订阅用法；在依赖之前，请先确认 Anthropic 当前的计费规则。

Anthropic 的 Claude Code 文档将 `claude -p` 描述为 Agent SDK/程序化使用。根据 Anthropic 2026 年 6 月 15 日的支持更新，Claude Agent SDK、`claude -p` 以及第三方应用使用都会消耗已登录订阅的使用额度（此前宣布的独立 Agent SDK 额度计划已暂停）。另请参阅 Anthropic 的 [Agent SDK 计划文章](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)、[Pro/Max](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan) 和 [Team/Enterprise](https://support.claude.com/en/articles/11845131-use-claude-code-with-your-team-or-enterprise-plan) 计划文章，以及 [Anthropic provider](/providers/anthropic) 中 OpenClaw 自己关于 Claude CLI 计费的说明。
</Warning>

## 为什么使用它

| 方式                      | 成本路径                                         | 最适合                                     |
| ------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Anthropic API key         | 通过 Claude Console 按 token 付费                 | 生产应用、共享自动化、批量使用               |
| Claude 订阅代理           | Claude Code / `claude -p` 计划和额度规则          | 使用兼容工具进行个人实验                    |

这个代理让 Claude Max 或 Pro 订阅可以与兼容 OpenAI 的工具一起使用。它不是无限量的固定费率路径——它继承了 Claude Code 的使用限制。对于生产用途，API key 仍然是更清晰的计费方式。

## 工作原理

```text
你的应用 -> claude-max-api-proxy -> Claude Code CLI / claude -p -> Anthropic
     （OpenAI 格式）                （转换格式）              （使用你的登录）
```

该代理为每个请求启动一个 Claude Code CLI 子进程，将 OpenAI 格式的聊天请求转换为 CLI 提示词，并以 OpenAI 格式流式返回（或直接返回）响应。

## 开始使用

<Steps>
  <Step title="安装代理">
    需要 Node.js 20+ 以及已通过身份验证的 Claude Code CLI。

    ```bash
    npm install -g claude-max-api-proxy

    # 验证 Claude CLI 已通过身份验证
    claude --version
    claude auth login   # if not already authenticated
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
    curl http://localhost:3456/health
    curl http://localhost:3456/v1/models

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
        vars: {
          OPENAI_API_KEY: "not-needed",
          OPENAI_BASE_URL: "http://localhost:3456/v1",
        },
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

<Note>
下面的模型 ID 是该代理自己的目录，而不是 OpenClaw 的 Anthropic
模型引用。每个 ID 都映射到 Claude Code CLI 的模型别名（`opus`、`sonnet`、
`haiku`），因此当 Anthropic 在 CLI 中更新该别名时，底层模型也会随之变化。
在依赖某个特定映射之前，请先查看该代理当前的 README。
</Note>

| 模型 ID          | CLI 别名 | 当前映射        |
| ---------------- | -------- | --------------- |
| `claude-opus-4`   | `opus`    | Claude Opus 4.5 |
| `claude-sonnet-4` | `sonnet`  | Claude Sonnet 4 |
| `claude-haiku-4`  | `haiku`   | Claude Haiku 4  |

## 高级配置

<AccordionGroup>
  <Accordion title="代理式 OpenAI 兼容说明">
    这使用的是 OpenClaw 的通用自定义 `/v1` OpenAI 兼容路由，与任何其他自托管的 OpenAI 兼容后端使用的是相同路径：

    - 原生 OpenAI 专属的请求形状调整不适用。
    - `/fast` 和 `service_tier` 仅适用于直接发送到 `api.anthropic.com`
      的流量；代理路由会保持 `service_tier` 不变（参见
      [Anthropic provider 快速模式](/providers/anthropic#advanced-configuration)）。
    - 不包含 Responses 的 `store`、prompt-cache 提示，或 OpenAI reasoning 兼容负载形状调整。
    - OpenClaw 的 OpenAI/Codex 归属头（`originator`、`version`、
      `User-Agent`）仅在原生 `api.openai.com` OAuth 流量中发送，不会在像此代理这样的自定义 `OPENAI_BASE_URL` 目标上发送。

  </Accordion>

  <Accordion title="在 macOS 上使用 LaunchAgent 自动启动">
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

- 继承 Claude Code 的 `claude -p` 计费、用量额度和速率限制行为。
- 仅绑定到 `127.0.0.1`；除 CLI 自身向 Anthropic 发起的调用外，不会向任何第三方服务器发送数据。
- 支持流式响应。
- 身份验证失败不会在启动时检查，只会在实际运行聊天请求后才显现；如果 CLI 未通过身份验证，预期会是第一条请求失败，而不是服务器拒绝启动。

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
