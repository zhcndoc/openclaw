---
summary: "社区代理将 Claude 订阅凭证公开为 OpenAI- 兼容端点"
read_when:
  - "您想要将 Claude Max 订阅与 OpenAI- 兼容工具一起使用"
  - "您需要一个包装 Claude Code CLI 的本地 API 服务器"
  - "您想要评估基于订阅的访问与基于 API-key 的 Anthropic 访问"
title: "Claude Max API 代理"
---

**claude-max-api-proxy** 是一个社区 npm 包（不是 OpenClaw 插件），它将 Claude Max/Pro 订阅公开为 OpenAI- 兼容的 API 端点，因此您可以指向任何您订阅的 OpenAI- 兼容工具，而不是 Anthropic API 密钥。

<Warning>
仅兼容技术层面，并非官方认可的路径。Anthropic 过去曾阻止在 Claude Code 之外的一些订阅用法；在依赖之前，请先确认 Anthropic 当前的计费规则。

Anthropic 的 Claude Code 文档将 `claude -p` 描述为代理 SDK/programmatic 用法。自 Anthropic 2026 年 6 月 15 日支持更新起，Claude 代理 SDK、`claude -p` 和第三方应用程序使用量将根据登录订阅的使用限制进行计算（之前宣布的单独代理 SDK 信用计划已暂停）。请参阅 Anthropic 的 [Agent SDK 计划文章 ](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)、[Pro/Max](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan) 和 [Team/Enterprise](https://support.claude.com/en/articles/11845131-use-claude-code-with-your-team-or-enterprise-plan) 计划文章以及 [ 人类提供者 ](/providers/anthropic) OpenClaw自己的Claude CLI账单。
</Warning>

## <a id="why-use-this"></a> 为什么使用它

| 方式                  | 成本路径                                      | 最适合                                   |
| ------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Anthropic API 钥匙         | 通过 Claude Console 按 token 付费            | 生产应用、共享自动化、批量使用 |
| Claude 订阅代理 | Claude Code / `claude -p` 计划和额度规则 | 使用兼容工具进行个人实验 |

此代理允许 Claude Max 或 Pro 订阅与 OpenAI- 兼容工具一起使用。它不是无限的统一费率路径 - 它继承了 Claude Code 的使用限制。 API 密钥仍然是生产使用中更清晰的计费路径。

## <a id="how-it-works"></a> 工作原理

```text
Your App -> claude-max-api-proxy -> Claude Code CLI / claude -p -> Anthropic
     (OpenAI format)                (converts format)              (uses your login)
```

代理根据请求生成 Claude Code CLI 作为子进程，将 OpenAI- 格式的聊天请求转换为 CLI 提示，并以 OpenAI 格式流式传输（或返回）响应。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-proxy" title="安装代理">
    需要 Node.js 20+ 以及已通过身份验证的 Claude Code CLI。

    ```bash
    npm install -g claude-max-api-proxy

    # Verify Claude CLI is authenticated
    claude --version
    claude auth login   # if not already authenticated
    ```

  </Step>
  <Step id="start-the-server" title="启动服务器">
    ```bash
    claude-max-api
    # Server runs at http://localhost:3456
    ```
  </Step>
  <Step id="test-the-proxy" title="测试代理">
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
  <Step id="configure-openclaw" title="配置OpenClaw">
    将 OpenClaw 指向代理作为自定义 OpenAI- 兼容端点：

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
下面的模型 ID 是代理自己的目录，而不是 OpenClaw 的 Anthropic 模型参考。每个 id 映射到 Claude Code CLI 模型别名（`opus`、`sonnet`、`haiku`），因此只要 Anthropic 更新 CLI 中的别名，底层模型就会发生变化。在依赖特定映射之前检查代理的当前 README。
</Note>

| 模型 ID          | CLI 别名 |
| ----------------- | --------- |
| `claude-opus-4`   | `opus`    |
| `claude-sonnet-4` | `sonnet`  |
| `claude-haiku-4`  | `haiku`   |

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="proxy-style-openai-compatible-notes" title="代理样式 OpenAI- 兼容注释">
    这使用 OpenClaw 的通用自定义 `/v1` OpenAI- 兼容路由，与任何其他自托管 OpenAI- 兼容后端相同的路径：

    - Native OpenAI-only 请求整形不适用。
    - `/fast` 和 `service_tier` 仅适用于直接发送到 `api.anthropic.com` 的流量；代理路由会保持 `service_tier` 不变（参见 [Anthropic provider 快速模式](/providers/anthropic#advanced-configuration)）。
    - 不包含 Responses 的 `store`、prompt-cache 提示，或 OpenAI reasoning 兼容负载形状调整。
    - OpenClaw 的 OpenAI/Codex 归属头（`originator`、`version`、 `User-Agent`）仅在原生 `api.openai.com` OAuth 流量中发送，不会在像此代理这样的自定义 `OPENAI_BASE_URL` 目标上发送。

  </Accordion>

  <Accordion id="auto-start-on-macos-with-launchagent" title="在 macOS 上自动启动 LaunchAgent">
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

## <a id="notes"></a> 说明

- 继承 Claude Code 的 `claude -p` 计费、用量额度和速率限制行为。
- 仅绑定到 `127.0.0.1`；除 CLI 自身向 Anthropic 发起的调用外，不会向任何第三方服务器发送数据。
- 支持流式响应。
- 身份验证失败不会在启动时检查，只会在实际运行聊天请求后才显现；如果 CLI 未通过身份验证，预期会是第一条请求失败，而不是服务器拒绝启动。

<Note>
有关本机 Anthropic 与 Claude CLI 或 API 密钥的集成，请参阅 [ 人工提供程序](/providers/anthropic)。对于 OpenAI/Codex 订阅，请参阅 [OpenAI 提供商](/providers/openai)。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="Anthropic 提供商" href="/providers/anthropic" icon="bolt">
    本机 OpenClaw 与 Claude CLI 或 API 密钥集成。
  </Card>
  <Card title="OpenAI 提供商" href="/providers/openai" icon="robot">
    适用于 OpenAI/Codex 订阅。
  </Card>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    所有提供程序、模型引用和故障转移行为的概述。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
